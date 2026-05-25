// @ts-check

import { afterAll, describe, expect, it, jest } from "@jest/globals";
import { renderError } from "../src/common/render.js";

const originalEnv = process.env;

/**
 * Loads guardAccess after applying whitelist environment variables.
 *
 * @param {{ whitelist?: string[], gistWhitelist?: string[] }} [env] Whitelist environment overrides.
 * @returns {Promise<import("../src/common/access.js").guardAccess>} Loaded guardAccess function.
 */
const loadGuardAccess = async (env = {}) => {
  jest.resetModules();
  process.env = { ...originalEnv };

  if (env.whitelist) {
    process.env.WHITELIST = env.whitelist.join(",");
  } else {
    delete process.env.WHITELIST;
  }

  if (env.gistWhitelist) {
    process.env.GIST_WHITELIST = env.gistWhitelist.join(",");
  } else {
    delete process.env.GIST_WHITELIST;
  }

  return (await import("../src/common/access.js")).guardAccess;
};

const createRes = () => ({
  send: jest.fn((result) => result),
});

describe("Test access.js", () => {
  afterAll(() => {
    process.env = originalEnv;
  });

  it("should throw the expected error for an invalid type", async () => {
    const guardAccess = await loadGuardAccess();
    const res = createRes();

    expect(() =>
      guardAccess({
        res,
        id: "anuraghazra",
        // @ts-ignore Testing runtime validation for invalid input.
        type: "repo",
        colors: {},
      }),
    ).toThrow('Invalid type. Expected "username", "gist", or "wakatime".');
    expect(res.send).not.toHaveBeenCalled();
  });

  it("should pass an allowed username without sending an error response", async () => {
    const guardAccess = await loadGuardAccess();
    const res = createRes();

    expect(
      guardAccess({
        res,
        id: "anuraghazra",
        type: "username",
        colors: {},
      }),
    ).toStrictEqual({ isPassed: true });
    expect(res.send).not.toHaveBeenCalled();
  });

  it("should block a blacklisted username", async () => {
    const guardAccess = await loadGuardAccess();
    const res = createRes();
    const expectedError = renderError({
      message: "This username is blacklisted",
      secondaryMessage: "Please deploy your own instance",
      renderOptions: { show_repo_link: false },
    });

    expect(
      guardAccess({
        res,
        id: "renovate-bot",
        type: "username",
        colors: {},
      }),
    ).toStrictEqual({ isPassed: false, result: expectedError });
    expect(res.send).toHaveBeenCalledWith(expectedError);
  });

  it("should respect username whitelist behavior", async () => {
    const guardAccess = await loadGuardAccess({
      whitelist: ["anuraghazra"],
    });
    const allowedRes = createRes();
    const blockedRes = createRes();
    const expectedError = renderError({
      message: "This username is not whitelisted",
      secondaryMessage: "Please deploy your own instance",
      renderOptions: { show_repo_link: false },
    });

    expect(
      guardAccess({
        res: allowedRes,
        id: "anuraghazra",
        type: "username",
        colors: {},
      }),
    ).toStrictEqual({ isPassed: true });
    expect(allowedRes.send).not.toHaveBeenCalled();

    expect(
      guardAccess({
        res: blockedRes,
        id: "renovate-bot",
        type: "username",
        colors: {},
      }),
    ).toStrictEqual({ isPassed: false, result: expectedError });
    expect(blockedRes.send).toHaveBeenCalledWith(expectedError);
  });

  it("should use gist whitelist behavior for gist type", async () => {
    const guardAccess = await loadGuardAccess({
      whitelist: ["anuraghazra"],
      gistWhitelist: ["allowed-gist-id"],
    });
    const allowedRes = createRes();
    const blockedRes = createRes();
    const expectedError = renderError({
      message: "This gist ID is not whitelisted",
      secondaryMessage: "Please deploy your own instance",
      renderOptions: { show_repo_link: false },
    });

    expect(
      guardAccess({
        res: allowedRes,
        id: "allowed-gist-id",
        type: "gist",
        colors: {},
      }),
    ).toStrictEqual({ isPassed: true });
    expect(allowedRes.send).not.toHaveBeenCalled();

    expect(
      guardAccess({
        res: blockedRes,
        id: "blocked-gist-id",
        type: "gist",
        colors: {},
      }),
    ).toStrictEqual({ isPassed: false, result: expectedError });
    expect(blockedRes.send).toHaveBeenCalledWith(expectedError);
  });

  it("should apply whitelist behavior for wakatime type", async () => {
    const guardAccess = await loadGuardAccess({
      whitelist: ["wakatime-user"],
    });
    const allowedRes = createRes();
    const blockedRes = createRes();
    const expectedError = renderError({
      message: "This username is not whitelisted",
      secondaryMessage: "Please deploy your own instance",
      renderOptions: { show_repo_link: false },
    });

    expect(
      guardAccess({
        res: allowedRes,
        id: "wakatime-user",
        type: "wakatime",
        colors: {},
      }),
    ).toStrictEqual({ isPassed: true });
    expect(allowedRes.send).not.toHaveBeenCalled();

    expect(
      guardAccess({
        res: blockedRes,
        id: "blocked-wakatime-user",
        type: "wakatime",
        colors: {},
      }),
    ).toStrictEqual({ isPassed: false, result: expectedError });
    expect(blockedRes.send).toHaveBeenCalledWith(expectedError);
  });

  it("should pass custom colors into the error response", async () => {
    const guardAccess = await loadGuardAccess();
    const res = createRes();
    const colors = {
      title_color: "123456",
      text_color: "abcdef",
      bg_color: "000000",
      border_color: "fedcba",
      theme: "default",
    };
    const expectedError = renderError({
      message: "This username is blacklisted",
      secondaryMessage: "Please deploy your own instance",
      renderOptions: { ...colors, show_repo_link: false },
    });

    expect(
      guardAccess({
        res,
        id: "renovate-bot",
        type: "username",
        colors,
      }),
    ).toStrictEqual({ isPassed: false, result: expectedError });
    expect(res.send).toHaveBeenCalledWith(expectedError);
  });
});
