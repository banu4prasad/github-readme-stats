// @ts-check

import axios from "axios";

/**
 * Send GraphQL request to GitHub API.
 *
 * @param {import('axios').AxiosRequestConfig['data']} data Request data.
 * @param {import('axios').AxiosRequestConfig['headers']} headers Request headers.
 * @param {import('axios').AxiosRequestConfig} [options] Optional axios config (e.g., signal).
 * @returns {Promise<any>} Request response.
 */
const request = (data, headers, options = {}) => {
  return axios({
    url: "https://api.github.com/graphql",
    method: "post",
    headers,
    data,
    signal: options.signal,
  });
};

export { request };
