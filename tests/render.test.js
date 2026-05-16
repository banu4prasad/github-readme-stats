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
    document.body.innerHTML = renderError({
      message: "Something went wrong",
      secondaryMessage: "<script>alert(1)</script>",
    });
    expect(
      queryByTestId(document.body, "message")?.children[1],
    ).toHaveTextContent(/<script>alert\(1\)<\/script>/gim);
    expect(document.body.innerHTML).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(document.body.innerHTML).not.toContain("<script>alert(1)</script>");
  });
});
