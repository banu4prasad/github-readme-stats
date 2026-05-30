# Observed Features

**Confidence Level:** [HIGH]

This project generates dynamic SVG images based on query parameters passed to specific API endpoints. The core features map directly to these endpoints, all implemented as Vercel serverless functions in the `api/` directory.

## 1. User Stats Card (`api/index.js`)
*   **Functionality:** Generates an SVG card displaying a GitHub user's overall statistics (Stars, Commits, PRs, Issues, Contribs).
*   **Trigger:** Access `/api?username=<username>`
*   **Implementation:**
    *   Validates parameters using `src/common/query.js`.
    *   Checks for blocklisted users via `src/common/access.js`.
    *   Fetches data using `src/fetchers/stats.js`.
    *   Renders the SVG using `src/cards/stats.js` and `src/common/render.js`.
    *   Supports vast customization via query params: `hide`, `theme`, `show_icons`, `bg_color`, `title_color`, `border_radius`, `locale`, etc.

## 2. Top Languages Card (`api/top-langs.js`)
*   **Functionality:** Generates an SVG visualizing the most used languages in a user's repositories.
*   **Trigger:** Access `/api/top-langs?username=<username>`
*   **Implementation:**
    *   Fetches repository language data via `src/fetchers/top-languages.js`.
    *   Calculates size/count weights.
    *   Renders the SVG using `src/cards/top-languages.js`.
    *   Supports layouts: `compact`, `normal`, `donut`, `donut-vertical`, `pie`.
    *   Allows hiding specific languages (`hide=html,css`) or repositories (`exclude_repo=my-repo`).

## 3. WakaTime Card (`api/wakatime.js`)
*   **Functionality:** Generates an SVG showing coding stats from WakaTime.
*   **Trigger:** Access `/api/wakatime?username=<username>`
*   **Implementation:**
    *   Fetches stats from WakaTime's API using `src/fetchers/wakatime.js`.
    *   Renders the card via `src/cards/wakatime.js`.
    *   Requires the user to have made their WakaTime stats public.

## 4. Repo Pin Card (`api/pin.js`)
*   **Functionality:** Generates a card mimicking GitHub's native pinned repository view.
*   **Trigger:** Access `/api/pin?username=<username>&repo=<repo>`
*   **Implementation:**
    *   Fetches specific repository details (stars, forks, description) via `src/fetchers/repo.js`.
    *   Renders the card via `src/cards/repo.js`.

## 5. Gist Card (`api/gist.js`)
*   **Functionality:** Generates a card displaying details for a specific GitHub Gist.
*   **Trigger:** Access `/api/gist?id=<gist_id>`
*   **Implementation:**
    *   Fetches gist data via `src/fetchers/gist.js`.
    *   Renders via `src/cards/gist.js`.

## Shared Capabilities
*   **[HIGH] Caching:** All endpoints utilize `src/common/cache.js` to set `Cache-Control` headers. The default TTL varies per card but can be overridden with the `cache_seconds` query parameter.
*   **[HIGH] Theming & Customization:** All cards support extensive styling customization (colors, borders, hiding elements) handled gracefully by the core rendering utilities.
*   **[HIGH] Internationalization (i18n):** Most cards support a `locale` parameter, translating labels via `src/translations.js` and `src/common/I18n.js`.