import { describe, expect, it } from "@jest/globals";
import "@testing-library/jest-dom";
import { calculateRank } from "../src/calculateRank.js";

const expectRank = (actual, expected) => {
  expect(actual.level).toBe(expected.level);
  if (Number.isInteger(expected.percentile)) {
    expect(actual.percentile).toBe(expected.percentile);
  } else {
    expect(actual.percentile).toBeCloseTo(expected.percentile, 12);
  }
};

describe("Test calculateRank", () => {
  const rankWithOnlyCommitsAtExponentialInput = (x) =>
    calculateRank({
      all_commits: false,
      commits: x * 250,
      prs: 0,
      issues: 0,
      reviews: 0,
      repos: 0,
      stars: 0,
      followers: 0,
    });

  const rankWithOnlyStarsAtLogNormalInput = (x) =>
    calculateRank({
      all_commits: false,
      commits: 0,
      prs: 0,
      issues: 0,
      reviews: 0,
      repos: 0,
      stars: x * 50,
      followers: 0,
    });

  it("new user gets C rank", () => {
    const result = calculateRank({
      all_commits: false,
      commits: 0,
      prs: 0,
      issues: 0,
      reviews: 0,
      repos: 0,
      stars: 0,
      followers: 0,
    });

    expectRank(result, { level: "C", percentile: 100 });
  });

  it("beginner user gets B- rank", () => {
    const result = calculateRank({
      all_commits: false,
      commits: 125,
      prs: 25,
      issues: 10,
      reviews: 5,
      repos: 0,
      stars: 25,
      followers: 5,
    });

    expectRank(result, { level: "B-", percentile: 65.02918514848255 });
  });

  it("median user gets B+ rank", () => {
    const result = calculateRank({
      all_commits: false,
      commits: 250,
      prs: 50,
      issues: 25,
      reviews: 10,
      repos: 0,
      stars: 50,
      followers: 10,
    });

    expectRank(result, { level: "B+", percentile: 46.09375 });
  });

  it("average user gets B+ rank (include_all_commits)", () => {
    const result = calculateRank({
      all_commits: true,
      commits: 1000,
      prs: 50,
      issues: 25,
      reviews: 10,
      repos: 0,
      stars: 50,
      followers: 10,
    });

    expectRank(result, { level: "B+", percentile: 46.09375 });
  });

  it("advanced user gets A rank", () => {
    const result = calculateRank({
      all_commits: false,
      commits: 500,
      prs: 100,
      issues: 50,
      reviews: 20,
      repos: 0,
      stars: 200,
      followers: 40,
    });

    expectRank(result, { level: "A", percentile: 20.841471354166664 });
  });

  it("expert user gets A+ rank", () => {
    const result = calculateRank({
      all_commits: false,
      commits: 1000,
      prs: 200,
      issues: 100,
      reviews: 40,
      repos: 0,
      stars: 800,
      followers: 160,
    });

    expectRank(result, { level: "A+", percentile: 5.575988339442828 });
  });

  it("sindresorhus gets S rank", () => {
    const result = calculateRank({
      all_commits: false,
      commits: 1300,
      prs: 1500,
      issues: 4500,
      reviews: 1000,
      repos: 0,
      stars: 600000,
      followers: 50000,
    });

    expectRank(result, { level: "S", percentile: 0.4578556547153667 });
  });

  it.each([
    [0, { level: "C", percentile: 100 }],
    [1, { level: "C", percentile: 91.66666666666666 }],
    [2, { level: "C+", percentile: 87.5 }],
  ])(
    "applies exponential commit scoring for x = %s",
    (x, expectedRankResult) => {
      expectRank(rankWithOnlyCommitsAtExponentialInput(x), expectedRankResult);
    },
  );

  it("applies exponential commit scoring that approaches its upper contribution", () => {
    const result = rankWithOnlyCommitsAtExponentialInput(20);

    expect(result.level).toBe("C+");
    expect(result.percentile).toBeCloseTo(83.3333, 4);
    expect(result.percentile).toBeGreaterThan(100 - 100 / 6);
  });

  it.each([
    [0, { level: "C", percentile: 100 }],
    [1, { level: "C+", percentile: 83.33333333333334 }],
    [3, { level: "B-", percentile: 75 }],
  ])("applies log-normal star scoring for x = %s", (x, expectedRankResult) => {
    expectRank(rankWithOnlyStarsAtLogNormalInput(x), expectedRankResult);
  });

  it("applies log-normal star scoring that approaches its upper contribution", () => {
    const result = rankWithOnlyStarsAtLogNormalInput(1_000_000);

    expect(result.level).toBe("B-");
    expect(result.percentile).toBeCloseTo(66.6667, 4);
    expect(result.percentile).toBeGreaterThan(100 - 100 / 3);
  });
});
