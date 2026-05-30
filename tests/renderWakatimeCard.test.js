import { describe, expect, it } from "@jest/globals";
import { queryByTestId } from "@testing-library/dom";
import "@testing-library/jest-dom";
import { renderWakatimeCard } from "../src/cards/wakatime.js";
import { wakaTimeData } from "./fetchWakatime.test.js";

const xssLabelPayload = `"></text><desc id="xss-label-test">label-injected</desc><text x="0" y="0">`;

const createWakaTimeStats = (name, text = "1 hr") => ({
  is_coding_activity_visible: true,
  is_other_usage_visible: true,
  languages: [
    {
      name,
      text,
      percent: 100,
      hours: 1,
      minutes: 0,
    },
  ],
});

describe("Test Render WakaTime Card", () => {
  it("should render correctly", () => {
    const card = renderWakatimeCard(wakaTimeData.data);
    expect(card).toMatchSnapshot();
  });

  it("should render correctly with compact layout", () => {
    const card = renderWakatimeCard(wakaTimeData.data, { layout: "compact" });

    expect(card).toMatchSnapshot();
  });

  it("should render correctly with compact layout when langs_count is set", () => {
    const card = renderWakatimeCard(wakaTimeData.data, {
      layout: "compact",
      langs_count: 2,
    });

    expect(card).toMatchSnapshot();
  });

  it("should encode injected language labels in normal layout", () => {
    const card = renderWakatimeCard(createWakaTimeStats(xssLabelPayload));

    expect(card).not.toContain('<desc id="xss-label-test">');
    expect(card).not.toContain("xss-label-test");
    expect(card).not.toContain("label-injected");

    document.body.innerHTML = card;
    expect(document.getElementById("xss-label-test")).toBeNull();
    expect(document.querySelector(".stat.bold")).toHaveTextContent(
      `${xssLabelPayload}:`,
    );
  });

  it("should encode injected language labels in compact layout", () => {
    const card = renderWakatimeCard(createWakaTimeStats(xssLabelPayload), {
      layout: "compact",
    });

    expect(card).not.toContain('<desc id="xss-label-test">');
    expect(card).not.toContain("xss-label-test");
    expect(card).not.toContain("label-injected");

    document.body.innerHTML = card;
    expect(document.getElementById("xss-label-test")).toBeNull();
    expect(queryByTestId(document.body, "lang-name")).toHaveTextContent(
      `${xssLabelPayload} - 1 hr`,
    );
  });

  it("should render normal language labels in normal and compact layouts", () => {
    document.body.innerHTML = renderWakatimeCard(
      createWakaTimeStats("C++ & HTML"),
    );
    expect(document.querySelector(".stat.bold")).toHaveTextContent(
      "C++ & HTML:",
    );

    document.body.innerHTML = renderWakatimeCard(
      createWakaTimeStats("C++ & HTML"),
      { layout: "compact" },
    );
    expect(queryByTestId(document.body, "lang-name")).toHaveTextContent(
      "C++ & HTML - 1 hr",
    );
  });

  it("should hide languages when hide is passed", () => {
    document.body.innerHTML = renderWakatimeCard(wakaTimeData.data, {
      hide: ["YAML", "Other"],
    });

    expect(queryByTestId(document.body, /YAML/i)).toBeNull();
    expect(queryByTestId(document.body, /Other/i)).toBeNull();
    expect(queryByTestId(document.body, /TypeScript/i)).not.toBeNull();
  });

  it("should render translations", () => {
    document.body.innerHTML = renderWakatimeCard({}, { locale: "cn" });
    expect(document.getElementsByClassName("header")[0].textContent).toBe(
      "WakaTime 周统计",
    );
    expect(
      document.querySelector('g[transform="translate(0, 0)"]>text.stat.bold')
        .textContent,
    ).toBe("WakaTime 用户个人资料未公开");
  });

  it("should render without rounding", () => {
    document.body.innerHTML = renderWakatimeCard(wakaTimeData.data, {
      border_radius: "0",
    });
    expect(document.querySelector("rect")).toHaveAttribute("rx", "0");
    document.body.innerHTML = renderWakatimeCard(wakaTimeData.data, {});
    expect(document.querySelector("rect")).toHaveAttribute("rx", "4.5");
  });

  it('should show "no coding activity this week" message when there has not been activity', () => {
    document.body.innerHTML = renderWakatimeCard(
      {
        ...wakaTimeData.data,
        languages: undefined,
      },
      {},
    );
    expect(document.querySelector(".stat").textContent).toBe(
      "No coding activity this week",
    );
  });

  it('should show "no coding activity this week" message when using compact layout and there has not been activity', () => {
    document.body.innerHTML = renderWakatimeCard(
      {
        ...wakaTimeData.data,
        languages: undefined,
      },
      {
        layout: "compact",
      },
    );
    expect(document.querySelector(".stat").textContent).toBe(
      "No coding activity this week",
    );
  });

  it("should render correctly with percent display format", () => {
    const card = renderWakatimeCard(wakaTimeData.data, {
      display_format: "percent",
    });
    expect(card).toMatchSnapshot();
  });
});
