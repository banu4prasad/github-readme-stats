/**
 * @file Regression tests for public status endpoint PAT protections.
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
import up from "../api/status/up.js";

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

const mock = new MockAdapter(axios);
const originalEnv = process.env;

const withoutRealPATs = () => {
  return Object.fromEntries(
    Object.entries(originalEnv).filter(([key]) => !/^PAT_\d+$/.test(key)),
  );
};

const createReqRes = (query = {}, headers = {}) => {
  return {
    req: {
      query,
      headers,
    },
    res: {
      setHeader: jest.fn(),
      send: jest.fn(),
      json: jest.fn(),
    },
  };
};

beforeEach(() => {
  process.env = {
    ...withoutRealPATs(),
    STATUS_ADMIN_SECRET: "fake-status-admin-secret",
    PAT_1: "fake-status-token-1",
    PAT_2: "fake-status-token-2",
  };
});

afterEach(() => {
  mock.reset();
  process.env = originalEnv;
});

describe("public status endpoint PAT protections", () => {
  it("returns generic /api/status/up?type=json status without PAT-backed GitHub requests", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(500);

    const { req, res } = createReqRes({ type: "json" });
    await up(req, res);

    expect(req.headers).toEqual({});
    expect(res.send).toHaveBeenCalledWith({ up: true });
    expect(mock.history.post).toHaveLength(0);
  });

  it("returns generic /api/status/up URL status without PAT-backed GitHub requests", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(500);

    const { req, res } = createReqRes();
    req.url = "/api/status/up?type=json&cache_buster=public-check";

    await up(req, res);

    expect(res.send).toHaveBeenCalledWith({ up: true });
    expect(mock.history.post).toHaveLength(0);
  });

  it("does not disclose PAT details from /api/status/pat-info to unauthenticated users", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(200, {
      data: {
        rateLimit: {
          remaining: 4986,
          resetAt: new Date().toISOString(),
        },
      },
    });

    const { req, res } = createReqRes();
    await patInfo(req, res);

    expect(req.headers).toEqual({});
    expect(res.statusCode).toBe(401);
    expect(res.send).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(JSON.stringify(res.send.mock.calls[0][0])).not.toMatch(
      /PAT_1|PAT_2|validPATs|remaining|resetIn|errorPATs/,
    );
    expect(mock.history.post).toHaveLength(0);
  });

  it("keeps /api/status/pat-info disabled when no admin secret is configured", async () => {
    delete process.env.STATUS_ADMIN_SECRET;
    mock.onPost(GRAPHQL_ENDPOINT).reply(200, {
      data: {
        rateLimit: {
          remaining: 4986,
          resetAt: new Date().toISOString(),
        },
      },
    });

    const { req, res } = createReqRes(
      {},
      { [ADMIN_SECRET_HEADER]: "fake-status-admin-secret" },
    );
    await patInfo(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.send).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(mock.history.post).toHaveLength(0);
  });

  it("allows PAT details only with the admin header", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(200, {
      data: {
        rateLimit: {
          remaining: 4986,
        },
      },
    });

    const { req, res } = createReqRes(
      {},
      { [ADMIN_SECRET_HEADER]: "fake-status-admin-secret" },
    );
    await patInfo(req, res);

    expect(JSON.parse(res.send.mock.calls[0][0])).toEqual(
      expect.objectContaining({
        validPATs: ["PAT_1", "PAT_2"],
        details: {
          PAT_1: {
            status: "valid",
            remaining: 4986,
          },
          PAT_2: {
            status: "valid",
            remaining: 4986,
          },
        },
      }),
    );
    expect(mock.history.post).toHaveLength(2);
  });
});
