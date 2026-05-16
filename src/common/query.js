// @ts-check

/**
 * Parse query params from a Node request without using req.query in production.
 * Falls back to req.query for test mocks that omit req.url.
 * @param {{ url?: string, query?: Record<string, string | string[] | number | boolean | null | undefined> }} req Incoming request.
 * @returns {Record<string, string | string[] | number | boolean>} Query params.
 */
const getQueryParams = (req) => {
  /** @type {Record<string, string | string[] | number | boolean>} */
  const params = Object.create(null);

  if (req?.url) {
    const url = new URL(req.url, "http://localhost");
    for (const [key, value] of url.searchParams) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        params[key] = `${params[key]},${value}`;
      } else {
        params[key] = value;
      }
    }
    return params;
  }

  if (req?.query && typeof req.query === "object") {
    for (const [key, value] of Object.entries(req.query)) {
      if (value === undefined || value === null) {
        continue;
      }
      params[key] = value;
    }
  }

  return params;
};

export { getQueryParams };
