// @ts-check

import { CustomError } from "./error.js";
import { logger } from "./log.js";

// Script variables.

// Count the number of GitHub API tokens available.
const PATs = Object.keys(process.env).filter((key) =>
  /PAT_\d*$/.exec(key),
).length;
const RETRIES = process.env.NODE_ENV === "test" ? 7 : PATs;

/**
 * @typedef {import("axios").AxiosResponse} AxiosResponse Axios response.
 * @typedef {import("axios").AxiosRequestConfig} AxiosRequestConfig Axios request config.
 * @typedef {(variables: any, token: string, retriesForTests?: number, options?: AxiosRequestConfig) => Promise<AxiosResponse>} FetcherFunction Fetcher function.
 */

const createAbortError = () => {
  const error = new Error("Request aborted");
  error.name = "AbortError";
  return error;
};

/**
 * Try to execute the fetcher function until it succeeds or the max number of retries is reached.
 *
 * @param {FetcherFunction} fetcher The fetcher function.
 * @param {any} variables Object with arguments to pass to the fetcher function.
 * @param {number | AxiosRequestConfig} [retriesOrOptions] How many times to retry or request options.
 * @param {AxiosRequestConfig} [options] Request options when retries are provided.
 * @returns {Promise<any>} The response from the fetcher function.
 */
const retryer = async (fetcher, variables, retriesOrOptions = 0, options) => {
  const isOptionsArg =
    typeof retriesOrOptions === "object" && retriesOrOptions !== null;
  let retries = isOptionsArg ? 0 : retriesOrOptions;
  const resolvedOptions = isOptionsArg ? retriesOrOptions : options;
  const signal = resolvedOptions?.signal;

  if (!RETRIES) {
    throw new CustomError("No GitHub API tokens found", CustomError.NO_TOKENS);
  }

  if (retries > RETRIES) {
    throw new CustomError(
      "Downtime due to GitHub API rate limiting",
      CustomError.MAX_RETRY,
    );
  }

  if (signal?.aborted) {
    throw createAbortError();
  }

  try {
    // try to fetch with the first token since RETRIES is 0 index i'm adding +1
    let response = await fetcher(
      variables,
      // @ts-ignore
      process.env[`PAT_${retries + 1}`],
      // used in tests for faking rate limit
      retries,
      resolvedOptions,
    );

    // react on both type and message-based rate-limit signals.
    // https://github.com/anuraghazra/github-readme-stats/issues/4425
    const errors = response?.data?.errors;
    const errorType = errors?.[0]?.type;
    const errorMsg = errors?.[0]?.message || "";
    const isRateLimited =
      (errors && errorType === "RATE_LIMITED") || /rate limit/i.test(errorMsg);

    // if rate limit is hit increase the RETRIES and recursively call the retryer
    // with username, and current RETRIES
    if (isRateLimited) {
      logger.log(`PAT_${retries + 1} Failed`);
      retries++;
      if (signal?.aborted) {
        throw createAbortError();
      }
      // directly return from the function
      return retryer(fetcher, variables, retries, resolvedOptions);
    }

    // finally return the response
    return response;
  } catch (err) {
    /** @type {any} */
    const e = err;

    if (signal?.aborted) {
      throw createAbortError();
    }

    // network/unexpected error → let caller treat as failure
    if (!e?.response) {
      throw e;
    }

    // prettier-ignore
    // also checking for bad credentials if any tokens gets invalidated
    const isBadCredential =
      e?.response?.data?.message === "Bad credentials";
    const isAccountSuspended =
      e?.response?.data?.message === "Sorry. Your account was suspended.";

    if (isBadCredential || isAccountSuspended) {
      logger.log(`PAT_${retries + 1} Failed`);
      retries++;
      if (signal?.aborted) {
        throw createAbortError();
      }
      // directly return from the function
      return retryer(fetcher, variables, retries, resolvedOptions);
    }

    // HTTP error with a response → return it for caller-side handling
    return e.response;
  }
};

export { retryer, RETRIES };
export default retryer;
