// The agent loop — the heart of the intake system.
//
// One call to runAgentLoop handles a single patient message end-to-end: it persists that message, asks Claude what to do, and keeps going until Claude is done with this turn. "Done" means one of two things:
//   - end_turn:  Claude responded with text (asked the patient a question) and is waiting for a reply. We return and hand control back to the caller.
//   - tool_use:  Claude wants to run one or more tools. We execute them, feed the results back, and loop so Claude can keep reasoning.
//
// Every block Claude produces and every tool result is written to the Message table as it happens (see history.ts for the matching read side), so a later turn can reload the whole conversation from the database.
//
// The loop streams Claude's response and reports progress through an `emit` callback as it goes: text tokens as they arrive, and tool-call lifecycle events (started/finished). The caller decides what to do with those events — an SSE route forwards them to the browser; a test or smoke script can ignore them and just use the returned AgentResult. The return value is unchanged whether or not anyone is listening.

import Anthropic from "@anthropic-ai/sdk";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { loadHistory } from "./history.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { tools, runTool } from "./tools.js";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;

const MAX_ITERATIONS = 12;

// Shown to the patient once `generate_intake_summary` runs. We return this
// directly rather than letting Claude generate a closing message — the session
// is complete and the interface locks, so there's nothing left to reason about.
const COMPLETION_MESSAGE =
  "Thank you — that's everything I need. I've put together a summary for your clinician, who will review it with you at your visit. Take care.";

const client = new Anthropic();

const EPHEMERAL = { type: "ephemeral" } as const;

const SYSTEM_BLOCKS: Anthropic.TextBlockParam[] = [{ type: "text", text: SYSTEM_PROMPT, cache_control: EPHEMERAL }];

export interface AgentResult {
  reply: string;
  complete: boolean;
}

// Progress events emitted as the loop runs. The frontend turns these into a live
// transcript: `token` text streams into the message bubble, while `tool_call` /
// `tool_result` drive the ToolCallBadge ("🔍 Checking drug interactions…").
// We emit the tool *name* only — the UI owns the wording shown to the patient.
export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool_call"; tool: string }
  | { type: "tool_result"; tool: string; isError: boolean };

export type EmitFn = (event: AgentEvent) => void;

interface SummaryInput {
  chiefComplaint: string;
  symptoms: unknown;
  duration: string;
  medications: unknown;
  allergies: unknown;
  bmi?: number;
  rawSummary: string;
}

// `emit` defaults to a no-op so non-streaming callers (tests, the curl smoke
// test) can ignore progress events and just await the final AgentResult.
export async function runAgentLoop(
  sessionId: string,
  userText: string,
  emit: EmitFn = () => {},
): Promise<AgentResult> {
  await prisma.message.create({
    data: { sessionId, role: "user", content: userText },
  });
  const messages = await loadHistory(sessionId);

  let summaryGenerated = false;
  let cachedTail: CacheableBlock | null = null;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    cachedTail = moveCacheBreakpoint(messages, cachedTail);

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_BLOCKS,
      tools: tools as Anthropic.Tool[],
      messages,
    });

    // Stream text to the patient as Claude writes it.
    stream.on("text", (delta) => emit({ type: "token", text: delta }));

    stream.on("streamEvent", (event) => {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        emit({ type: "tool_call", tool: event.content_block.name });
      }
    });

    // Resolves once the stream is fully assembled — same Message shape the
    // non-streaming create() returned, so the rest of the loop is unchanged.
    const response = await stream.finalMessage();
    console.log("usage:", response.usage);
    await persistAssistantTurn(sessionId, response.content);
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const reply = extractText(response.content);
      return { reply, complete: summaryGenerated };
    }

    if (response.stop_reason !== "tool_use") {
      // max_tokens, refusal, pause_turn, etc. — not something this loop handles yet. Surface it loudly instead of silently returning a half-finished turn.
      throw new Error(`Unexpected stop_reason: ${response.stop_reason}`);
    }

    // Run every tool Claude asked for and collect the results into a single user turn, as the API requires.
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      const { resultForDb, resultForApi, isError } = await executeTool(block.name, block.input);
      emit({ type: "tool_result", tool: block.name, isError });

      if (block.name === "generate_intake_summary" && !isError) {
        await saveSummary(sessionId, block.input as SummaryInput);
        summaryGenerated = true;
      }

      await prisma.message.create({
        data: {
          sessionId,
          role: "tool",
          content: "",
          toolName: block.name,
          toolUseId: block.id,
          toolResult: resultForDb as Prisma.InputJsonValue,
        },
      });

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: resultForApi,
        is_error: isError,
      });
    }


    if (summaryGenerated) {
      return { reply: COMPLETION_MESSAGE, complete: true };
    }

    messages.push({ role: "user", content: toolResults });
    // Loop back: Claude now sees the tool results and decides what to do next (ask a follow-up, call another tool, or wrap up).
  }

  throw new Error(`Agent loop exceeded ${MAX_ITERATIONS} iterations without completing a turn`);
}

// Write one Message row per content block. Text and tool calls are stored as separate rows (one row per block) so history.ts can reconstruct them exactly.
async function persistAssistantTurn(sessionId: string, content: Anthropic.ContentBlock[]): Promise<void> {
  for (const block of content) {
    if (block.type === "text") {
      await prisma.message.create({
        data: { sessionId, role: "assistant", content: block.text },
      });
    } else if (block.type === "tool_use") {
      await prisma.message.create({
        data: {
          sessionId,
          role: "assistant",
          content: "",
          toolName: block.name,
          toolUseId: block.id,
          toolInput: block.input as Prisma.InputJsonValue,
        },
      });
    }
    // Other block types (e.g. thinking) aren't enabled, so there's nothing to persist.
  }
}

// Run a tool, returning both the raw result (for the DB) and a stringified version (for the API). A thrown tool error is caught and turned into an error result so Claude can react to it instead of the whole turn crashing.
async function executeTool(name: string, input: unknown): Promise<{ resultForDb: unknown; resultForApi: string; isError: boolean }> {
  try {
    const result = await runTool(name, input);
    return { resultForDb: result, resultForApi: JSON.stringify(result), isError: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const resultForDb = { error: message };
    return { resultForDb, resultForApi: JSON.stringify(resultForDb), isError: true };
  }
}

// Persist the final structured summary and flip the session to completed. relevantHistory and any red flags aren't separate columns — they live in the rawSummary prose the clinician reads.
async function saveSummary(sessionId: string, summary: SummaryInput): Promise<void> {
  await prisma.intakeSummary.create({
    data: {
      sessionId,
      chiefComplaint: summary.chiefComplaint,
      symptoms: summary.symptoms as Prisma.InputJsonValue,
      duration: summary.duration,
      medications: summary.medications as Prisma.InputJsonValue,
      allergies: summary.allergies as Prisma.InputJsonValue,
      bmi: summary.bmi ?? null,
      rawSummary: summary.rawSummary,
    },
  });
  await prisma.intakeSession.update({
    where: { id: sessionId },
    data: { status: "completed", completedAt: new Date() },
  });
}

type CacheableBlock = { cache_control?: Anthropic.CacheControlEphemeral | null };
// Move the EPHEMERAL cache control forward to the last block in the current response, so the next request can reuse all preceding blocks (system prompt, tool definitions, and any content blocks before the last one). This is a simple way to get a big chunk of tokens cached without needing special support from the API. If the last block isn't text or tool_use, we won't get caching this turn but that's an acceptable tradeoff for simplicity.
function moveCacheBreakpoint(messages: Anthropic.MessageParam[], previous: CacheableBlock | null): CacheableBlock | null {
  if (previous) delete previous.cache_control;

  const last = messages.at(-1);
  if (!last) return null;
  // If the last block is a string, turn it into a text block so we can attach cache_control to it. This lets us cache even if the last block of the response is a simple text message instead of a tool call. (In practice, most turns end with a text block, so this covers the common case of caching right up to the end of the response.) Anthropic's API accepts a string or an array of blocks as the content of a message, but the cache_control property only works on blocks, so we have to do this dance to support caching in both cases.
  if (typeof last.content === "string") {
    const block: Anthropic.TextBlockParam = { type: "text", text: last.content };
    last.content = [block];
    block.cache_control = EPHEMERAL;
    return block;
  }

  const block = last.content.at(-1) as CacheableBlock | undefined;
  if (!block) return null;
  block.cache_control = EPHEMERAL;
  return block;
}

// Join the text blocks of a response into the plain message shown to the patient.
function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}
