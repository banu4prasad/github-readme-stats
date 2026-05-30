# CI/CD and Tests Audit

**Confidence Level:** [HIGH]

## Testing Strategy
The project employs Jest as its primary testing framework.
*   **Unit Tests:** Extensive coverage in the `tests/` directory.
*   **Test Commands:**
    *   `npm run test`: Runs the test suite with coverage reporting.
    *   `npm run test:e2e`: Runs end-to-end tests using `jest.e2e.config.js`.
    *   `npm run bench`: Runs the performance benchmarks.
*   **Environment Configuration:** Tests must run with `--experimental-vm-modules` because the project uses ES Modules.
*   **Mocking:** Network requests to external APIs (GitHub, WakaTime) are mocked in tests using `axios-mock-adapter`.

## Continuous Integration (CI)
The project uses GitHub Actions for CI/CD, located in `.github/workflows/`.

*   **`test.yml`:** The primary workflow, triggered on `push` and `pull_request` to the `master` branch.
    *   It tests against Node version `22.x` (Note: `package.json` specifies engine 24, which is a discrepancy).
    *   Runs `npm ci`, `npm run test`, `npm run lint`, `npm run bench`, and `npm run format:check`.
    *   Uploads coverage reports to Codecov.
*   **Other Workflows:** Include automated issue closers, PR labelers, and security analyses (CodeQL, OpenSSF).

## Suggestions for Improvement
1.  **Node Version Alignment:** Update `.github/workflows/test.yml` to test against Node.js `24.x` to align with the `engines` field in `package.json`. Testing on v22 while requiring v24 can mask runtime issues.
2.  **Automated Security Fixes:** Incorporate `npm audit` into the CI pipeline to fail the build if high-severity vulnerabilities are introduced.