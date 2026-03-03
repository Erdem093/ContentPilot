# Multi-Agent Architecture (Anyway + Animoca)

## Overview

The system runs a server-orchestrated, 4-agent content swarm per video run:

- `HookAgent` -> generates viral opening hooks
- `ScriptAgent` -> generates script draft
- `TitleAgent` -> generates title + thumbnail text ideas
- `StrategyAgent` -> generates distribution/retention strategy

Each run is persisted in `runs`, outputs in `artifacts`, user feedback in `run_feedback`, and long-term preference memory in `agent_memory`.

## Why Not 6+ Swarm Yet

For this sprint we kept a `4+1` architecture deliberately:

- lower runtime and latency for live demo reliability
- one artifact owner per agent for clear rejection targeting
- cleaner per-agent observability with fewer ambiguous spans
- less orchestration overhead while still showing true specialization

## Execution Flow

1. Frontend `VideoDetail` calls `run-pipeline` edge function.
2. Function authenticates user and validates video ownership.
3. Function creates a `runs` row with status `running`.
4. Orchestrator compiles memory deterministically by scope:
   - agent + video
   - agent + global
   - global + video
   - global fallback
5. Each specialist agent executes one OpenAI call with explicit role prompt.
6. Per-agent metrics are captured (`latency`, `tokens`, `cost`, `status`).
7. Artifacts are inserted with `agent_name` and `agent_version`.
8. Run is updated with aggregated cost/tokens, `agent_metrics`, `memory_applied`, and `quality_delta`.
9. Anyway events are emitted (trace start/end + span events) and trace URL is persisted.

## Memory + Cognition Loop

- User can submit structured run feedback via `submit-run-feedback`:
  - `too_long`
  - `not_engaging`
  - `wrong_tone`
  - `poor_hook`
  - `other`
- Feedback is written to `run_feedback` and summarized into `agent_memory`.
- Next run injects compiled per-agent constraints so generation adapts in targeted ways.

Memory compiler output sections per agent:

- hard constraints
- style preferences
- recent weighted failure reasons

## Observability

Stored on `runs`:

- `trace_id`
- `trace_url`
- `cost_tokens`
- `cost_usd`
- `error_message`
- `agent_metrics` (jsonb)
- `memory_applied` (jsonb)
- `quality_delta` (jsonb)
- `collector_export_status`
- `collector_export_error`

Observability page displays:

- run-level cost/tokens/status
- trace link
- per-agent metrics and failures
- collector export health
- memory references injected per run

## Commercialization

### Subscription Billing

- `create-checkout-session` -> subscription checkout
- `stripe-webhook` -> syncs plan status to `profiles`

### Connect MVP

- `create-connect-account` -> creates Stripe Express account
- `create-connect-checkout-session` -> one-time payment with:
  - `application_fee_amount` (platform fee)
  - transfer to connected account destination

This demonstrates a marketplace-style commercialization path for sponsor evaluation.

## OpenClaw Bridge Mode (External Worker)

Edge functions:

- `queue-youtube-analysis` (user queues YouTube analysis job)
- `openclaw-pull-jobs` (worker polls pending jobs with service token)
- `openclaw-push-insights` (worker pushes structured insights back)

Insights are persisted to:

- `external_insights` (raw/normalized ingest log)
- `agent_memory` (actionable prompt memory for future runs)
