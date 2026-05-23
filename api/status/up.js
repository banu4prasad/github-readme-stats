// @ts-check

/**
 * @file Contains a simple public cloud function that can be used to check if the
 * deployment is responding.
 *
 * @description This function is currently rate limited to 1 request per 5 minutes.
 */

import { logger } from "../../src/common/log.js";
import { getQueryParams } from "../../src/common/query.js";

export const RATE_LIMIT_SECONDS = 60 * 5; // 1 request per 5 minutes

/**
 * @typedef {{
 *  schemaVersion: number;
 *  label: string;
 *  message: "up" | "down";
 *  color: "brightgreen" | "red";
 *  isError: boolean
 * }} ShieldsResponse Shields.io response object.
 */

/**
 * Creates Json response that can be used for shields.io dynamic card generation.
 *
 * @param {boolean} up Whether the deployment is up or not.
 * @returns {ShieldsResponse}  Dynamic shields.io JSON response object.
 *
 * @see https://shields.io/endpoint.
 */
const shieldsUptimeBadge = (up) => {
  const schemaVersion = 1;
  const isError = true;
  const label = "Public Instance";
  const message = up ? "up" : "down";
  const color = up ? "brightgreen" : "red";
  return {
    schemaVersion,
    label,
    message,
    color,
    isError,
  };
};

/**
 * Cloud function that returns whether the deployment is responding.
 *
 * @param {any} req The request.
 * @param {any} res The response.
 * @returns {Promise<void>} Nothing.
 */
export default async (req, res) => {
  let { type } = getQueryParams(req);
  type = typeof type === "string" ? type.toLowerCase() : "json";

  res.setHeader("Content-Type", "application/json");

  try {
    res.setHeader("Cache-Control", `max-age=0, s-maxage=${RATE_LIMIT_SECONDS}`);

    switch (type) {
      case "shields":
        res.send(shieldsUptimeBadge(true));
        break;
      case "json":
        res.send({ up: true });
        break;
      case "boolean":
        res.send(true);
        break;
      default:
        res.send({ up: true });
        break;
    }
  } catch (err) {
    // Return fail boolean if something went wrong.
    logger.error(err);
    res.setHeader("Cache-Control", "no-store");
    res.json({ up: false });
  }
};
