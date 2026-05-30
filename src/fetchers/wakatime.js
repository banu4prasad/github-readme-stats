// @ts-check

import axios from "axios";
import { CustomError, MissingParamError } from "../common/error.js";

const DEFAULT_WAKATIME_API_DOMAIN = "wakatime.com";
const ALLOWED_WAKATIME_API_DOMAINS = new Set([DEFAULT_WAKATIME_API_DOMAIN]);
const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Validate and normalize the WakaTime-compatible API domain.
 *
 * @param {unknown} api_domain User-provided API domain.
 * @returns {string} Safe API domain.
 */
const getWakatimeApiDomain = (api_domain) => {
  if (api_domain === undefined || api_domain === null) {
    return DEFAULT_WAKATIME_API_DOMAIN;
  }

  if (typeof api_domain !== "string") {
    throw new CustomError("Invalid WakaTime API domain", "WAKATIME_ERROR");
  }

  const normalizedDomain = api_domain.toLowerCase();
  const labels = normalizedDomain.split(".");
  const isValidDomain =
    normalizedDomain === api_domain.trim().toLowerCase() &&
    labels.length > 1 &&
    labels.every((label) => DOMAIN_LABEL_REGEX.test(label));

  if (!isValidDomain || !ALLOWED_WAKATIME_API_DOMAINS.has(normalizedDomain)) {
    throw new CustomError("Invalid WakaTime API domain", "WAKATIME_ERROR");
  }

  return normalizedDomain;
};

/**
 * WakaTime data fetcher.
 *
 * @param {{username: string, api_domain?: string }} props Fetcher props.
 * @returns {Promise<import("./types").WakaTimeData>} WakaTime data response.
 */
const fetchWakatimeStats = async ({ username, api_domain }) => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }

  const apiDomain = getWakatimeApiDomain(api_domain);

  try {
    const { data } = await axios.get(
      `https://${apiDomain}/api/v1/users/${username}/stats?is_including_today=true`,
    );

    return data.data;
  } catch (err) {
    if (
      axios.isAxiosError(err) &&
      err.response &&
      (err.response.status < 200 || err.response.status > 299)
    ) {
      throw new CustomError(
        `Could not resolve to a User with the login of '${username}'`,
        "WAKATIME_USER_NOT_FOUND",
      );
    }
    throw err;
  }
};

export { fetchWakatimeStats };
export default fetchWakatimeStats;
