# Architecture

**Confidence Level:** [HIGH]

## System Design
GitHub Readme Stats operates as a serverless, stateless application designed to generate SVG images on the fly. It acts as a middleman between a user viewing a GitHub `README.md` and the GitHub API.

### Diagram

```text
[User Viewer / GitHub Camo]
        |
        | (HTTP GET request for image, e.g., /api?username=foo)
        v
[Vercel Edge/Serverless Functions]
        |
        |--- 1. Parse & Validate Request (`src/common/query.js`, `src/common/access.js`)
        |
        |--- 2. Fetch Data (External APIs)
        |       |---> GitHub GraphQL API (`src/fetchers/stats.js`, `src/fetchers/top-languages.js`)
        |       |---> GitHub REST API (`src/fetchers/repo.js`, `src/fetchers/gist.js`)
        |       |---> WakaTime API (`src/fetchers/wakatime.js`)
        |
        |--- 3. Calculate & Process Data (`src/calculateRank.js`)
        |
        |--- 4. Render SVG (`src/cards/*.js`, `src/common/render.js`, `src/common/html.js`)
        |
        |--- 5. Set Cache Headers (`src/common/cache.js`)
        v
[Return HTTP 200 with Content-Type: image/svg+xml]
```

## Key Architectural Decisions

1.  **Serverless (Vercel):** The app is deployed on Vercel. `vercel.json` configures the `/api` directory to be treated as serverless functions.
    ```json
    {
      "functions": {
        "api/*.js": {
          "memory": 128,
          "maxDuration": 10
        }
      }
    }
    ```
    This allows the application to scale instantly with traffic. The 128MB memory limit is sufficient as the app primarily processes JSON and generates strings (SVGs).
2.  **Statelessness:** The application stores no persistent user data. All configuration is passed via query parameters in the URL.
3.  **Aggressive Caching:** To avoid rate-limiting from the GitHub API and to serve images quickly, the app relies on setting HTTP `Cache-Control` headers (`public, max-age=...`). GitHub's image proxy (Camo) caches the images based on these headers.
4.  **Raw SVG Rendering:** The app does not use a virtual DOM or complex charting library. It generates raw SVG strings dynamically by interpolating data into templates using template literals (in `src/common/render.js` and `src/cards/`).
5.  **Security (XSS Prevention):** Because user-provided data (like repository descriptions) is rendered directly into the SVG, the app centralizes escaping. All text is passed through an `encodeHTML` utility (in `src/common/html.js`) before being inserted into the SVG to prevent XSS.