# Maintainer Verification Checklist

Please run through these steps after reviewing the audit and applying the suggested dependency fixes.

- [ ] Run `npm audit fix` to apply security updates.
- [ ] Run `npm install` to ensure the `node_modules` tree is in sync.
- [ ] Run `npm run test` to verify no regressions were introduced by the dependency updates. All 378 tests should pass.
- [ ] Run `npm run lint` and `npm run format:check` to ensure code quality standards are maintained.
- [ ] Review `.github/workflows/test.yml` and consider updating the Node version matrix from `22.x` to `24.x` to match `package.json`.
- [ ] Deploy to a staging Vercel environment and visually verify the SVG generation for a few sample endpoints (e.g., `/api?username=anuraghazra`).