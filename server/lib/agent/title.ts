// Generates the short label shown for a session in the sidebar.
//
// This is deliberately separate from the agent loop: it's a single cheap, non-streaming
// call on a small model that turns the patient's first message into a 3-6 word headline
// (the chief complaint), so the sidebar reads like "Persistent Lower Back Pain" instead of
// echoing whatever the patient typed verbatim. It never throws — callers treat a failure as
// "no title yet" and fall back to the first message.

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 32;

// Hard cap so a runaway response can't produce an absurdly long sidebar label.
const MAX_TITLE_LENGTH = 60;

const SYSTEM_PROMPT = `You write a short title for a medical intake conversation, based on the patient's first message.

Reply with ONLY the title — no preamble, no quotes, no trailing punctuation.
- 3 to 6 words, capitalized like a headline.
- Name the chief complaint (e.g. "Persistent Lower Back Pain", "Recurring Migraines and Nausea", "Sore Throat and Fever").
- If the message is a greeting or too vague to name a complaint, reply exactly: New Intake`;

// Returns a cleaned title, or null when the model gives us nothing usable (caller falls back to the first message).
export async function generateSessionTitle(firstMessage: string): Promise<string | null> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: firstMessage }],
  });

  const raw = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  return cleanTitle(raw);
}

// Strip wrapping quotes and trailing punctuation the model sometimes adds, collapse whitespace, and enforce the length cap. Returns null for an empty result.
function cleanTitle(raw: string): string | null {
  const cleaned = raw
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/[.\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_TITLE_LENGTH ? `${cleaned.slice(0, MAX_TITLE_LENGTH).trimEnd()}…` : cleaned;
}
