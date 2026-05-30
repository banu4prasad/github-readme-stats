# API Specification

**Confidence Level:** [HIGH]

The application exposes the following endpoints, all of which return `image/svg+xml`.

## Base URLs
Production: `https://github-readme-stats.vercel.app` (or custom deployed domain).

---

### 1. `GET /api` (User Stats)
Generates the main GitHub stats card for a user.

*   **Parameters:**
    *   `username` (string, **required**): The GitHub username.
    *   `hide` (string, comma-separated): Stats to hide (e.g., `stars,commits`).
    *   `show_icons` (boolean): Display icons next to stats.
    *   `include_all_commits` (boolean): Count commits from all repos, not just public ones.
    *   `theme` (string): Predefined color theme (e.g., `dark`, `radical`).
    *   `bg_color`, `title_color`, `text_color`, `icon_color`, `border_color` (hex color): Custom styling.
    *   `locale` (string): Language for labels (e.g., `en`, `es`).
    *   `cache_seconds` (number): Override default cache TTL.
    *   *Many other visual parameters (e.g., `border_radius`, `hide_border`, `disable_animations`).*

---

### 2. `GET /api/top-langs` (Top Languages)
Generates a card showing the most used languages.

*   **Parameters:**
    *   `username` (string, **required**): The GitHub username.
    *   `layout` (string): `compact`, `normal`, `donut`, `donut-vertical`, `pie`.
    *   `hide` (string, comma-separated): Languages to hide (e.g., `html,css`).
    *   `exclude_repo` (string, comma-separated): Repositories to exclude from calculation.
    *   `langs_count` (number): Number of languages to display.
    *   `stats_format` (string): `bytes` or `percentages`.
    *   *Standard styling parameters (`theme`, `bg_color`, `locale`, etc.).*

---

### 3. `GET /api/wakatime` (WakaTime Stats)
Generates a card showing WakaTime coding stats.

*   **Parameters:**
    *   `username` (string, **required**): The WakaTime username.
    *   `api_domain` (string): Custom WakaTime API domain if using a self-hosted instance.
    *   `layout` (string): `compact` or normal.
    *   `hide_progress` (boolean): Hide the progress bars.
    *   `display_format` (string): Format for time display.
    *   *Standard styling parameters.*

---

### 4. `GET /api/pin` (Pinned Repository)
Generates a card for a specific repository.

*   **Parameters:**
    *   `username` (string, **required**): The repository owner.
    *   `repo` (string, **required**): The repository name.
    *   `show_owner` (boolean): Display the owner name along with the repo name.
    *   `description_lines_count` (number): Max lines for the description before truncating.
    *   *Standard styling parameters.*

---

### 5. `GET /api/gist` (Gist Pin)
Generates a card for a specific Gist.

*   **Parameters:**
    *   `id` (string, **required**): The unique ID of the GitHub Gist.
    *   `show_owner` (boolean): Display the gist owner.
    *   *Standard styling parameters.*

### Error Handling
All endpoints wrap their execution in a `try/catch`. If an error occurs (e.g., user not found, API rate limit), they catch the error, set an error-specific cache header (`setErrorCacheHeaders(res)`), and return an SVG formatted as an error card using `renderError()`.