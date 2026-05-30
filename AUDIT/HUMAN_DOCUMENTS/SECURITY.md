# Security Audit

**Confidence Level:** [HIGH]

## Vulnerability Scans (`npm audit`)
As detailed in the `DEPENDENCIES_AND_ENV.md`, the project currently has **16 known NPM vulnerabilities (6 High, 10 Moderate)**.
*   **Primary concern:** The `axios` dependency contains multiple severe vulnerabilities including SSRF and Prototype Pollution. Because this application fetches data based on user-provided usernames, ensuring the HTTP client is secure against malicious redirects or forged requests is paramount.
*   **Mitigation:** Run `npm audit fix`.

## Cross-Site Scripting (XSS) Prevention
The application generates raw SVG strings and injects user-provided data (e.g., usernames, repository descriptions fetched from GitHub).
*   **Protection:** The project correctly mitigates this risk by passing dynamic strings through an `encodeHTML` utility function found in `src/common/html.js`.
*   **Rule:** Maintainers must ensure that text/URLs passed to central rendering functions (like `renderError`) are passed as raw strings (e.g., `&`) and not pre-escaped (`&amp;`) to avoid double-escaping, as the system handles escaping centrally.

## Secrets Management
*   The application requires GitHub Personal Access Tokens (PATs) to query the GraphQL API without hitting strict unauthenticated rate limits.
*   These are managed via environment variables (e.g., `PAT_1`). The code in `src/common/envs.js` rotates through available PATs.
*   **Finding:** Secrets are not hardcoded in the repository. They are properly injected via `.env` (locally) or Vercel Environment Variables (production).

## Denial of Service (DoS)
*   The application parses many query parameters. Care must be taken with array lengths and recursive loops.
*   *Note:* The `npm audit` flagged ReDoS (Regular Expression Denial of Service) vulnerabilities in development dependencies like `minimatch`. While mostly a concern for build tools, it highlights the need for strict input validation on the serverless functions.
*   The application limits function execution time to 10 seconds (`vercel.json`), preventing runaway processes from consuming excessive resources.