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

/**
 * @typedef {(variables: any, token: string) => Promise<import('axios').AxiosResponse>} Fetcher The fetcher function.
 * @typedef {{validPATs: string[], expiredPATs: string[], exhaustedPATs: string[], suspendedPATs: string[], errorPATs: string[], details: any}} PATInfo The PAT info.
 */

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

  for (const pat of PATs) {
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
        details[pat] = {
          status: "error",
          error: {
            type: errors[0].type,
            message: errors[0].message,
          },
        };
        continue;
      } else if (isRateLimited) {
        const date1 = new Date();
        const date2 = new Date(response.data?.data?.rateLimit?.resetAt);
        details[pat] = {
          status: "exhausted",
          remaining: 0,
          resetIn: dateDiff(date2, date1) + " minutes",
        };
      } else {
        details[pat] = {
          status: "valid",
          remaining: response.data.data.rateLimit.remaining,
        };
      }
    } catch (err) {
      // Store the PAT if it is expired.
      const errorMessage = err.response?.data?.message?.toLowerCase();
      if (errorMessage === "bad credentials") {
        details[pat] = {
          status: "expired",
        };
      } else if (errorMessage === "sorry. your account was suspended.") {
        details[pat] = {
          status: "suspended",
        };
      } else {
        throw err;
      }
    }
  }

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
