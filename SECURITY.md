# Security

## Secrets

Never commit API keys, tokens, passwords, `.env.local`, credential exports, or generated secret files. `.env*` is ignored by Git. `.env.example` contains names only.

## Authentication

The demo has no login gate: do not expose a deployment publicly without adding an auth provider or single-user lock first. Any future gate must keep genuine external actions explicit and user-approved.

## Platform Safety

Content Forge must not implement:

- CAPTCHA solving
- anti-bot bypasses
- fingerprint spoofing
- fake engagement
- account farming
- mass following/unfollowing
- mass messaging
- automated comment spam
- deceptive identity behavior

## Data Controls

Memory should remain inspectable, editable, and deletable. External tokens must never be exposed to the frontend.

## Audit Logs

Any account-changing integration action should write an audit record containing who initiated it, what was requested, what platform was affected, and whether it succeeded.
