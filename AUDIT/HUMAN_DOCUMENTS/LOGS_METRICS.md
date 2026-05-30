# Logs and Metrics

**Confidence Level:** [HIGH]

## Logging Strategy
The application implements a very basic logging utility in `src/common/log.js`.

```javascript
const noop = () => {};
const logger = process.env.NODE_ENV === "test" ? { log: noop, error: noop } : console;
export { logger };
```

*   **Behavior:** In a test environment, all logs are suppressed (no-op) to keep test output clean. In production/development, it falls back to the standard Node.js `console.log` and `console.error`.
*   **Observability:** Because the app is hosted on Vercel as serverless functions, these standard `console` outputs are captured and viewable within the Vercel dashboard's deployment logs.
*   **Metrics:** There is no dedicated metrics infrastructure (like Prometheus or Datadog) currently configured in the codebase. Reliance is entirely on Vercel's built-in execution metrics.