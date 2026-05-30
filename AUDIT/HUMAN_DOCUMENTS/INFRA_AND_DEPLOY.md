# Infrastructure and Deployment

**Confidence Level:** [HIGH]

## Deployment Platform
The application is designed specifically to be deployed on **Vercel** as a set of Serverless Edge/Node.js Functions.

## Configuration
Deployment configuration is managed via `vercel.json` in the root directory:

```json
{
  "functions": {
    "api/*.js": {
      "memory": 128,
      "maxDuration": 10
    }
  },
  "redirects": [
    {
      "source": "/",
      "destination": "https://github.com/anuraghazra/github-readme-stats"
    }
  ]
}
```

*   **Function Routing:** Vercel automatically treats any `.js` file inside the `api/` directory as a serverless endpoint.
*   **Resource Limits:** Functions are capped at `128MB` of memory and a maximum execution duration of `10 seconds`. This prevents runaway processes and controls costs.
*   **Root Redirect:** Traffic to the root domain (`/`) is redirected to the project's GitHub repository.

## Self-Hosting
While optimized for Vercel, because the core logic is standard Express-style Node.js handling `(req, res)`, it can theoretically be deployed to other platforms (like AWS Lambda, Netlify, or a standard Node server) with minimal wrapper modifications. The `README.md` notes that Vercel is the recommended self-hosting path.