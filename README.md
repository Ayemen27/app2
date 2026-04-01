<div align="center">
  <img src="client/src/assets/images/logo_header_light.png" alt="AXION Logo" width="120" />

  <h1>AXION</h1>
  <h3>Real Assets Management — Enterprise Operations Platform</h3>

  <p>AI-powered ERP system for construction project management, workforce coordination, and financial operations</p>

  <p>
    <img src="https://img.shields.io/badge/version-1.0.5-blue?style=flat-square" alt="Version" />
    <img src="https://img.shields.io/badge/node-%3E%3D20-green?style=flat-square&logo=node.js" alt="Node" />
    <img src="https://img.shields.io/badge/react-18-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/postgresql-16-336791?style=flat-square&logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/typescript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/license-proprietary-red?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/platform-web%20%7C%20android-orange?style=flat-square" alt="Platform" />
  </p>
</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Overview](#api-overview)
- [Android Build](#android-build)
- [Security](#security)
- [Testing & Quality](#testing--quality)
- [Observability](#observability)
- [Documentation](#documentation)
- [Roadmap](#roadmap)

---

## Overview

AXION is a full-stack enterprise platform designed for construction and infrastructure companies to manage projects, workforce, finances, equipment, and well operations — all from a unified system. It features deep AI integration for natural-language queries, automated data extraction from WhatsApp messages, and an offline-first mobile architecture for field operations.

**Who is it for?**
- Construction project managers and field engineers
- Financial teams managing multi-project budgets
- Operations teams coordinating workforce and equipment
- Executives needing real-time analytics and reports

---

## Key Features

### Project & Well Management
- Full project lifecycle tracking with real-time dashboards
- Well operations management (crews, materials, equipment, receptions)
- Equipment tracking with transfer history and warehouse management
- Multi-project expense comparison and cost reports

### Workforce & Finance
- Worker attendance, accounts, and financial settlements
- Unified double-entry financial ledger with audit trail
- Supplier and customer account management
- Daily expense tracking and project fund custody
- Excel/PDF report generation (daily, cost, worker statements)

### AI & WhatsApp Intelligence
- **WhatsApp AI Bot** — Natural language queries in Arabic/English for project stats, expense recording, and report generation
- **WhatsApp Import Pipeline** — Automated extraction of financial transactions from chat messages using AI + OCR
- **Multi-Provider AI** — Falls back across Google Gemini, OpenAI, Anthropic Claude, and HuggingFace
- **OCR Processing** — Tesseract.js for receipt and document analysis

### Enterprise Infrastructure
- **Offline-First Sync** — Local SQLite on mobile with conflict resolution and background sync
- **RBAC + WebAuthn** — Role-based access control with biometric (FIDO2) authentication
- **Automated Deployment** — One-click deploy with rollback, version tracking, and Bot-T PM2 sync
- **Automated Backups** — Scheduled backups to local storage and Google Drive
- **Real-Time Updates** — Socket.IO for live notifications and data sync
- **Push Notifications** — Firebase Cloud Messaging for Android

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Shadcn/ui |
| **Backend** | Node.js, Express 5, Drizzle ORM, Zod validation |
| **Database** | PostgreSQL 16, Drizzle Kit migrations |
| **Mobile** | Capacitor (Android), SQLite, Biometrics, Push Notifications |
| **AI/ML** | Google Generative AI, OpenAI, Anthropic, Tesseract.js |
| **Messaging** | WhatsApp (Baileys), Telegram Bot API |
| **Auth** | JWT (access/refresh tokens), WebAuthn/FIDO2, httpOnly cookies |
| **Real-Time** | Socket.IO |
| **Monitoring** | OpenTelemetry, Health checks, Central event logging |
| **Deployment** | PM2, Nginx, Bot-T automated management |
| **Cloud** | Google Drive API, Firebase Admin SDK |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Web (React)  │  │Android (Cap.)│  │ WhatsApp (Baileys)│   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
└─────────┼──────────────────┼───────────────────┼─────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS 5 SERVER                           │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │Auth/RBAC│ │ REST API  │ │Socket.IO │ │ Organized     │   │
│  │Middleware│ │ (33 route │ │Real-Time │ │ Route Modules │   │
│  │         │ │  modules) │ │          │ │               │   │
│  └─────────┘ └──────────┘ └──────────┘ └───────────────┘   │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                  SERVICES LAYER                      │     │
│  │  AI Agent │ WhatsApp Bot │ Backup │ Deployment      │     │
│  │  Ledger   │ Sync Engine  │ FCM    │ Notifications   │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   POSTGRESQL 16                              │
│            105 tables │ Drizzle ORM │ Migrations             │
│         Financial triggers │ Double-entry ledger             │
└─────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/           # 56 page components
│   │   ├── components/      # Reusable UI components
│   │   │   └── ui/          # Shadcn/ui primitives
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and helpers
│   │   └── styles/          # Global styles
│   └── public/              # Static assets (robots.txt, sitemap.xml)
├── server/                  # Express backend
│   ├── routes/modules/      # 33 organized route modules
│   ├── services/            # Business logic services
│   │   ├── ai-agent/        # AI conversation engine
│   │   ├── backup/          # Backup & restore engine
│   │   └── whatsapp-import/ # Message extraction pipeline
│   ├── middleware/           # Auth, compression, security
│   └── monitoring/          # Health checks & telemetry
├── shared/                  # Shared types & schema
│   └── schema.ts            # Drizzle ORM schema (105 tables)
├── android/                 # Capacitor Android project
├── docs/                    # Technical documentation
├── governance/              # Architecture decisions & roadmap
└── scripts/                 # Build & utility scripts
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **PostgreSQL** 16+
- **npm** >= 9

### Installation

```bash
# Clone the repository
git clone https://github.com/Ayemen27/AXION.git
cd AXION

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and API keys

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL_CENTRAL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `SESSION_SECRET` | Yes | Express session secret |
| `NODE_ENV` | Yes | `development` or `production` |
| `WHATSAPP_BOT_ENABLED` | No | `true`/`false` — Bot runs only in production by default |
| `GOOGLE_AI_API_KEY` | No | Google Gemini API key |
| `OPENAI_API_KEY` | No | OpenAI API key |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | No | Google Drive backup credentials |
| `FIREBASE_SERVICE_ACCOUNT` | No | Firebase Admin SDK for push notifications |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot for deployment notifications |
| `VITE_VAPID_PUBLIC_KEY` | No | Web push notification public key |

---

## Deployment

AXION deploys to a Linux server using PM2 process management behind Nginx reverse proxy.

```bash
# Production deployment (via built-in deployment engine)
# Uses the /deployment route in the admin panel

# Manual deployment
npm run build
pm2 start dist/index.js --name "AXION-v1.0.5"
```

### Infrastructure

- **Process Manager:** PM2 with versioned naming (`AXION-v{version}`)
- **Reverse Proxy:** Nginx → port 6000
- **Bot-T Integration:** Automatic PM2 inventory sync after deploy/rollback
- **Rollback:** One-click rollback with automatic Bot-T sync

---

## API Overview

The API is organized into 33 route modules under `/api/`:

| Module | Endpoint | Description |
|--------|----------|-------------|
| Auth | `/api/auth/*` | Login, register, session management, WebAuthn |
| Projects | `/api/projects/*` | CRUD, analytics, fund transfers |
| Workers | `/api/workers/*` | Attendance, accounts, settlements |
| Wells | `/api/wells/*` | Well lifecycle, crews, materials |
| Financial | `/api/financial/*` | Transactions, reports, ledger |
| Ledger | `/api/ledger/*` | Double-entry accounting operations |
| Equipment | `/api/equipment/*` | Equipment tracking and transfers |
| AI | `/api/ai/*` | AI chat and query engine |
| WhatsApp AI | `/api/whatsapp-ai/*` | Bot management and message processing |
| Backup | `/api/backups/*` | Backup creation, restore, Google Drive sync |
| Deployment | `/api/deployment/*` | Build, deploy, rollback operations |
| Health | `/api/health` | System health and DB connectivity |

All protected routes require JWT authentication via `Authorization: Bearer <token>` header or httpOnly cookie.

---

## Android Build

```bash
# Sync version from package.json
npm run android:sync-version

# Build debug APK
npm run android:build

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

See [Android Build Guide](docs/ANDROID_BUILD_GUIDE.md) for detailed instructions.

---

## Security

### Authentication & Authorization
- JWT-based authentication with access/refresh token rotation
- WebAuthn/FIDO2 biometric login support
- Role-based access control (Admin, Editor, Viewer)
- httpOnly cookies with SameSite protection
- Rate limiting on auth endpoints

### Security Headers
- `Content-Security-Policy` with strict source directives
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restricting geolocation, microphone, camera

### Data Protection
- SQL injection prevention via parameterized queries (Drizzle ORM)
- Mass-assignment protection on all endpoints
- Financial transactions use database-level atomic operations
- Audit logging for sensitive operations

### Reporting Security Issues
Please report security vulnerabilities privately to the repository owner. Do not open public issues for security concerns.

---

## Testing & Quality

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Type checking
npm run check

# Lint
npm run lint
```

---

## Observability

| Component | Endpoint/Tool |
|-----------|---------------|
| Health Check | `GET /api/health` |
| DB Schema Guard | Startup validation (code vs DB table comparison) |
| Route Guard | Detects unregistered route modules at startup |
| Central Event Log | `/api/central-logs` |
| Real-Time Monitoring | Admin monitoring dashboard |
| Financial Triggers | 8 PostgreSQL triggers for ledger integrity |

---

## Documentation

| Document | Path |
|----------|------|
| Architecture Decisions | [governance/architecture.md](governance/architecture.md) |
| Project Roadmap | [governance/roadmap.md](governance/roadmap.md) |
| Change Log | [governance/change_log.md](governance/change_log.md) |
| Design Guidelines | [docs/design_guidelines.md](docs/design_guidelines.md) |
| Android Build Guide | [docs/ANDROID_BUILD_GUIDE.md](docs/ANDROID_BUILD_GUIDE.md) |
| Policy & Constraints | [governance/policy_and_constraints.md](governance/policy_and_constraints.md) |

---

## Roadmap

- [ ] Decompose large service files into bounded contexts
- [ ] PgBouncer connection pooling
- [ ] Database read replica for reporting
- [ ] Automated backup restore verification
- [ ] Property-based financial test suite
- [ ] TLS certificate validation hardening

See [full roadmap](governance/roadmap.md) for details.

---

<div align="center">
  <p>
    <strong>AXION</strong> — Built for the field. Powered by AI.
  </p>
  <p>
    <sub>&copy; 2026 AXION. All rights reserved.</sub>
  </p>
</div>
