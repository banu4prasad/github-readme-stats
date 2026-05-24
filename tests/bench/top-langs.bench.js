import topLangs from "../../api/top-langs.js";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { it, jest } from "@jest/globals";
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
];

const createTopLangsData = (repoCount, languagesPerRepo) => ({
  data: {
    user: {
      repositories: {
        nodes: Array.from({ length: repoCount }, (_, repoIndex) => ({
          name: `benchmark-repo-${repoIndex + 1}`,
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

const data_top_langs_baseline = createTopLangsData(20, 6);
const data_top_langs_heavy = createTopLangsData(100, 10);

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

it("test /api/top-langs donut", async () => {
  await benchTopLangs(
    "test /api/top-langs donut",
    { layout: "donut", langs_count: 10 },
    data_top_langs_heavy,
  );
});
