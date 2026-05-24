import { it } from "@jest/globals";
import { renderRepoCard } from "../../src/cards/repo.js";
import { renderStatsCard } from "../../src/cards/stats.js";
import { renderTopLanguages } from "../../src/cards/top-languages.js";
import { renderWakatimeCard } from "../../src/cards/wakatime.js";
import { runAndLogStats } from "./utils.js";

const languageFixtures = [
  { color: "#3178c6", name: "TypeScript" },
  { color: "#f1e05a", name: "JavaScript" },
  { color: "#3572A5", name: "Python" },
  { color: "#00ADD8", name: "Go" },
  { color: "#dea584", name: "Rust" },
  { color: "#701516", name: "Ruby" },
  { color: "#e34c26", name: "HTML" },
  { color: "#563d7c", name: "CSS" },
  { color: "#b07219", name: "Java" },
  { color: "#89e051", name: "Shell" },
  { color: "#555555", name: "C" },
  { color: "#f34b7d", name: "C++" },
  { color: "#178600", name: "C#" },
  { color: "#A97BFF", name: "Kotlin" },
  { color: "#ffac45", name: "Swift" },
  { color: "#00B4AB", name: "Dart" },
  { color: "#4F5D95", name: "PHP" },
  { color: "#384d54", name: "Dockerfile" },
  { color: "#427819", name: "Makefile" },
  { color: "#438eff", name: "Objective-C" },
  { color: "#db5855", name: "Scala" },
  { color: "#c22d40", name: "R" },
  { color: "#DA5B0B", name: "Jupyter Notebook" },
  { color: "#60B5CC", name: "Julia" },
  { color: "#244776", name: "PowerShell" },
];

const topLanguages = Object.fromEntries(
  languageFixtures.slice(0, 20).map((language, index) => [
    language.name,
    {
      ...language,
      size: (20 - index) * 100_000,
    },
  ]),
);

const stats = {
  name: "Benchmark User",
  totalStars: 987654,
  totalCommits: 123456,
  totalIssues: 23456,
  totalPRs: 34567,
  totalPRsMerged: 31234,
  mergedPRsPercentage: 90.36,
  totalReviews: 45678,
  totalDiscussionsStarted: 1234,
  totalDiscussionsAnswered: 5678,
  contributedTo: 9876,
  rank: { level: "A+", percentile: 4.2 },
};

const largeShowList = [
  "reviews",
  "discussions_started",
  "discussions_answered",
  "prs_merged",
  "prs_merged_percentage",
  ...Array.from({ length: 40 }, (_, index) => `unused_metric_${index + 1}`),
];

const repo = {
  name: "emoji-heavy-rendering-benchmark-repository",
  nameWithOwner: "benchmark-user/emoji-heavy-rendering-benchmark-repository",
  description:
    "Build :rocket: ship :sparkles: measure :zap: review :fire: document :memo: test :white_check_mark: refactor :recycle: deploy :package: observe :mag: repeat :repeat: across a deliberately long project description with many emoji aliases.",
  primaryLanguage: {
    color: "#3178c6",
    id: "MDg6TGFuZ3VhZ2UyODc=",
    name: "TypeScript",
  },
  isArchived: false,
  isTemplate: false,
  starCount: 123456,
  forkCount: 7890,
};

const wakatimeStats = {
  is_coding_activity_visible: true,
  is_other_usage_visible: true,
  languages: languageFixtures.map((language, index) => ({
    digital: `${index + 1}:00`,
    hours: index + 1,
    minutes: 1,
    name: language.name,
    percent: 4,
    text: `${index + 1} hrs 1 min`,
    total_seconds: (index + 1) * 3660,
  })),
  range: "last_7_days",
};

it("renderTopLanguages default layout with 20 languages", async () => {
  await runAndLogStats("renderTopLanguages default 20 languages", () => {
    renderTopLanguages(topLanguages, { langs_count: 20 });
  });
});

it("renderTopLanguages compact layout with 20 languages", async () => {
  await runAndLogStats("renderTopLanguages compact 20 languages", () => {
    renderTopLanguages(topLanguages, { layout: "compact", langs_count: 20 });
  });
});

it("renderTopLanguages donut layout with 20 languages", async () => {
  await runAndLogStats("renderTopLanguages donut 20 languages", () => {
    renderTopLanguages(topLanguages, { layout: "donut", langs_count: 20 });
  });
});

it("renderTopLanguages pie layout with 20 languages", async () => {
  await runAndLogStats("renderTopLanguages pie 20 languages", () => {
    renderTopLanguages(topLanguages, { layout: "pie", langs_count: 20 });
  });
});

it("renderStatsCard with large show list and long custom title", async () => {
  await runAndLogStats(
    "renderStatsCard large show list long custom title",
    () => {
      renderStatsCard(stats, {
        all_time_contribs: true,
        custom_title:
          "Benchmark User's Long Running Contribution Telemetry Across Public Repositories and Reviews",
        hide_rank: true,
        include_all_commits: true,
        show: largeShowList,
        show_icons: true,
      });
    },
  );
});

it("renderRepoCard with long emoji-heavy description", async () => {
  await runAndLogStats("renderRepoCard long emoji-heavy description", () => {
    renderRepoCard(repo, { description_lines_count: 3, show_owner: true });
  });
});

it("renderWakatimeCard compact layout with many languages", async () => {
  await runAndLogStats("renderWakatimeCard compact many languages", () => {
    renderWakatimeCard(wakatimeStats, {
      card_width: 700,
      langs_count: wakatimeStats.languages.length,
      layout: "compact",
    });
  });
});
