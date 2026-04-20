# Duey — AI Bill Tracker

Duey is a smart subscription and bill management app. It uses AI to automatically extract invoice details from uploaded documents, detect payment anomalies, suggest cheaper alternatives, and send reminders via email and Telegram.

---

## Overview

- Upload bills and contracts — AI detects the type, extracts amounts, due dates, and classifies them as one-time or recurring
- Dashboard with spending overview, anomaly alerts, and due reminders
- Calendar view of all upcoming payment dates
- AI-powered cheaper alternative suggestions for your subscriptions
- Email and Telegram reminders before bills are due
- Stripe subscription plans (Free / Pro)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Better Auth |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| AI | OpenAI |
| Vector DB | Pinecone |
| Email | Nodemailer (Gmail SMTP) |
| Payments | Stripe |
| Deployment | Vercel |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/incubation-center/B11-AT-AI-Product---G3.git
cd B11-AT-AI-Product---G3
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory and fill in the following:

```env
# AI
GEMINI_API_KEY=
OPENAI_API_KEY=

# Database
DATABASE_URL=

# Vector Database
PINECONE_API_KEY=

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Cron
REMINDER_CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe
STRIPE_PUBLISH_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_LINK_API_SECRET=
```

### 4. Push database schema

```bash
npx drizzle-kit push
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) and get the token
2. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` in your `.env`
3. After deploying, register the webhook once:

```
GET /api/telegram/register-webhook?secret=<REMINDER_CRON_SECRET>
```

Users can then link their Telegram account from **Settings → Link Telegram**.

### Bot Commands

| Command | Description |
|---|---|
| `/start <token>` | Links Telegram account to the app |
| `/upcoming` | Shows bills due in the next 7 days |
| `/services` | Lists all recurring services and total monthly cost |
| `/add` | Redirects to the app to upload a new bill |

---

## Email Reminders (Cron)

Reminders are sent via a secured POST endpoint:

```
POST /api/reminders/send-due
Header: x-reminder-secret: <REMINDER_CRON_SECRET>
Body: {}
```

Set up a daily cron job (e.g. [cron-job.org](https://cron-job.org)) to call this endpoint automatically.

---

## Deployment (Vercel CLI)

```bash
npm install -g vercel
vercel login
vercel --prod
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**, then redeploy.
