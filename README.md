# Triage — Agentic Health Intake System

An AI-driven health intake system that conducts a structured, multi-turn conversation with a patient, asks intelligent follow-up questions based on their answers, calls real external medical APIs, and produces a clean pre-visit summary for the clinician.

The agent isn't just answering turn by turn — it drives the conversation toward a goal. Powered by Claude with tool use, it decides mid-conversation when to check a drug interaction, look up a condition, or wrap up the intake.

> **Note:** This is a demo project and is not intended for real medical use.

https://github.com/user-attachments/assets/d1244727-4158-4b89-acc1-8b29410a84fe

## How It Works

Each patient message runs through an agent loop on the backend:

```
User message
  → Sent to Claude with the full history + available tools
    → Claude either asks a focused follow-up question
      or calls a tool (drug interaction, condition lookup, BMI)
        → Backend runs the tool, feeds the result back
        → Claude keeps reasoning
  → Repeats until Claude has enough to call generate_intake_summary
    → Summary is saved and shown to the clinician
```

## Features

- **Goal-directed intake** — collects chief complaint, symptoms, duration, severity, medications, allergies, and relevant history, asking one focused question at a time.
- **Real external tools** — Claude calls live, free medical APIs during the conversation:
  - `check_drug_interaction` — RxNorm + OpenFDA
  - `lookup_condition_info` — MedlinePlus (NIH)
  - `calculate_bmi` — height/weight → BMI + category
  - `generate_intake_summary` — produces the structured pre-visit summary
- **Live chat interface** — Claude's replies stream token by token alongside a typing indicator and tool-call badges that surface what the agent is doing in the moment (e.g. "Checking drug interactions…"), making the agentic behavior visible as it happens.
- **Session history & resume** — every message and tool result is persisted; past intakes appear in a sidebar under short AI-generated titles and can be reopened, continued, or deleted. Identity is per-browser, so there's no account to create.
- **Pre-visit summaries** — a completed intake produces a formatted summary — chief complaint, symptoms, medications, allergies, BMI, and a clinical narrative — browseable any time from a dedicated Summaries page.
- **Prompt caching** — the system prompt, tool definitions, and conversation history are cached to cut token cost across turns.

## Tech Stack

**Backend**
- Node.js + TypeScript
- Anthropic Claude API with tool use — `claude-sonnet-4-6` runs the intake agent, `claude-haiku-4-5` titles sessions
- Prisma ORM + PostgreSQL (Supabase)
- Express HTTP layer with Server-Sent Events (SSE) for streaming

**Frontend**
- Next.js 16 + React 19, TypeScript
- Tailwind CSS v4, shadcn/ui, lucide-react icons
- Streaming chat UI that consumes the backend SSE stream (`@microsoft/fetch-event-source`)
- react-markdown for rendering the summary, Vercel Web Analytics
