import api from "../../api/index.js";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { expect, it, jest } from "@jest/globals";
import { runAndLogStats } from "./utils.js";

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
