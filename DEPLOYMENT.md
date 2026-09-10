# Orbita v2 Deployment Guide

Orbita is a Next.js 16 application with optional PostgreSQL persistence and optional external generation/media providers. The application can run in demo mode without provider credentials, but a real production deployment should configure authentication and whichever providers are intended for use.

## Runtime

- Node.js 22 or newer
- npm
- `npm ci` for deterministic installs
- `npm run build` for the production build
- `npm start` to serve the compiled application

## Required production configuration

At minimum, configure:

```env
CONTENT_FORGE_ACCESS_CODE=<strong private access code>
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

Do not deploy production with an empty access code.

## AI provider

Configure one supported provider and the corresponding model/key values. Demo mode is useful for development and CI, not as a substitute for production generation.

Example variables are documented in `docs/environment.example`.

## Database

PostgreSQL is optional. Without it, jobs are retained in browser storage only.

For persistent server-side history:

```env
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

Then run:

```bash
npm run db:migrate
```

before serving production traffic.

## Pre-deploy quality gate

Run all of the following successfully:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

The repository also includes `.github/workflows/quality.yml`, which runs these checks for pull requests and pushes to `main`.

## Optional services

Depending on the enabled output types, Orbita can use optional transcription, narration, image and presentation services. Configure only the services you actually intend to expose. Missing optional providers should degrade to the documented fallback behavior rather than blocking the core workspace.

## Security checklist

- Use HTTPS at the hosting layer.
- Keep `.env*` and provider secrets out of Git.
- Set a strong `CONTENT_FORGE_ACCESS_CODE`.
- Set `TRUST_PROXY` only when the hosting topology actually requires it.
- Use verified TLS for hosted PostgreSQL.
- Confirm upload/request limits on the chosen host.
- Review generated outputs before external use or publication.
- Do not expose demo credentials in a public production deployment.

## Release checklist

1. Pull the exact `main` commit intended for release.
2. Confirm the GitHub Quality Gate is green.
3. Configure production environment variables in the hosting platform.
4. Run database migrations when database persistence is enabled.
5. Deploy the production build.
6. Open `/api/health` and verify readiness/configuration booleans.
7. Sign in through `/login` and complete one source → generate → review → export smoke test.
8. Confirm mobile navigation and dark/light appearance on the deployed URL.
9. Verify provider-specific outputs only for providers actually configured in production.

## Rollback

Keep the previous known-good deployment available at the hosting layer. If a release fails the smoke test, roll back to the previous deployment first, then diagnose; do not repair production by editing generated server files in place.
