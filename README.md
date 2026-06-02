# Agentic Health Intake

An AI-driven health intake system that conducts a structured, multi-turn conversation with a patient, asks intelligent follow-up questions based on their answers, calls real external medical APIs, and produces a clean pre-visit summary for the clinician.

The agent isn't just answering turn by turn — it drives the conversation toward a goal. Powered by Claude with tool use, it decides mid-conversation when to check a drug interaction, look up a condition, or wrap up the intake.

> **Note:** This is a demo project and is not intended for real medical use.

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
- **Streaming responses** — Claude's output and tool-call lifecycle events stream as they happen, so the UI can show live progress (e.g. "Checking drug interactions…").
- **Full conversation persistence** — every message and tool result is written to the database, so a session can be reloaded and resumed.
- **Prompt caching** — the system prompt, tool definitions, and conversation history are cached to cut token cost across turns.

## Tech Stack

**Backend**
- Node.js + TypeScript
- Anthropic Claude API (`claude-sonnet-4`) with tool use
- Prisma ORM + PostgreSQL (Supabase)
- Express (planned for the HTTP/SSE layer)

**Frontend** *(coming soon)*
- Next.js 15, TypeScript, Tailwind, shadcn/ui
