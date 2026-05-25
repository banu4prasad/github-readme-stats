// @ts-check

import { describe, expect, it } from "@jest/globals";
import {
  CustomError,
  SECONDARY_ERROR_MESSAGES,
  retrieveSecondaryMessage,
} from "../src/common/error.js";

describe("Test error.js", () => {
  describe("retrieveSecondaryMessage", () => {
    it("should return secondaryMessage when it exists and is a string", () => {
      /** @type {Error & {secondaryMessage?: unknown}} */
      const err = new Error("Something went wrong");
      err.secondaryMessage = "Secondary Message";

      expect(retrieveSecondaryMessage(err)).toBe("Secondary Message");
    });

    it("should return undefined when secondaryMessage is missing", () => {
      expect(retrieveSecondaryMessage(new Error("Something went wrong"))).toBe(
        undefined,
      );
    });

    it("should return undefined when secondaryMessage exists but is not a string", () => {
      /** @type {Error & {secondaryMessage?: unknown}} */
      const err = new Error("Something went wrong");
      err.secondaryMessage = 404;

      expect(retrieveSecondaryMessage(err)).toBe(undefined);
    });
  });

  describe("CustomError", () => {
    it("should preserve message and behave like an Error instance", () => {
      const err = new CustomError(
        "Something went wrong",
        CustomError.MAX_RETRY,
      );

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(CustomError);
      expect(err.message).toBe("Something went wrong");
    });

    it("should preserve type and mapped secondaryMessage", () => {
      const err = new CustomError("User not found", CustomError.USER_NOT_FOUND);

      expect(err.type).toBe(CustomError.USER_NOT_FOUND);
      expect(err.secondaryMessage).toBe(
        SECONDARY_ERROR_MESSAGES[CustomError.USER_NOT_FOUND],
      );
    });

    it("should use type as secondaryMessage when no mapped secondaryMessage exists", () => {
      const err = new CustomError(
        "Invalid WakaTime API domain",
        "WAKATIME_ERROR",
      );

      expect(err.type).toBe("WAKATIME_ERROR");
      expect(err.secondaryMessage).toBe("WAKATIME_ERROR");
    });
  });
});
