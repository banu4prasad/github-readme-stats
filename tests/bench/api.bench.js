import api from "../../api/index.js";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { expect, it, jest } from "@jest/globals";
import { runAndLogStats } from "./utils.js";

jest.setTimeout(30_000);

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
  rank: null,
};

const totalCommits = 1000;
const UPSTREAM_DELAY_MS = 50;
const LATENCY_BENCH_OPTIONS = { runs: 10, warmup: 2 };
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_TOTAL_COMMITS_URL =
  "https://api.github.com/search/commits?q=author:anuraghazra";

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

const data_total_commits = {
  total_count: totalCommits,
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

const extractStatValue = (svg, testId) => {
  const match = svg.match(
    new RegExp(`data-testid="${testId}"[\\s\\S]*?>([^<]+)</text>`),
  );
  return match?.[1].trim();
};

const formatMs = (ms) => `${ms.toFixed(1)}ms`;

const average = (values) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const restoreEnvValue = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

const mockAllTimeApiResponse = ({
  yearCount,
  baseDelayMs = 0,
  contributionYearsDelayMs = 0,
  yearlyDelayMs = 0,
}) => {
  const metrics = {
    graphQLCalls: 0,
    contributionYearsCalls: 0,
    yearlyContributionCalls: 0,
  };
  const years = createContributionYearsData(yearCount);

  mock.reset();
  mock.onPost(GITHUB_GRAPHQL_URL).reply(async (cfg) => {
    metrics.graphQLCalls += 1;
    const req = JSON.parse(cfg.data);

    if (req.query.includes("totalCommitContributions")) {
      if (baseDelayMs) {
        await delay(baseDelayMs);
      }
      return [200, data_stats];
    }

    if (req.query.includes("contributionYears")) {
      metrics.contributionYearsCalls += 1;
      if (contributionYearsDelayMs) {
        await delay(contributionYearsDelayMs);
      }
      return [200, years];
    }

    if (req.query.includes("commitContributionsByRepository")) {
      metrics.yearlyContributionCalls += 1;
      if (yearlyDelayMs) {
        await delay(yearlyDelayMs);
      }
      return [200, createYearContributionsData(req.variables.from.slice(0, 4))];
    }

    return [500, { error: "Unexpected GraphQL request" }];
  });

  return metrics;
};

const faker = (query) => {
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

  return { req, res };
};

const mockStatsResponse = () => {
  mock.reset();
  mock.onPost(GITHUB_GRAPHQL_URL).reply(200, data_stats);
};

const mockStatsWithTotalCommitsResponse = () => {
  mockStatsResponse();
  mock.onGet(GITHUB_TOTAL_COMMITS_URL).reply(200, data_total_commits);
};

const mockDelayedStatsWithTotalCommitsResponse = () => {
  mock.reset();
  mock.onPost(GITHUB_GRAPHQL_URL).reply(async () => {
    await delay(UPSTREAM_DELAY_MS);
    return [200, data_stats];
  });
  mock.onGet(GITHUB_TOTAL_COMMITS_URL).reply(async () => {
    await delay(UPSTREAM_DELAY_MS);
    return [200, data_total_commits];
  });
};

const mockStatsErrorWithTotalCommitsResponse = () => {
  let restCalls = 0;
  mock.reset();
  mock.onPost(GITHUB_GRAPHQL_URL).reply(200, error);
  mock.onGet(GITHUB_TOTAL_COMMITS_URL).reply(() => {
    restCalls += 1;
    return [200, data_total_commits];
  });

  return {
    getRestCalls: () => restCalls,
  };
};

const benchApi = async (name, query, mockResponses, options) => {
  mockResponses();

  await runAndLogStats(
    name,
    async () => {
      const { req, res } = faker(query);

      await api(req, res);
    },
    options,
  );
};

const benchAllTimeApi = async (
  name,
  {
    yearCount,
    baseDelayMs = 0,
    contributionYearsDelayMs = 0,
    yearlyDelayMs = 0,
    timeoutMs = "9000",
    runs = 10,
    assertUnderBudget = false,
    expectedFallback,
  },
) => {
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
  const samples = [];

  process.env.ALL_TIME_CONTRIBS = "true";
  process.env.ALL_TIME_CONTRIBS_CONCURRENCY = "3";
  process.env.ALL_TIME_CONTRIBS_TIMEOUT_MS = String(timeoutMs);

  try {
    await runAndLogStats(
      name,
      async () => {
        const metrics = mockAllTimeApiResponse({
          yearCount,
          baseDelayMs,
          contributionYearsDelayMs,
          yearlyDelayMs,
        });
        const { req, res } = faker({
          all_time_contribs: "true",
          number_format: "long",
        });
        const start = process.hrtime.bigint();

        await api(req, res);

        const wallMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        const renderedCard = res.send.mock.calls[0][0];
        const contributedTo = Number(
          extractStatValue(renderedCard, "contribs"),
        );
        samples.push({
          ...metrics,
          wallMs,
          contributedTo,
          fallback: contributedTo === stats.contributedTo,
        });
      },
      { runs, warmup: 0 },
    );
  } finally {
    restoreEnvValue("ALL_TIME_CONTRIBS", originalEnv.ALL_TIME_CONTRIBS);
    restoreEnvValue(
      "ALL_TIME_CONTRIBS_CONCURRENCY",
      originalEnv.ALL_TIME_CONTRIBS_CONCURRENCY,
    );
    restoreEnvValue(
      "ALL_TIME_CONTRIBS_TIMEOUT_MS",
      originalEnv.ALL_TIME_CONTRIBS_TIMEOUT_MS,
    );
    restoreEnvValue(
      "ALL_TIME_CONTRIBS_REQUEST_BUDGET_MS",
      originalEnv.ALL_TIME_CONTRIBS_REQUEST_BUDGET_MS,
    );
    restoreEnvValue(
      "ALL_TIME_CONTRIBS_SAFETY_MARGIN_MS",
      originalEnv.ALL_TIME_CONTRIBS_SAFETY_MARGIN_MS,
    );
    restoreEnvValue(
      "ALL_TIME_CONTRIBS_MIN_TIMEOUT_MS",
      originalEnv.ALL_TIME_CONTRIBS_MIN_TIMEOUT_MS,
    );
  }

  const graphQLCalls = samples.map((sample) => sample.graphQLCalls);
  const yearlyCalls = samples.map((sample) => sample.yearlyContributionCalls);
  const walls = samples.map((sample) => sample.wallMs);
  const fallbackCount = samples.filter((sample) => sample.fallback).length;
  const maxWallMs = Math.max(...walls);
  const underBudget = maxWallMs < 10_000;

  console.log(
    `${name} metrics | graphQLCalls avg=${average(graphQLCalls).toFixed(
      1,
    )} min=${Math.min(...graphQLCalls)} max=${Math.max(
      ...graphQLCalls,
    )} yearlyCalls avg=${average(yearlyCalls).toFixed(1)} fallback=${fallbackCount}/${
      samples.length
    } maxWall=${formatMs(maxWallMs)} under10s=${underBudget}`,
  );

  if (expectedFallback !== undefined) {
    expect(fallbackCount).toBe(expectedFallback ? samples.length : 0);
  }
  if (assertUnderBudget) {
    expect(underBudget).toBe(true);
  }
};

it("test /api", async () => {
  await benchApi("test /api", {}, mockStatsResponse);
});

it("test /api include_all_commits", async () => {
  await benchApi(
    "test /api include_all_commits",
    { include_all_commits: "true" },
    mockStatsWithTotalCommitsResponse,
  );
});

it("test /api include_all_commits delayed upstreams", async () => {
  await benchApi(
    "test /api include_all_commits delayed upstreams",
    { include_all_commits: "true" },
    mockDelayedStatsWithTotalCommitsResponse,
    LATENCY_BENCH_OPTIONS,
  );
});

it("test /api include_all_commits GraphQL error starts REST", async () => {
  const { getRestCalls } = mockStatsErrorWithTotalCommitsResponse();
  const { req, res } = faker({ include_all_commits: "true" });

  await api(req, res);

  console.log(
    `test /api include_all_commits GraphQL error starts REST | restCalls=${getRestCalls()}`,
  );

  expect(getRestCalls()).toBe(1);
});

it("test /api all_time_contribs 1 contribution year", async () => {
  await benchAllTimeApi("test /api all_time_contribs 1 year", {
    yearCount: 1,
    expectedFallback: false,
  });
});

it("test /api all_time_contribs 5 contribution years", async () => {
  await benchAllTimeApi("test /api all_time_contribs 5 years", {
    yearCount: 5,
    expectedFallback: false,
  });
});

it("test /api all_time_contribs 10 contribution years", async () => {
  await benchAllTimeApi("test /api all_time_contribs 10 years", {
    yearCount: 10,
    expectedFallback: false,
  });
});

it("test /api all_time_contribs 15+ contribution years", async () => {
  await benchAllTimeApi("test /api all_time_contribs 16 years", {
    yearCount: 16,
    expectedFallback: false,
  });
});

it("test /api all_time_contribs delayed serverless budget", async () => {
  await benchAllTimeApi("test /api all_time_contribs delayed budget", {
    yearCount: 16,
    baseDelayMs: 500,
    yearlyDelayMs: 3500,
    runs: 1,
    assertUnderBudget: true,
    expectedFallback: true,
  });
});

it("test /api all_time_contribs timeout fallback", async () => {
  await benchAllTimeApi("test /api all_time_contribs timeout fallback", {
    yearCount: 10,
    contributionYearsDelayMs: 200,
    timeoutMs: "100",
    runs: 3,
    expectedFallback: true,
  });
});
