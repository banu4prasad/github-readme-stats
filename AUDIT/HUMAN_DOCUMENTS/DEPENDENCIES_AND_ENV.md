# Dependencies and Environment

**Confidence Level:** [HIGH]

## Environment Setup
*   **Language:** JavaScript (Node.js)
*   **Node.js Engine Requirement:** `package.json` specifies `"node": "24"`. Running commands with Node v22 yields `EBADENGINE` warnings.
*   **Module Type:** ES Modules (`"type": "module"` in `package.json`).
*   **Test Runner:** Jest, executed with the `--experimental-vm-modules` flag to support ES Modules.

## Key Dependencies (from `package.json`)
*   **`axios` (^1.13.1):** Used for making HTTP requests (e.g., to the GitHub and WakaTime APIs). *Note: Currently flagged in `npm audit` for severe vulnerabilities.*
*   **`dotenv` (^17.2.3):** Loads environment variables from a `.env` file during local development.
*   **`github-username-regex` (^1.0.0):** Validates GitHub usernames.
*   **`word-wrap` (^1.2.5):** Used in SVG rendering to wrap long text (like repository descriptions).

## Key DevDependencies
*   **`jest` (^30.2.0):** The primary testing framework.
*   **`eslint` (^9.39.2) & `prettier` (^3.7.3):** For code linting and formatting.
*   **`husky` (^9.1.7) & `lint-staged` (^16.2.7):** Used for pre-commit hooks.
*   **`axios-mock-adapter` (^2.1.0):** Heavily utilized in the test suite to mock external API calls.
*   **`@actions/github` and `@actions/core`:** Used for custom GitHub Actions scripts.

## Dependency Security Audit (`npm audit`)
Running `npm audit` reveals **16 vulnerabilities (10 moderate, 6 high)**.

**Critical Findings:**
*   **[HIGH] `axios`:** Multiple vulnerabilities including Server-Side Request Forgery (SSRF) bypasses (CVE-2025-62718), Prototype Pollution, and CRLF Injection.
*   **[HIGH] `undici` (via `@actions/github`):** Unbounded decompression chains leading to resource exhaustion, and HTTP Request Smuggling.
*   **[HIGH] `minimatch` / `picomatch` / `path-to-regexp`:** Various Regular Expression Denial of Service (ReDoS) vulnerabilities.

**Action Required:**
Running `npm audit fix` is strongly recommended to resolve the majority of these issues. Some fixes (like updating `undici` via `@actions/github`) may require `--force` and introduce breaking changes in development scripts.