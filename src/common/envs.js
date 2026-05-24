// @ts-check

const whitelist = process.env.WHITELIST
  ? process.env.WHITELIST.split(",")
  : undefined;

const gistWhitelist = process.env.GIST_WHITELIST
  ? process.env.GIST_WHITELIST.split(",")
  : undefined;

const parseIntegerEnv = (key, fallback) => {
  const value = parseInt(process.env[key] || String(fallback), 10);
  return isNaN(value) ? fallback : value;
};

/**
 * Whether the all-time contributions feature is enabled.
 * Defaults to true if not explicitly set to "false".
 * Set ALL_TIME_CONTRIBS=false to disable the feature entirely.
 * @returns {boolean} True when all-time contributions are enabled.
 */
const isAllTimeContribsEnabled = () =>
  process.env.ALL_TIME_CONTRIBS !== "false";

/**
 * Timeout for all-time contributions fetch in milliseconds.
 * Defaults to 9000ms (9 seconds) to stay within Vercel's 10s limit.
 * @returns {number} Timeout in milliseconds.
 */
const getAllTimeContribsTimeoutMs = () =>
  parseIntegerEnv("ALL_TIME_CONTRIBS_TIMEOUT_MS", 9000);

/**
 * Total request-time budget reserved for the stats card serverless function.
 * Defaults to Vercel's configured 10s maxDuration.
 * @returns {number} Request budget in milliseconds.
 */
const getAllTimeContribsRequestBudgetMs = () =>
  parseIntegerEnv("ALL_TIME_CONTRIBS_REQUEST_BUDGET_MS", 10_000);

/**
 * Safety margin kept free before the serverless request budget is exhausted.
 * @returns {number} Safety margin in milliseconds.
 */
const getAllTimeContribsSafetyMarginMs = () =>
  parseIntegerEnv("ALL_TIME_CONTRIBS_SAFETY_MARGIN_MS", 1000);

/**
 * Minimum remaining safe budget required before starting all-time contributions.
 * @returns {number} Minimum budget in milliseconds.
 */
const getAllTimeContribsMinTimeoutMs = () =>
  parseIntegerEnv("ALL_TIME_CONTRIBS_MIN_TIMEOUT_MS", 250);

/**
 * Maximum concurrent year fetches for all-time contributions.
 * Limits parallel API requests to avoid rate limiting.
 * Defaults to 3 concurrent requests.
 * @returns {number} Max concurrent year fetches.
 */
const getAllTimeContribsConcurrency = () =>
  parseIntegerEnv("ALL_TIME_CONTRIBS_CONCURRENCY", 3);

const excludeRepositories = process.env.EXCLUDE_REPO
  ? process.env.EXCLUDE_REPO.split(",")
  : [];

export {
  whitelist,
  gistWhitelist,
  excludeRepositories,
  isAllTimeContribsEnabled,
  getAllTimeContribsTimeoutMs,
  getAllTimeContribsRequestBudgetMs,
  getAllTimeContribsSafetyMarginMs,
  getAllTimeContribsMinTimeoutMs,
  getAllTimeContribsConcurrency,
};
