# BinarJoin Project

## Overview
Engineering project management system (Fullstack JS) with advanced AI Agent support.

## Recent Changes (Dec 27, 2025)
### Code Cleanup & Optimization
- Deleted 4 unused components: ForgotPasswordPage, AdvancedProgressIndicator, AdvancedDataExport, ExactWorkerStatementTemplate (1,561 LOC freed)
- Removed empty directories: https:/, reports/, workspace/
- Cleaned up old backups (kept only 2 latest, deleted 17 old ones)
- Freed ~560MB of storage space

### AI Agent Page Redesign
- **Complete redesign of AI Chat page** to match global platforms (ChatGPT, Claude standards)
- Integrated with backend AI Agent Service for persistent database storage
- Advanced features:
  - Session management with database persistence
  - Support for multiple AI models (OpenAI, Google Generative AI, Hugging Face)
  - Real-time streaming responses
  - Copy, share, and feedback options for each message
  - Responsive sidebar with session history and search
  - Beautiful gradient UI with dark mode support
  - Admin-only access with security checks

## Deployment
Use `bash scripts/deploy_via_git.sh` for full deployment to production.
For local Replit updates, `npm run build` is required.

## Features
- 📊 Full engineering project management
- 🤖 AI-powered assistant with advanced capabilities
- 🔐 Secure authentication and role-based access
- 📱 Mobile-friendly responsive design
- 💾 Database persistence for all data
- 🌙 Dark/Light mode support