import { describe, expect, it } from "@jest/globals";
import { getQueryParams } from "../src/common/query.js";

describe("Test query.js", () => {
  it("getQueryParams: should fall back to req.query when url is missing", () => {
    const languages = ["JavaScript", "TypeScript"];
    const params = getQueryParams({
      query: {
        username: "anuraghazra",
        include_all_commits: true,
        count: 42,
        hide: languages,
        empty: undefined,
        missing: null,
      },
    });

    expect(params.username).toBe("anuraghazra");
    expect(params.include_all_commits).toBe(true);
    expect(params.count).toBe(42);
    expect(params.hide).toEqual(languages);
    expect(Object.prototype.hasOwnProperty.call(params, "empty")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(params, "missing")).toBe(false);
  });
});
