# Project: Professional AI Agent Workspace

## Rules of Engagement (Arabic)
- **Analytical Thinking:** Step-by-step analysis before answering.
- **Honesty:** Explicitly state when something is unknown.
- **Innovation:** Propose non-traditional solutions if common ones fail.
- **Realism:** Choose the most practical and implementable solution.
- **Transparency:** Clarify assumptions before building on them.
- **No Flattery:** Present reality as it is, even if uncomfortable.
- **No Rushing:** Evaluate options before committing.

## System Directives (Adopted March 2026)
1. **Decision Rule:** If solution is uncertain -> specify uncertainty percentage.
2. **Information Rule:** If info is missing -> request it clearly.
3. **Selection Rule:** If multiple solutions -> choose the best and explain why.
4. **No Deception:** Do not try to please the user at the expense of truth.
5. **Out of the Box:** Short traditional solution -> Smart alternative -> Unconventional (if logical).

## Current State
- Node.js project (rest-express v1.0.29).
- WhatsApp integration (Baileys) via `WhatsAppBot.ts`.
- Telegram and Google Drive services integrated.
- OpenTelemetry and Sentry monitoring active.
- Database: PostgreSQL (external server via `DATABASE_URL_CENTRAL`), Drizzle ORM.
- Deployed to external server at 93.127.142.144 via SSH/PM2.

## Security Audit (March 2026)
- JWT uses separate secrets: `JWT_ACCESS_SECRET` (access tokens) and `JWT_REFRESH_SECRET` (refresh tokens)
- No hardcoded JWT secrets - fail-fast in production if secrets missing
- Client-side token validation includes expiry checking with 30-second proactive refresh
- Sync endpoints protected with authentication and rate limiting (100 req/15min)
- Database connection fails fast in production if URL missing
- Sync table definitions centralized in `shared/schema.ts` (SYNCABLE_TABLES constant)

## Biometric/Fingerprint Login (WebAuthn)
- WebAuthn/FIDO2 implemented for biometric login on mobile
- DB tables: `webauthn_credentials` (stores public keys), `webauthn_challenges` (temporary challenges)
- API endpoints: `/api/webauthn/register/options`, `/api/webauthn/register/verify`, `/api/webauthn/login/options`, `/api/webauthn/login/verify`
- Client utility: `client/src/lib/webauthn.ts`
- After first successful password login, user is prompted to register fingerprint
- Fingerprint button on LoginPage triggers biometric authentication
- Uses `@simplewebauthn/server` package

## Deployment
- SSH: `sshpass -e` with host `93.127.142.144`, user `administrator`
- App location: `~/app2`, PM2 process: `construction-app`, port 6000
- Build: `npm run build` (client via Vite + server via esbuild)
- Deploy pattern: Edit locally → SCP files → `npm run build` on remote → `pm2 restart construction-app`
