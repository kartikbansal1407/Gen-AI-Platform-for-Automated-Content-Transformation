<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Content Forge Agent Notes

Content Forge is SIH 26154 Gen AI Platform for Automated Content Transformation (NTRO) — Next.js 16 + TypeScript (not Python). `npm` is entry point, vision/video best-effort, 7 outputs via JSON-schema prompts. Preserve product philosophy: source-faithful outputs, operator-controlled voice, useful content, relevant relationships, real conversations, and compliance (no spam/scraping abuse).

## Rules

- Never commit secrets or `.env*` files.
- Keep platform integrations compliant with official APIs and human approval.
- Do not build spam, fake engagement, scraping abuse, CAPTCHA bypasses, or deceptive automation.
- Keep memory inspectable, editable, and deletable.
- Use typed domain logic in `src/lib` before adding complexity to UI components.
- Validate API inputs with structured schemas.
- Run lint, typecheck, tests, and production build before declaring a milestone complete.

## Design Direction

Premium, serious, minimal, modern command-center UI. Avoid flashy AI SaaS visuals, excessive gradients, clutter, and gamification.
