// @ts-check

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
import api from "../api/index.js";
import { calculateRank } from "../src/calculateRank.js";
import { renderStatsCard } from "../src/cards/stats.js";
import { renderError } from "../src/common/render.js";
import { CACHE_TTL, DURATIONS } from "../src/common/cache.js";

/**
 * @type {import("../src/fetchers/stats").StatsData}
 */
const stats = {
  name: "Anurag Hazra",
  totalStars: 100,
  totalCommits: 200,
  totalIssues: 300,
  totalPRs: 400,
  totalPRsMerged: 320,
  mergedPRsPercentage: 80,
  totalReviews: 50,
  totalDiscussionsStarted: 10,
  totalDiscussionsAnswered: 40,
  contributedTo: 50,
  rank: { level: "DEV", percentile: 0 },
};

stats.rank = calculateRank({
  all_commits: false,
  commits: stats.totalCommits,
  prs: stats.totalPRs,
  reviews: stats.totalReviews,
  issues: stats.totalIssues,
  repos: 1,
  stars: stats.totalStars,
  followers: 0,
});

const data_stats = {
  data: {
    user: {
      name: stats.name,
      repositoriesContributedTo: { totalCount: stats.contributedTo },
      commits: {
        totalCommitContributions: stats.totalCommits,
      },
      reviews: {
        totalPullRequestReviewContributions: stats.totalReviews,
      },
      pullRequests: { totalCount: stats.totalPRs },
      mergedPullRequests: { totalCount: stats.totalPRsMerged },
      openIssues: { totalCount: stats.totalIssues },
      closedIssues: { totalCount: 0 },
      followers: { totalCount: 0 },
      repositoryDiscussions: { totalCount: stats.totalDiscussionsStarted },
      repositoryDiscussionComments: {
        totalCount: stats.totalDiscussionsAnswered,
      },
      repositories: {
        totalCount: 1,
        nodes: [{ stargazers: { totalCount: 100 } }],
        pageInfo: {
          hasNextPage: false,
          endCursor: "cursor",
        },
      },
    },
    reviewedPullRequests: {
      issueCount: stats.totalReviews,
    },
  },
};

const error = {
  errors: [
    {
      type: "NOT_FOUND",
      path: ["user"],
      locations: [],
      message: "Could not fetch user",
    },
  ],
};

const mock = new MockAdapter(axios);
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createContributionYearsData = (yearCount, startYear = 2024) => ({
  data: {
    user: {
      contributionsCollection: {
        contributionYears: Array.from(
          { length: yearCount },
          (_, index) => startYear - index,
        ),
      },
    },
  },
});

const createYearContributionsData = (year) => ({
  data: {
    user: {
      contributionsCollection: {
        commitContributionsByRepository: [
          { repository: { nameWithOwner: `user/repo-${year}` } },
        ],
        issueContributionsByRepository: [],
        pullRequestContributionsByRepository: [],
        pullRequestReviewContributionsByRepository: [],
      },
    },
  },
});

const createApiRequest = (query = {}) => ({
  req: {
    query: {
      username: "anuraghazra",
      ...query,
    },
  },
  res: {
    setHeader: jest.fn(),
    send: jest.fn(),
  },
});

const extractStatValue = (svg, testId) => {
  const match = svg.match(
    new RegExp(`data-testid="${testId}"[\\s\\S]*?>([^<]+)</text>`),
  );
  return match?.[1].trim();
};

const mockAllTimeApiResponses = ({
  yearCount,
  baseDelayMs = 0,
  contributionYearsDelayMs = 0,
  yearlyDelayMs = 0,
}) => {
  let graphQLCalls = 0;
  let contributionYearsCalls = 0;
  let yearlyContributionCalls = 0;
  const years = createContributionYearsData(yearCount);

  mock.onPost(GITHUB_GRAPHQL_URL).reply(async (cfg) => {
    graphQLCalls += 1;
    const req = JSON.parse(cfg.data);

    if (req.query.includes("totalCommitContributions")) {
      if (baseDelayMs) {
        await delay(baseDelayMs);
      }
      return [200, data_stats];
    }

    if (req.query.includes("contributionYears")) {
      contributionYearsCalls += 1;
      if (contributionYearsDelayMs) {
        await delay(contributionYearsDelayMs);
      }
      return [200, years];
    }

    if (req.query.includes("commitContributionsByRepository")) {
      yearlyContributionCalls += 1;
      if (yearlyDelayMs) {
        await delay(yearlyDelayMs);
      }
      return [200, createYearContributionsData(req.variables.from.slice(0, 4))];
    }

    return [500, { error: "Unexpected GraphQL request" }];
  });

  return {
    getGraphQLCalls: () => graphQLCalls,
    getContributionYearsCalls: () => contributionYearsCalls,
    getYearlyContributionCalls: () => yearlyContributionCalls,
  };
};

// @ts-ignore
const faker = (query, data) => {
  const req = {
    query: {
      username: "anuraghazra",
      ...query,
    },
  };
  const res = {
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  mock.onPost("https://api.github.com/graphql").replyOnce(200, data);

  return { req, res };
};

beforeEach(() => {
  process.env.CACHE_SECONDS = undefined;
  delete process.env.ALL_TIME_CONTRIBS;
});

afterEach(() => {
  mock.reset();
  delete process.env.ALL_TIME_CONTRIBS;
});

describe("Test /api/", () => {
  it("should test the request", async () => {
    const { req, res } = faker({}, data_stats);

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderStatsCard(stats, { ...req.query }),
    );
  });

  it("should render error card on error", async () => {
    const { req, res } = faker({}, error);

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: error.errors[0].message,
        secondaryMessage:
          "Make sure the provided username is not an organization",
      }),
    );
  });

  it("should keep GraphQL error card when include_all_commits true", async () => {
    let restCalls = 0;
    mock
      .onGet("https://api.github.com/search/commits?q=author:anuraghazra")
      .reply(() => {
        restCalls += 1;
        return [200, { error: "Some test error message" }];
      });
    const { req, res } = faker(
      { username: "anuraghazra", include_all_commits: true },
      error,
    );

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: error.errors[0].message,
        secondaryMessage:
          "Make sure the provided username is not an organization",
      }),
    );
    expect(restCalls).toBe(1);
  });

  it("should render error card in same theme as requested card", async () => {
    const { req, res } = faker({ theme: "merko" }, error);

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: error.errors[0].message,
        secondaryMessage:
          "Make sure the provided username is not an organization",
        renderOptions: { theme: "merko" },
      }),
    );
  });

  it("should get the query options", async () => {
    const { req, res } = faker(
      {
        username: "anuraghazra",
        hide: "issues,prs,contribs",
        show_icons: true,
        hide_border: true,
        line_height: 100,
        title_color: "fff",
        icon_color: "fff",
        text_color: "fff",
        bg_color: "fff",
      },
      data_stats,
    );

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderStatsCard(stats, {
        hide: ["issues", "prs", "contribs"],
        show_icons: true,
        hide_border: true,
        line_height: 100,
        title_color: "fff",
        icon_color: "fff",
        text_color: "fff",
        bg_color: "fff",
      }),
    );
  });

  it("should have proper cache", async () => {
    const { req, res } = faker({}, data_stats);

    await api(req, res);

    expect(res.setHeader.mock.calls).toEqual([
      ["Content-Type", "image/svg+xml"],
      [
        "Cache-Control",
        `max-age=${CACHE_TTL.STATS_CARD.DEFAULT}, ` +
          `s-maxage=${CACHE_TTL.STATS_CARD.DEFAULT}, ` +
          `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
      ],
    ]);
  });

  it("should set proper cache", async () => {
    const cache_seconds = DURATIONS.TWELVE_HOURS;
    const { req, res } = faker({ cache_seconds }, data_stats);
    await api(req, res);

    expect(res.setHeader.mock.calls).toEqual([
      ["Content-Type", "image/svg+xml"],
      [
        "Cache-Control",
        `max-age=${cache_seconds}, ` +
          `s-maxage=${cache_seconds}, ` +
          `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
      ],
    ]);
  });

  it("should set shorter cache when error", async () => {
    const { req, res } = faker({}, error);
    await api(req, res);

    expect(res.setHeader.mock.calls).toEqual([
      ["Content-Type", "image/svg+xml"],
      [
        "Cache-Control",
        `max-age=${CACHE_TTL.ERROR}, ` +
          `s-maxage=${CACHE_TTL.ERROR}, ` +
          `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
      ],
    ]);
  });

  it("should properly set cache using CACHE_SECONDS env variable", async () => {
    const cacheSeconds = "10000";
    process.env.CACHE_SECONDS = cacheSeconds;

    const { req, res } = faker({}, data_stats);
    await api(req, res);

    expect(res.setHeader.mock.calls).toEqual([
      ["Content-Type", "image/svg+xml"],
      [
        "Cache-Control",
        `max-age=${cacheSeconds}, ` +
          `s-maxage=${cacheSeconds}, ` +
          `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
      ],
    ]);
  });

  it("should disable cache when CACHE_SECONDS is set to 0", async () => {
    process.env.CACHE_SECONDS = "0";

    const { req, res } = faker({}, data_stats);
    await api(req, res);

    expect(res.setHeader.mock.calls).toEqual([
      ["Content-Type", "image/svg+xml"],
      [
        "Cache-Control",
        "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0",
      ],
      ["Pragma", "no-cache"],
      ["Expires", "0"],
    ]);
  });

  it("should set proper cache with clamped values", async () => {
    {
      let { req, res } = faker({ cache_seconds: 200_000 }, data_stats);
      await api(req, res);

      expect(res.setHeader.mock.calls).toEqual([
        ["Content-Type", "image/svg+xml"],
        [
          "Cache-Control",
          `max-age=${CACHE_TTL.STATS_CARD.MAX}, ` +
            `s-maxage=${CACHE_TTL.STATS_CARD.MAX}, ` +
            `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
        ],
      ]);
    }

    // note i'm using block scoped vars
    {
      let { req, res } = faker({ cache_seconds: 0 }, data_stats);
      await api(req, res);

      expect(res.setHeader.mock.calls).toEqual([
        ["Content-Type", "image/svg+xml"],
        [
          "Cache-Control",
          `max-age=${CACHE_TTL.STATS_CARD.MIN}, ` +
            `s-maxage=${CACHE_TTL.STATS_CARD.MIN}, ` +
            `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
        ],
      ]);
    }

    {
      let { req, res } = faker({ cache_seconds: -10_000 }, data_stats);
      await api(req, res);

      expect(res.setHeader.mock.calls).toEqual([
        ["Content-Type", "image/svg+xml"],
        [
          "Cache-Control",
          `max-age=${CACHE_TTL.STATS_CARD.MIN}, ` +
            `s-maxage=${CACHE_TTL.STATS_CARD.MIN}, ` +
            `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
        ],
      ]);
    }
  });

  it("should allow changing ring_color", async () => {
    const { req, res } = faker(
      {
        username: "anuraghazra",
        hide: "issues,prs,contribs",
        show_icons: true,
        hide_border: true,
        line_height: 100,
        title_color: "fff",
        ring_color: "0000ff",
        icon_color: "fff",
        text_color: "fff",
        bg_color: "fff",
      },
      data_stats,
    );

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderStatsCard(stats, {
        hide: ["issues", "prs", "contribs"],
        show_icons: true,
        hide_border: true,
        line_height: 100,
        title_color: "fff",
        ring_color: "0000ff",
        icon_color: "fff",
        text_color: "fff",
        bg_color: "fff",
      }),
    );
  });

  it("should render error card if username in blacklist", async () => {
    const { req, res } = faker({ username: "renovate-bot" }, data_stats);

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: "This username is blacklisted",
        secondaryMessage: "Please deploy your own instance",
        renderOptions: { show_repo_link: false },
      }),
    );
  });

  it("should render error card when wrong locale is provided", async () => {
    const { req, res } = faker({ locale: "asdf" }, data_stats);

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: "Something went wrong",
        secondaryMessage: "Language not found",
      }),
    );
  });

  it("should render error card when include_all_commits true and upstream API fails", async () => {
    mock
      .onGet("https://api.github.com/search/commits?q=author:anuraghazra")
      .reply(200, { error: "Some test error message" });

    const { req, res } = faker(
      { username: "anuraghazra", include_all_commits: true },
      data_stats,
    );

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: "Could not fetch total commits.",
        secondaryMessage: "Please try again later",
      }),
    );
    // Received SVG output should not contain string "https://tiny.one/readme-stats"
    expect(res.send.mock.calls[0][0]).not.toContain(
      "https://tiny.one/readme-stats",
    );
  });

  it("should ignore all_time_contribs unless the feature flag is enabled", async () => {
    const { req, res } = faker(
      {
        username: "anuraghazra",
        all_time_contribs: "true",
      },
      data_stats,
    );

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(mock.history.post).toHaveLength(1);
    expect(res.send).toHaveBeenCalledWith(
      renderStatsCard(stats, {
        ...req.query,
        all_time_contribs: false,
      }),
    );
  });

  it("should ignore all_time_contribs from request URLs unless the feature flag is enabled", async () => {
    const req = {
      url: "/api?username=anuraghazra&all_time_contribs=true&number_format=long",
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").replyOnce(200, data_stats);

    await api(req, res);

    const renderedCard = res.send.mock.calls[0][0];
    expect(mock.history.post).toHaveLength(1);
    expect(extractStatValue(renderedCard, "contribs")).toBe(
      String(stats.contributedTo),
    );
  });

  it("should pass all_time_contribs to renderStatsCard when the feature flag is enabled", async () => {
    process.env.ALL_TIME_CONTRIBS = "true";
    const metrics = mockAllTimeApiResponses({ yearCount: 2 });
    const { req, res } = createApiRequest({
      all_time_contribs: "true",
      number_format: "long",
    });

    await api(req, res);

    const renderedCard = res.send.mock.calls[0][0];
    expect(metrics.getGraphQLCalls()).toBe(4);
    expect(metrics.getContributionYearsCalls()).toBe(1);
    expect(metrics.getYearlyContributionCalls()).toBe(2);
    expect(extractStatValue(renderedCard, "contribs")).toBe("2");
  });

  it("should use ALL_TIME_STATS_CARD cache TTL when all_time_contribs is enabled", async () => {
    process.env.ALL_TIME_CONTRIBS = "true";
    mockAllTimeApiResponses({ yearCount: 1 });
    const { req, res } = createApiRequest({
      all_time_contribs: "true",
    });

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      expect.stringContaining(
        `max-age=${CACHE_TTL.ALL_TIME_STATS_CARD.DEFAULT}`,
      ),
    );
  });

  it("should use STATS_CARD cache TTL when all_time_contribs is disabled by feature flag", async () => {
    const { req, res } = faker(
      {
        username: "anuraghazra",
        all_time_contribs: "true",
      },
      data_stats,
    );

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      expect.stringContaining(`max-age=${CACHE_TTL.STATS_CARD.DEFAULT}`),
    );
  });

  it("should handle commits_year parameter correctly when undefined", async () => {
    const { req, res } = faker(
      {
        username: "anuraghazra",
        // commits_year is not provided
      },
      data_stats,
    );

    await api(req, res);

    // Should not throw error and render successfully
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderStatsCard(stats, {
        ...req.query,
        commits_year: undefined, // Should be undefined, not NaN
      }),
    );
  });

  it("should parse commits_year parameter correctly when provided", async () => {
    const { req, res } = faker(
      {
        username: "anuraghazra",
        commits_year: "2023",
      },
      data_stats,
    );

    await api(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderStatsCard(stats, {
        ...req.query,
        commits_year: 2023,
      }),
    );
  });
});

describe("Test /api/ all_time_contribs timeout budget behavior", () => {
  const originalEnv = {
    ALL_TIME_CONTRIBS: process.env.ALL_TIME_CONTRIBS,
    ALL_TIME_CONTRIBS_CONCURRENCY: process.env.ALL_TIME_CONTRIBS_CONCURRENCY,
    ALL_TIME_CONTRIBS_TIMEOUT_MS: process.env.ALL_TIME_CONTRIBS_TIMEOUT_MS,
    ALL_TIME_CONTRIBS_REQUEST_BUDGET_MS:
      process.env.ALL_TIME_CONTRIBS_REQUEST_BUDGET_MS,
    ALL_TIME_CONTRIBS_SAFETY_MARGIN_MS:
      process.env.ALL_TIME_CONTRIBS_SAFETY_MARGIN_MS,
    ALL_TIME_CONTRIBS_MIN_TIMEOUT_MS:
      process.env.ALL_TIME_CONTRIBS_MIN_TIMEOUT_MS,
  };

  beforeEach(() => {
    process.env.ALL_TIME_CONTRIBS = "true";
    process.env.ALL_TIME_CONTRIBS_CONCURRENCY = "3";
    process.env.ALL_TIME_CONTRIBS_TIMEOUT_MS = "1000";
  });

  afterEach(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it("should make one main query, one years query, and one query per contribution year", async () => {
    const metrics = mockAllTimeApiResponses({ yearCount: 10 });
    const { req, res } = createApiRequest({
      all_time_contribs: "true",
      number_format: "long",
    });

    await api(req, res);

    const renderedCard = res.send.mock.calls[0][0];
    expect(metrics.getGraphQLCalls()).toBe(12);
    expect(metrics.getContributionYearsCalls()).toBe(1);
    expect(metrics.getYearlyContributionCalls()).toBe(10);
    expect(extractStatValue(renderedCard, "contribs")).toBe("10");
  });

  it("should complete delayed all-time work before the configured timeout", async () => {
    process.env.ALL_TIME_CONTRIBS_TIMEOUT_MS = "500";
    const metrics = mockAllTimeApiResponses({
      yearCount: 5,
      baseDelayMs: 50,
      yearlyDelayMs: 40,
    });
    const { req, res } = createApiRequest({
      all_time_contribs: "true",
      number_format: "long",
    });

    const startedAt = Date.now();
    await api(req, res);
    const durationMs = Date.now() - startedAt;

    const renderedCard = res.send.mock.calls[0][0];
    expect(metrics.getGraphQLCalls()).toBe(7);
    expect(metrics.getYearlyContributionCalls()).toBe(5);
    expect(extractStatValue(renderedCard, "contribs")).toBe("5");
    expect(durationMs).toBeLessThan(500);
  });

  it("should fallback when all-time work exceeds the configured timeout after base stats", async () => {
    process.env.ALL_TIME_CONTRIBS_TIMEOUT_MS = "20";
    const metrics = mockAllTimeApiResponses({
      yearCount: 5,
      baseDelayMs: 30,
      contributionYearsDelayMs: 60,
    });
    const { req, res } = createApiRequest({
      all_time_contribs: "true",
      number_format: "long",
    });

    const startedAt = Date.now();
    await api(req, res);
    const durationMs = Date.now() - startedAt;

    const renderedCard = res.send.mock.calls[0][0];
    expect(metrics.getGraphQLCalls()).toBe(2);
    expect(metrics.getContributionYearsCalls()).toBe(1);
    expect(metrics.getYearlyContributionCalls()).toBe(0);
    expect(extractStatValue(renderedCard, "contribs")).toBe(
      String(stats.contributedTo),
    );
    expect(durationMs).toBeLessThan(200);

    await delay(70);
  });
});
