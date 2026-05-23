/**
 * @file Tests for the status/up cloud function.
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
import up, { RATE_LIMIT_SECONDS } from "../api/status/up.js";

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

const mock = new MockAdapter(axios);
const originalEnv = process.env;

const faker = (query) => {
  const req = {
    query: { ...query },
  };
  const res = {
    setHeader: jest.fn(),
    send: jest.fn(),
    json: jest.fn(),
  };

  return { req, res };
};

const shieldsUp = {
  schemaVersion: 1,
  label: "Public Instance",
  isError: true,
  message: "up",
  color: "brightgreen",
};

beforeEach(() => {
  process.env = {
    ...originalEnv,
    PAT_1: "fake-status-token-1",
    PAT_2: "fake-status-token-2",
  };
});

afterEach(() => {
  mock.reset();
  process.env = originalEnv;
});

describe("Test /api/status/up", () => {
  it("should return generic public JSON status by default", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(500);

    const { req, res } = faker({});
    await up(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json",
    );
    expect(res.send).toHaveBeenCalledWith({ up: true });
    expect(mock.history.post).toHaveLength(0);
  });

  it("should return generic public JSON status for type='json'", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(500);

    const { req, res } = faker({ type: "json" });
    await up(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json",
    );
    expect(res.send).toHaveBeenCalledWith({ up: true });
    expect(mock.history.post).toHaveLength(0);
  });

  it("should keep shields.io output generic and avoid GitHub requests", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(500);

    const { req, res } = faker({ type: "shields" });
    await up(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json",
    );
    expect(res.send).toHaveBeenCalledWith(shieldsUp);
    expect(mock.history.post).toHaveLength(0);
  });

  it("should keep legacy boolean output generic and avoid GitHub requests", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(500);

    const { req, res } = faker({ type: "boolean" });
    await up(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json",
    );
    expect(res.send).toHaveBeenCalledWith(true);
    expect(mock.history.post).toHaveLength(0);
  });

  it("should ignore unknown query parameters", async () => {
    mock.onPost(GRAPHQL_ENDPOINT).reply(500);

    const { req, res } = faker({
      cache_buster: "different-every-time",
      unknown: "value",
    });
    await up(req, res);

    expect(res.send).toHaveBeenCalledWith({ up: true });
    expect(res.setHeader.mock.calls).toEqual([
      ["Content-Type", "application/json"],
      ["Cache-Control", `max-age=0, s-maxage=${RATE_LIMIT_SECONDS}`],
    ]);
    expect(mock.history.post).toHaveLength(0);
  });

  it("should return generic JSON status from the outer catch block", async () => {
    const req = { query: {} };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(() => {
        throw new Error("Simulated outer scope error");
      }),
      json: jest.fn(),
    };

    await up(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(res.json).toHaveBeenCalledWith({ up: false });
    expect(mock.history.post).toHaveLength(0);
  });
});
