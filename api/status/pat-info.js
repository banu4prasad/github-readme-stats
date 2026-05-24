// @ts-check

/**
 * @file Contains a protected cloud function that can be used to check which PATs are no
 * longer working. It returns a list of valid PATs, expired PATs and PATs with errors.
 *
 * @description This function requires an admin secret and responses are not cached.
 */

import { request } from "../../src/common/http.js";
import { logger } from "../../src/common/log.js";
import { dateDiff } from "../../src/common/ops.js";

export const ADMIN_SECRET_HEADER = "x-status-admin-secret";

/**
 * Simple uptime check fetcher for the PATs.
 *
 * @param {any} variables Fetcher variables.
 * @param {string} token GitHub token.
 * @returns {Promise<import('axios').AxiosResponse>} The response.
 */
const uptimeFetcher = (variables, token) => {
  return request(
    {
      query: `
        query {
          rateLimit {
            remaining
            resetAt
          },
        }`,
      variables,
    },
    {
      Authorization: `bearer ${token}`,
    },
  );
};

/**
 * @param {any} req The request.
 * @param {string} name Header name.
 * @returns {string | undefined} Header value.
 */
const getHeader = (req, name) => {
  const headers = req?.headers || {};
  const headerName = Object.keys(headers).find(
    (key) => key.toLowerCase() === name,
  );
  const value = headerName ? headers[headerName] : undefined;

  return Array.isArray(value) ? value[0] : value;
};

/**
 * @param {any} req The request.
 * @returns {boolean} Whether the request can access PAT health details.
 */
const hasAdminAccess = (req) => {
  const secret = process.env.STATUS_ADMIN_SECRET;
  const headerSecret = getHeader(req, ADMIN_SECRET_HEADER);
  const authorization = getHeader(req, "authorization");

  return Boolean(
    secret && (headerSecret === secret || authorization === `Bearer ${secret}`),
  );
};

const getAllPATs = () => {
  return Object.keys(process.env).filter((key) => /PAT_\d*$/.exec(key));
};

const PAT_CHECK_CONCURRENCY = 3;

/**
 * @typedef {(variables: any, token: string) => Promise<import('axios').AxiosResponse>} Fetcher The fetcher function.
 * @typedef {{validPATs: string[], expiredPATs: string[], exhaustedPATs: string[], suspendedPATs: string[], errorPATs: string[], details: any}} PATInfo The PAT info.
 */

/**
 * Check a single PAT status.
 *
 * @param {Fetcher} fetcher The fetcher function.
 * @param {any} variables Fetcher variables.
 * @param {string} pat The PAT environment variable name.
 * @returns {Promise<any>} The PAT status details.
 */
const getPATDetails = async (fetcher, variables, pat) => {
  try {
    const response = await fetcher(variables, process.env[pat]);
    const errors = response.data.errors;
    const hasErrors = Boolean(errors);
    const errorType = errors?.[0]?.type;
    const isRateLimited =
      (hasErrors && errorType === "RATE_LIMITED") ||
      response.data.data?.rateLimit?.remaining === 0;

    // Store PATs with errors.
    if (hasErrors && errorType !== "RATE_LIMITED") {
      return {
        status: "error",
        error: {
          type: errors[0].type,
          message: errors[0].message,
        },
      };
    } else if (isRateLimited) {
      const date1 = new Date();
      const date2 = new Date(response.data?.data?.rateLimit?.resetAt);
      return {
        status: "exhausted",
        remaining: 0,
        resetIn: dateDiff(date2, date1) + " minutes",
      };
    } else {
      return {
        status: "valid",
        remaining: response.data.data.rateLimit.remaining,
      };
    }
  } catch (err) {
    // Store the PAT if it is expired.
    const errorMessage = err.response?.data?.message?.toLowerCase();
    if (errorMessage === "bad credentials") {
      return {
        status: "expired",
      };
    } else if (errorMessage === "sorry. your account was suspended.") {
      return {
        status: "suspended",
      };
    } else {
      throw err;
    }
  }
};

/**
 * Check PAT statuses with a small concurrency limit.
 *
 * @param {Fetcher} fetcher The fetcher function.
 * @param {any} variables Fetcher variables.
 * @param {string[]} PATs The PAT environment variable names.
 * @returns {Promise<any[]>} The PAT status details in PAT order.
 */
const getPATDetailsWithConcurrency = async (fetcher, variables, PATs) => {
  const details = Array(PATs.length);
  const errors = Array(PATs.length);
  let hasUnexpectedError = false;
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(PAT_CHECK_CONCURRENCY, PATs.length) },
    async () => {
      while (!hasUnexpectedError && nextIndex < PATs.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        try {
          details[currentIndex] = await getPATDetails(
            fetcher,
            variables,
            PATs[currentIndex],
          );
        } catch (err) {
          errors[currentIndex] = err;
          hasUnexpectedError = true;
        }
      }
    },
  );

  await Promise.all(workers);
  const unexpectedErrorIndex = errors.findIndex((_, index) => index in errors);

  if (unexpectedErrorIndex !== -1) {
    throw errors[unexpectedErrorIndex];
  }

  return details;
};

/**
 * Check whether any of the PATs is expired.
 *
 * @param {Fetcher} fetcher The fetcher function.
 * @param {any} variables Fetcher variables.
 * @returns {Promise<PATInfo>} The response.
 */
const getPATInfo = async (fetcher, variables) => {
  /** @type {Record<string, any>} */
  const details = {};
  const PATs = getAllPATs();
  const PATDetails = await getPATDetailsWithConcurrency(
    fetcher,
    variables,
    PATs,
  );

  PATs.forEach((pat, index) => {
    details[pat] = PATDetails[index];
  });

  const filterPATsByStatus = (status) => {
    return Object.keys(details).filter((pat) => details[pat].status === status);
  };

  const sortedDetails = Object.keys(details)
    .sort()
    .reduce((obj, key) => {
      obj[key] = details[key];
      return obj;
    }, {});

  return {
    validPATs: filterPATsByStatus("valid"),
    expiredPATs: filterPATsByStatus("expired"),
    exhaustedPATs: filterPATsByStatus("exhausted"),
    suspendedPATs: filterPATsByStatus("suspended"),
    errorPATs: filterPATsByStatus("error"),
    details: sortedDetails,
  };
};

/**
 * Cloud function that returns information about the used PATs.
 *
 * @param {any} req The request.
 * @param {any} res The response.
 * @returns {Promise<void>} The response.
 */
export default async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (!hasAdminAccess(req)) {
    res.statusCode = 401;
    res.setHeader("Cache-Control", "no-store");
    res.send({ error: "Unauthorized" });
    return;
  }

  try {
    const PATsInfo = await getPATInfo(uptimeFetcher, {});
    res.setHeader("Cache-Control", "no-store");
    res.send(JSON.stringify(PATsInfo, null, 2));
  } catch (err) {
    // Throw error if something went wrong.
    logger.error(err);
    res.setHeader("Cache-Control", "no-store");
    res.json({ error: "Something went wrong: " + err.message });
  }
};
