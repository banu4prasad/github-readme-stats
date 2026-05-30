import topLangs from "../../api/top-langs.js";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { it, jest } from "@jest/globals";
import { runAndLogStats } from "./utils.js";
import { renderTopLanguages } from "../../src/cards/top-languages.js";

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
];

const createRepoSize = (repoIndex, repoCount, languagesPerRepo) => {
  return (((repoIndex * 48271 + 1) % repoCount) + 1) * languagesPerRepo * 100;
};

const createLangSize = (langIndex, langCount) => {
  return (((langIndex * 48271 + 1) % langCount) + 1) * 100;
};

const createTopLangsData = (repoCount, languagesPerRepo) => ({
  data: {
    user: {
      repositories: {
        nodes: Array.from({ length: repoCount }, (_, repoIndex) => ({
          name: `benchmark-repo-${repoIndex + 1}`,
          size: createRepoSize(repoIndex, repoCount, languagesPerRepo),
          languages: {
            edges: languageFixtures
              .slice(0, languagesPerRepo)
              .map((language, languageIndex) => ({
                size:
                  (repoCount - repoIndex) *
                  (languagesPerRepo - languageIndex) *
                  100,
                node: language,
              })),
          },
        })),
      },
    },
  },
});

const createSyntheticTopLangs = (langCount) =>
  Object.fromEntries(
    Array.from({ length: langCount }, (_, langIndex) => {
      const name = `BenchmarkLang${langIndex + 1}`;

      return [
        name,
        {
          color: `#${((langIndex + 1) * 123456)
            .toString(16)
            .padStart(6, "0")
            .slice(0, 6)}`,
          name,
          size: createLangSize(langIndex, langCount),
        },
      ];
    }),
  );

const createEveryOtherNameList = (prefix, count) =>
  Array.from({ length: Math.floor(count / 2) }, (_, index) => {
    return `${prefix}${index * 2 + 1}`;
  });

const data_top_langs_baseline = createTopLangsData(20, 6);
const data_top_langs_heavy = createTopLangsData(100, 10);
const data_top_langs_hide_heavy = createTopLangsData(1000, 10);

const hiddenRepos = createEveryOtherNameList("benchmark-repo-", 1000);
const syntheticTopLangs20 = createSyntheticTopLangs(20);
const syntheticTopLangs100 = createSyntheticTopLangs(100);
const hiddenLangs20 = createEveryOtherNameList("BenchmarkLang", 20);
const hiddenLangs100 = createEveryOtherNameList("BenchmarkLang", 100);

const mock = new MockAdapter(axios);

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

const benchTopLangs = async (name, query, data) => {
  mock.reset();
  mock.onPost("https://api.github.com/graphql").reply(200, data);

  await runAndLogStats(name, async () => {
    const { req, res } = faker(query);

    await topLangs(req, res);
  });
};

it("test /api/top-langs baseline", async () => {
  await benchTopLangs(
    "test /api/top-langs baseline",
    {},
    data_top_langs_baseline,
  );
});

it("test /api/top-langs heavy", async () => {
  await benchTopLangs("test /api/top-langs heavy", {}, data_top_langs_heavy);
});

it("test /api/top-langs hide-heavy repos", async () => {
  await benchTopLangs(
    "test /api/top-langs hide-heavy repos",
    { exclude_repo: hiddenRepos.join(",") },
    data_top_langs_hide_heavy,
  );
});

it("test /api/top-langs donut", async () => {
  await benchTopLangs(
    "test /api/top-langs donut",
    { layout: "donut", langs_count: 10 },
    data_top_langs_heavy,
  );
});

it("test renderTopLanguages 20 langs hide-heavy", async () => {
  await runAndLogStats("test renderTopLanguages 20 langs hide-heavy", () => {
    renderTopLanguages(syntheticTopLangs20, {
      hide: hiddenLangs20,
      langs_count: 20,
    });
  });
});

it("test renderTopLanguages 100 langs hide-heavy", async () => {
  await runAndLogStats("test renderTopLanguages 100 langs hide-heavy", () => {
    renderTopLanguages(syntheticTopLangs100, {
      hide: hiddenLangs100,
      langs_count: 20,
    });
  });
});
