# Performance Audit

**Confidence Level:** [HIGH]

## Testing Performance
The project is extremely lightweight and fast. The Jest test suite (378 tests) runs in approximately 9-10 seconds, indicating fast code execution paths.

## Benchmarking
The repository includes a dedicated performance benchmarking suite:
*   Configured via `jest.bench.config.js`.
*   Executed using `npm run bench`.
*   Benchmarking utilities (like `runAndLogStats`) are provided in `tests/bench/utils.js`.
This demonstrates a proactive approach to maintaining fast generation times for the SVG cards.

## Caching Strategy
Because the application generates SVGs synchronously upon request and relies on external APIs, performance and rate-limiting are major concerns. The project addresses this via aggressive HTTP caching:
*   `src/common/cache.js` manages `Cache-Control` headers.
*   Cards are cached publicly (e.g., by GitHub Camo).
*   Different TTLs are applied depending on the resource type (e.g., standard stats vs. all-time contributions).
*   Errors are also explicitly cached (`setErrorCacheHeaders`) but typically with much shorter TTLs to prevent caching transient failures.

## Memory Usage
Deployed to Vercel, the functions are configured in `vercel.json` to use only **128MB** of memory. This is standard for small, stateless functions that do not load large datasets into memory, confirming the application's efficient footprint.