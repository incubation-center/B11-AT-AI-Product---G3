# Duey

Duey is a Next.js application for tracking subscriptions, bills, and payment risks in one place.  
It combines user authentication, dashboard management, and AI-powered API workflows for document and anomaly analysis.

## Features

- User authentication with Better Auth (sign up, sign in, reset password, sign out)
- Protected dashboard with account menu and billing overview
- AI API endpoints for ingest, extraction, anomaly detection, and execution workflows:
  - `POST /api/ingest`
  - `POST /api/extract`
  - `POST /api/detect-anomaly`
  - `POST /api/execute`
  - `POST /api/reminders/send-due` (secured cron endpoint for due reminder emails)
  - `GET/PUT /api/notification-preferences` (per-user due reminder email toggle)
- Drizzle ORM + PostgreSQL setup for data access and persistence

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Better Auth
- Drizzle ORM
- Tailwind CSS

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

- Copy `.env.example` to `.env`
- Fill in required values (database, Better Auth, email provider, AI keys if needed)

3. Start development server:

```bash
npm run dev
```

4. Open:

[http://localhost:3000](http://localhost:3000)
