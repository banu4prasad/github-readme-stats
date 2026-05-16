// @ts-check

import { describe, expect, it } from "@jest/globals";
import { queryByTestId } from "@testing-library/dom";
import "@testing-library/jest-dom/jest-globals";
import { renderError } from "../src/common/render.js";

describe("Test render.js", () => {
  it("should test renderError", () => {
    document.body.innerHTML = renderError({ message: "Something went wrong" });
    expect(
      queryByTestId(document.body, "message")?.children[0],
    ).toHaveTextContent(/Something went wrong/gim);
    expect(
      queryByTestId(document.body, "message")?.children[1],
    ).toBeEmptyDOMElement();

    // Secondary message
    document.body.innerHTML = renderError({
      message: "Something went wrong",
      secondaryMessage: "Secondary Message",
    });
    expect(
      queryByTestId(document.body, "message")?.children[1],
    ).toHaveTextContent(/Secondary Message/gim);

    // XSS Escaping
    const svgString = renderError({
      message: "Something went wrong",
      secondaryMessage: "<script>alert(1)</script>",
    });

    // Assert on the raw string output to avoid JSDOM serialization variations
    expect(svgString).toContain("&#60;script&#62;alert(1)&#60;/script&#62;");
    expect(svgString).not.toContain("<script>alert(1)</script>");

    document.body.innerHTML = svgString;
    expect(
      queryByTestId(document.body, "message")?.children[1],
    ).toHaveTextContent(/<script>alert\(1\)<\/script>/gim);
  });
});
