# BinarJoin Project

## Overview
Engineering project management system (Fullstack JS).

## Recent Changes
- Fixed deployment script to ensure `dist/public` directory exists and index.html is correctly served.
- Updated `server/static.ts` with improved path resolution for both Replit and production servers.
- Enhanced PM2 restart logic in `deploy_via_git.sh`.
- Synchronized repository with server deployments.

## Deployment
Use `bash scripts/deploy_via_git.sh` for full deployment to production.
For local Replit updates, `npm run build` is required.