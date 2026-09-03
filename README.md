# Nexus

Nexus is a full-stack e-learning platform built with Next.js, Drizzle, Better Auth, and a modular server architecture. It combines community-driven learning, paid access, course management, leaderboards, notifications, badges, quizzes, AI-generated content, and real-time activity into one product.

This project is designed as a learning platform where users can:

- create and join communities
- enroll in courses and track progress
- participate in discussions and social learning
- complete quizzes and unlock certificates
- receive notifications and badges
- access paid features via Stripe-based flows
- interact with AI-powered quiz generation workflows

## Project status

The application has passed the required build validation checks for the reviewed modules. Verified results include:

- `npx tsc --noEmit` passed
- `npm run build` passed for the main application
- module-level fixes were implemented across auth, communities, feed, profile, notifications, admin, payment, course, quiz, reviews, members, leaderboard, events, badges, and AI

## Core Features

- Authentication and account management with Better Auth
- Email/password registration, login, verification, logout, and password reset
- Community discovery, memberships, moderation, and settings
- Feed with posts, comments, replies, votes, bookmarks, mentions, reports, and pinning
- Course creation, publishing, lessons, enrollment, progression, and certificates
- Quiz generation, timed attempts, grading, retries, and answer review
- Reviews and ratings for courses
- Leaderboards and community points tracking
- Notifications with real-time delivery and unread state management
- Admin moderation and platform management
- Payment and subscription flows with Stripe
- AI-assisted quiz generation via background jobs
- Badge system and profile activity tracking

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- tRPC
- Drizzle ORM
- Better Auth
- SQLite for local development
- Redis + BullMQ for queue-based background jobs
- Socket.IO for real-time events
- Resend for email delivery
- Stripe for payments and subscriptions
- AWS S3-compatible storage
- AI integrations via Groq / Google AI services

## Architecture Overview

The project follows a modular full-stack structure:

- `src/app` contains the Next.js App Router pages and API endpoints
- `src/server` contains business logic, routers, and service modules
- `src/components` houses reusable UI blocks and dashboards
- `src/lib` contains environment validation, database setup, queue logic, auth, and supporting utilities
- `drizzle/` stores schema migrations and metadata
- `websocket-server.cjs` runs the realtime server
- `scripts/` contains DB-related and maintenance tools

## Project Structure

```bash
.
├── drizzle/                     # database migrations and schema snapshots
├── public/                      # static assets
├── scripts/                     # maintenance scripts and DB helpers
├── src/
│   ├── app/                     # app pages, routes, and auth UI
│   ├── components/              # UI components and feature modules
│   ├── hooks/                   # client-side hooks
│   ├── lib/                     # auth, env, db, queue, AI, email, and utility config
│   └── server/                  # server-side modules, routers, and tRPC logic
├── .env.example                 # environment variable template
├── .gitignore
├── drizzle.config.ts            # Drizzle configuration
├── eslint.config.mjs            # lint rules
├── next.config.js               # Next.js config
├── package.json                 # project scripts and dependencies
├── postcss.config.mjs           # PostCSS config
├── PR.md                        # project PR / readiness notes
├── README.md                    # documentation
├── sqlite.db                    # local SQLite database
├── test-network.mjs             # network / testing helper
├── websocket-server.cjs         # WebSocket server
└── tsconfig.json                # TypeScript config
```

## Prerequisites

Before running the app, ensure you have:

- Node.js 20+
- npm
- Redis for queue / realtime-related workflows
- Resend API key for emails
- Stripe keys for payments and subscriptions
- AI credentials if using the quiz generation flow

## Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then configure the required values:

```env
BETTER_AUTH_SECRET=<your-secret-at-least-32-chars>
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=<your-resend-api-key>
GROQ_API_KEY=<your-groq-api-key>

# Optional / local config
DATABASE_URL=file:./sqlite.db
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

A full template is available in `.env.example`.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the main application:

```bash
npm run dev
```

Run the websocket and background worker services when needed:

```bash
npm run ws:server
```

## Database Commands

Generate migrations:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

Push schema directly:

```bash
npm run db:push
```

Open Drizzle Studio:

```bash
npm run db:studio
```

## Build and Production Checks

Build the production app:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Module Coverage Summary

### Authentication

Authentication uses Better Auth with Drizzle persistence and supports email/password login, registration, verification, logout, and password reset. The main fix was ensuring verification URLs were included in welcome emails.

Key outcomes:

- verification email contains the actual verification link
- Better Auth hooks enforce platform settings
- client-side validation was added for username input
- network error handling and loading states were improved across the auth flow

### Communities

Communities cover discovery, joining/leaving, paid subscriptions, management, settings, and deletion. The project resolved issues around unsupported image-key fields, centralized authorization updates, and finite price validation.

### Feed

The feed handles posts, comments, replies, votes, bookmarks, mentions, reports, and pinned content. The key security fix was enforcing active membership before allowing access to private posts.

### Profile

The profile system handles public profiles, badges, community visibility, activity, editing, avatar uploads, blocking, reporting, and account deletion. The main corrections were to ensure badges are loaded for the selected profile and to remove private data from public profile responses.

### Notifications

Notifications support unread counts, filtering, pagination, mark-as-read, and deletion. The work focused on better error handling, retry states, and cursor validation.

### Admin

Admin functionality includes moderation, user management, community oversight, settings, and health checks. The updates added stronger role checks, cursor validation, and improved loading states.

### Payment

Payment flows cover paid course checkout, platform subscriptions, Stripe Connect onboarding, community subscriptions, webhook processing, and creator revenue reporting. Important fixes included duplicate purchase protections and validation of platform plan inputs.

### Course

Courses support creation, publishing, lessons, enrollment, progress tracking, quizzes, certificates, and paid access. The main issue resolved was preventing enrolled community members from accessing locked paid lesson content before purchase.

### Quiz

Quizzes support AI generation, attempt limits, grading, retries, and lesson completion. Security fixes ensured correct answers are not exposed before submission and that owner and enrollment checks are enforced.

### Reviews

Reviews allow learners to rate and comment on courses. Security fixes enforced enrollment checks and ownership validation for updates.

### Members

Members management includes listing, search, activity filters, role changes, removal, and direct messaging. The fix ensures only active members can be managed.

### Leaderboard

Leaderboard features community ranking by period and current-user position. Validation and deterministic scoring behavior were improved.

### Events

Events support community calendars, creation, editing, and deletion. The work improved date validation, color validation, and retry/error UX.

### Badges

The badge system seeds and awards achievements based on user activity. The fix introduced conflict-safe award insertion so concurrent badge checks do not cause duplicates.

### AI

AI workflows generate quiz content from lesson material using queued background jobs, with polling, saving, and discard support. The main changes improved validation and prevented incomplete generation jobs from being saved.

## Quality and Security Notes

The project has addressed multiple issues across the app, including:

- missing verification links in emails
- validation gaps in mutation inputs
- private content access leaks
- group membership authorization issues
- public profile data leak prevention
- duplicate payment or badge actions
- invalid cursor handling and malformed inputs
- loading-state and user-feedback improvements

## Known Follow-ups

Several areas are still worth improving for production readiness, including:

- stronger email templating sanitization
- rate limiting on login and password reset requests
- better Stripe reconciliation and retry handling
- account deletion cleanup across external systems
- deeper admin query optimization
- recurring event support and timezone handling
- more robust AI queue retry and dead-letter handling

## License

This project currently does not include a formal license file. If this project is meant to be distributed or published, add an appropriate license before release.

## Summary

Nexus is a feature-rich learning platform with modular services, strong authorization patterns, and a full-stack architecture built for course communities, engagement, and monetization. The project is in a strong state for continued development and iteration, with the main remaining work focused on production-hardening and scale-oriented improvements.

