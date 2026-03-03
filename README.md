# Content Pipeline Machine

Built for the UK AI Agent Hackathon EP4 with sponsor-track focus on **Anyway** (observability/commercialization) and **Animoca Minds** (multi-agent + memory cognition).

## What Is Implemented

- Supabase auth + RLS-backed data model
- Multi-agent server pipeline (`run-pipeline`) with 4 specialists:
  - HookAgent
  - ScriptAgent
  - TitleAgent
  - StrategyAgent
- Per-run artifacts with agent metadata
- Persistent memory + recursive feedback loop:
  - `agent_memory`
  - `run_feedback`
  - `submit-run-feedback` function
- Anyway-style trace + per-agent span event emission
- Observability UI with per-agent metrics drilldown
- Subscription billing:
  - `create-checkout-session`
  - `stripe-webhook`
- Stripe Connect MVP:
  - `create-connect-account`
  - `create-connect-checkout-session`
- Public landing page and SPA rewrites for Vercel

## Architecture Docs

- [Architecture](docs/architecture.md)
- [Demo Script](docs/demo-script.md)

## Core Data Model

Main tables:

- `videos`
- `runs`
- `artifacts`
- `profiles`
- `agent_memory`
- `run_feedback`

Notable run fields:

- `trace_id`
- `trace_url`
- `cost_tokens`
- `cost_usd`
- `agent_metrics` (jsonb)

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Required Frontend Env Vars (`.env`)

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STRIPE_STARTER_PRICE_ID`
- `VITE_STRIPE_PRO_PRICE_ID`

## Supabase Migrations

```bash
supabase db push
```

## Edge Functions

Deployed/used functions:

- `run-pipeline`
- `submit-run-feedback`
- `create-checkout-session`
- `stripe-webhook`
- `create-connect-account`
- `create-connect-checkout-session`

Deploy manually:

```bash
supabase functions deploy run-pipeline
supabase functions deploy submit-run-feedback
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy create-connect-account
supabase functions deploy create-connect-checkout-session
```

## Required Supabase Function Secrets

### AI

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default `gpt-4.1-mini`)

### Anyway

- `ANYWAY_TRACE_BASE_URL` (for UI trace links)
- `ANYWAY_PROJECT_ID` (optional)
- `ANYWAY_API_URL` (optional event endpoint)
- `ANYWAY_API_KEY` (optional)

### Stripe Subscription

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_STARTER_PRICE_ID`
- `STRIPE_PRO_PRICE_ID`

## Stripe Webhook

Endpoint:

- `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`

Recommended events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Sponsor Demo Checklist

- Trigger multi-agent run and show 4 agent outputs
- Submit negative feedback and rerun with memory influence
- Show observability trace link + per-agent metrics
- Show subscription checkout path
- Show Connect onboarding + platform-fee checkout path
