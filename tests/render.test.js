// @ts-check

import { describe, expect, it } from "@jest/globals";
import { queryByTestId } from "@testing-library/dom";
import "@testing-library/jest-dom/jest-globals";
import {
  createLanguageNode,
  iconWithLabel,
  renderError,
} from "../src/common/render.js";

const xssLabelPayload = `"></text><desc id="xss-label-test">label-injected</desc><text x="0" y="0">`;

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

  it("should encode createLanguageNode text content", () => {
    const svgString = createLanguageNode(xssLabelPayload, "#2b7489");

    expect(svgString).not.toContain('<desc id="xss-label-test">');
    expect(svgString).not.toContain("xss-label-test");
    expect(svgString).not.toContain("label-injected");

    document.body.innerHTML = `<svg>${svgString}</svg>`;
    expect(document.getElementById("xss-label-test")).toBeNull();
    expect(queryByTestId(document.body, "lang-name")).toHaveTextContent(
      xssLabelPayload,
    );
  });

  it("should render normal language node names", () => {
    const svgString = createLanguageNode("C++ & HTML", "#2b7489");

    document.body.innerHTML = `<svg>${svgString}</svg>`;
    expect(queryByTestId(document.body, "lang-name")).toHaveTextContent(
      "C++ & HTML",
    );
  });

  it("should encode iconWithLabel label text without encoding the icon", () => {
    const icon = '<path d="M0 0h16v16H0z" />';
    const svgString = iconWithLabel(icon, xssLabelPayload, "custom-label", 16);

    expect(svgString).toContain(icon);
    expect(svgString).not.toContain('<desc id="xss-label-test">');
    expect(svgString).not.toContain("xss-label-test");
    expect(svgString).not.toContain("label-injected");

    document.body.innerHTML = `<svg>${svgString}</svg>`;
    expect(document.getElementById("xss-label-test")).toBeNull();
    expect(queryByTestId(document.body, "custom-label")).toHaveTextContent(
      xssLabelPayload,
    );
  });

  it("should render normal iconWithLabel labels", () => {
    const svgString = iconWithLabel(
      '<path d="M0 0h16v16H0z" />',
      "stars & forks",
      "custom-label",
      16,
    );

    document.body.innerHTML = `<svg>${svgString}</svg>`;
    expect(queryByTestId(document.body, "custom-label")).toHaveTextContent(
      "stars & forks",
    );
  });
});
