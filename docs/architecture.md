# Multi-Agent Architecture (Anyway + Animoca)

## Overview

The system runs a server-orchestrated, 4-agent content swarm per video run:

- `HookAgent` -> generates viral opening hooks
- `ScriptAgent` -> generates script draft
- `TitleAgent` -> generates title + thumbnail text ideas
- `StrategyAgent` -> generates distribution/retention strategy

Each run is persisted in `runs`, outputs in `artifacts`, user feedback in `run_feedback`, and long-term preference memory in `agent_memory`.

## Execution Flow

1. Frontend `VideoDetail` calls `run-pipeline` edge function.
2. Function authenticates user and validates video ownership.
3. Function creates a `runs` row with status `running`.
4. Orchestrator loads memory context from:
   - `agent_memory` (global + video scoped)
   - last `run_feedback` entries
5. Each specialist agent executes one OpenAI call with explicit role prompt.
6. Per-agent metrics are captured (`latency`, `tokens`, `cost`, `status`).
7. Artifacts are inserted with `agent_name` and `agent_version`.
8. Run is updated with aggregated cost/tokens and `agent_metrics` JSON.
9. Anyway events are emitted (trace start/end + span events) and trace URL is persisted.

## Memory + Cognition Loop

- User can submit structured run feedback via `submit-run-feedback`:
  - `too_long`
  - `not_engaging`
  - `wrong_tone`
  - `poor_hook`
  - `other`
- Feedback is written to `run_feedback` and summarized into `agent_memory`.
- Next run injects this memory into all agent prompts so generation adapts.

## Observability

Stored on `runs`:

- `trace_id`
- `trace_url`
- `cost_tokens`
- `cost_usd`
- `error_message`
- `agent_metrics` (jsonb)

Observability page displays:

- run-level cost/tokens/status
- trace link
- per-agent metrics and failures

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
