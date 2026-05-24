/**
 * @file Tests for the status/pat-info cloud function.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import patInfo, { ADMIN_SECRET_HEADER } from "../api/status/pat-info.js";

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const ADMIN_SECRET = "status-admin-secret";

const mock = new MockAdapter(axios);
const originalEnv = process.env;

const successData = {
  data: {
    rateLimit: {
      remaining: 4986,
    },
  },
};

const createDeferredResponse = () => {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

const waitForAsyncWork = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

const faker = (
  query = {},
  headers = { [ADMIN_SECRET_HEADER]: ADMIN_SECRET },
) => {
  const req = {
    query: { ...query },
    headers,
  };
  const res = {
    setHeader: jest.fn(),
    send: jest.fn(),
    json: jest.fn(),
  };

  return { req, res };
};

const rateLimitError = {
  errors: [
    {
      type: "RATE_LIMITED",
      message: "API rate limit exceeded for user ID.",
    },
  ],
  data: {
    rateLimit: {
      resetAt: Date.now(),
    },
  },
};

const otherError = {
  errors: [
    {
      type: "SOME_ERROR",
      message: "This is a error",
    },
  ],
};

const badCredentialsError = {
  message: "Bad credentials",
};

const suspendedError = {
  message: "Sorry. Your account was suspended.",
};

beforeEach(() => {
  process.env = {
    STATUS_ADMIN_SECRET: ADMIN_SECRET,
    PAT_1: "testPAT1",
    PAT_2: "testPAT2",
    PAT_3: "testPAT3",
    PAT_4: "testPAT4",
  };
});

afterEach(() => {
  mock.reset();
  process.env = originalEnv;
});

describe("Test /api/status/pat-info", () => {
  it("should reject unauthenticated requests without disclosing PAT details", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(200, successData);

    const { req, res } = faker({}, {});
    await patInfo(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.setHeader.mock.calls).toEqual([
      ["Content-Type", "application/json"],
      ["Cache-Control", "no-store"],
    ]);
    expect(res.send).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(JSON.stringify(res.send.mock.calls[0][0])).not.toMatch(
      /PAT_1|PAT_2|remaining|resetIn|validPATs|errorPATs/,
    );
    expect(mock.history.post).toHaveLength(0);
  });

  it("should return only 'validPATs' if all PATs are valid for an admin request", async () => {
    mock
      .onPost(GRAPHQL_ENDPOINT)
      .replyOnce(200, rateLimitError)
      .onPost(GRAPHQL_ENDPOINT)
      .reply(200, successData);

    const { req, res } = faker();
    await patInfo(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json",
    );
    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify(
        {
          validPATs: ["PAT_2", "PAT_3", "PAT_4"],
          expiredPATs: [],
          exhaustedPATs: ["PAT_1"],
          suspendedPATs: [],
          errorPATs: [],
          details: {
            PAT_1: {
              status: "exhausted",
              remaining: 0,
              resetIn: "0 minutes",
            },
            PAT_2: {
              status: "valid",
              remaining: 4986,
            },
            PAT_3: {
              status: "valid",
              remaining: 4986,
            },
            PAT_4: {
              status: "valid",
              remaining: 4986,
            },
          },
        },
        null,
        2,
      ),
    );
  });

  it("should check PATs concurrently with a small limit and keep output ordered", async () => {
    const deferredResponses = {};

    mock.onPost(GRAPHQL_ENDPOINT).reply((config) => {
      const authorization =
        config.headers.Authorization || config.headers.get?.("Authorization");
      const token = authorization.replace("bearer ", "");
      const pat = Object.keys(process.env).find(
        (key) => process.env[key] === token,
      );

      if (!pat) {
        throw new Error(`Unexpected token: ${token}`);
      }

      deferredResponses[pat] = createDeferredResponse();
      return deferredResponses[pat].promise;
    });

    const { req, res } = faker();
    const responsePromise = patInfo(req, res);

    await waitForAsyncWork();

    expect(mock.history.post).toHaveLength(3);
    expect(Object.keys(deferredResponses)).toEqual(["PAT_1", "PAT_2", "PAT_3"]);

    deferredResponses.PAT_3.resolve([200, successData]);
    await waitForAsyncWork();

    expect(mock.history.post).toHaveLength(4);
    expect(Object.keys(deferredResponses)).toEqual([
      "PAT_1",
      "PAT_2",
      "PAT_3",
      "PAT_4",
    ]);

    deferredResponses.PAT_4.resolve([200, successData]);
    deferredResponses.PAT_2.resolve([200, successData]);
    deferredResponses.PAT_1.resolve([200, successData]);

    await responsePromise;

    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify(
        {
          validPATs: ["PAT_1", "PAT_2", "PAT_3", "PAT_4"],
          expiredPATs: [],
          exhaustedPATs: [],
          suspendedPATs: [],
          errorPATs: [],
          details: {
            PAT_1: {
              status: "valid",
              remaining: 4986,
            },
            PAT_2: {
              status: "valid",
              remaining: 4986,
            },
            PAT_3: {
              status: "valid",
              remaining: 4986,
            },
            PAT_4: {
              status: "valid",
              remaining: 4986,
            },
          },
        },
        null,
        2,
      ),
    );
  });

  it("should return `errorPATs` if a PAT causes an error to be thrown for an admin request", async () => {
    mock
      .onPost(GRAPHQL_ENDPOINT)
      .replyOnce(200, otherError)
      .onPost(GRAPHQL_ENDPOINT)
      .reply(200, successData);

    const { req, res } = faker();
    await patInfo(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json",
    );
    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify(
        {
          validPATs: ["PAT_2", "PAT_3", "PAT_4"],
          expiredPATs: [],
          exhaustedPATs: [],
          suspendedPATs: [],
          errorPATs: ["PAT_1"],
          details: {
            PAT_1: {
              status: "error",
              error: {
                type: "SOME_ERROR",
                message: "This is a error",
              },
            },
            PAT_2: {
              status: "valid",
              remaining: 4986,
            },
            PAT_3: {
              status: "valid",
              remaining: 4986,
            },
            PAT_4: {
              status: "valid",
              remaining: 4986,
            },
          },
        },
        null,
        2,
      ),
    );
  });

  it("should return `expiredPATs` if a PAT returns a 'Bad credentials' error for an admin request", async () => {
    mock
      .onPost(GRAPHQL_ENDPOINT)
      .replyOnce(404, badCredentialsError)
      .onPost(GRAPHQL_ENDPOINT)
      .reply(200, successData);

    const { req, res } = faker();
    await patInfo(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json",
    );
    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify(
        {
          validPATs: ["PAT_2", "PAT_3", "PAT_4"],
          expiredPATs: ["PAT_1"],
          exhaustedPATs: [],
          suspendedPATs: [],
          errorPATs: [],
          details: {
            PAT_1: {
              status: "expired",
            },
            PAT_2: {
              status: "valid",
              remaining: 4986,
            },
            PAT_3: {
              status: "valid",
              remaining: 4986,
            },
            PAT_4: {
              status: "valid",
              remaining: 4986,
            },
          },
        },
        null,
        2,
      ),
    );
  });

  it("should return `suspendedPATs` if a PAT returns an account suspended error for an admin request", async () => {
    mock
      .onPost(GRAPHQL_ENDPOINT)
      .replyOnce(403, suspendedError)
      .onPost(GRAPHQL_ENDPOINT)
      .reply(200, successData);

    const { req, res } = faker();
    await patInfo(req, res);

    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify(
        {
          validPATs: ["PAT_2", "PAT_3", "PAT_4"],
          expiredPATs: [],
          exhaustedPATs: [],
          suspendedPATs: ["PAT_1"],
          errorPATs: [],
          details: {
            PAT_1: {
              status: "suspended",
            },
            PAT_2: {
              status: "valid",
              remaining: 4986,
            },
            PAT_3: {
              status: "valid",
              remaining: 4986,
            },
            PAT_4: {
              status: "valid",
              remaining: 4986,
            },
          },
        },
        null,
        2,
      ),
    );
  });

  it("should throw an error if something goes wrong for an admin request", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).networkError();

    const { req, res } = faker();
    await patInfo(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json",
    );
    expect(res.json).toHaveBeenCalledWith({
      error: "Something went wrong: Network Error",
    });
  });

  it("should not cache PAT health details for an admin request", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(200, successData);

    const { req, res } = faker();
    await patInfo(req, res);

    expect(res.setHeader.mock.calls).toEqual([
      ["Content-Type", "application/json"],
      ["Cache-Control", "no-store"],
    ]);
  });

  it("should have proper cache when error is thrown for an admin request", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).networkError();

    const { req, res } = faker();
    await patInfo(req, res);

    expect(res.setHeader.mock.calls).toEqual([
      ["Content-Type", "application/json"],
      ["Cache-Control", "no-store"],
    ]);
  });
});
