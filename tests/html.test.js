import { describe, expect, it } from "@jest/globals";
import { encodeHTML } from "../src/common/html.js";

describe("Test html.js", () => {
  it("should test encodeHTML", () => {
    expect(encodeHTML(`<html>hello world<,.#4^&^@%!))`)).toBe(
      "&#60;html&#62;hello world&#60;,.#4^&#38;^@%!))",
    );
  });

  it("should encode all characters when encodeAll is enabled for unsafe text", () => {
    expect(
      encodeHTML(`<desc id="xss-label-test">label-injected</desc>`, {
        encodeAll: true,
      }),
    ).not.toContain("xss-label-test");
    expect(encodeHTML("TypeScript", { encodeAll: true })).toBe("TypeScript");
  });
});
