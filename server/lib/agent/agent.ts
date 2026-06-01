// The agent loop — the heart of the intake system.
//
// One call to runAgentLoop handles a single patient message end-to-end: it persists that message, asks Claude what to do, and keeps going until Claude is done with this turn. "Done" means one of two things:
//   - end_turn:  Claude responded with text (asked the patient a question) and is waiting for a reply. We return and hand control back to the caller.
//   - tool_use:  Claude wants to run one or more tools. We execute them, feed the results back, and loop so Claude can keep reasoning.
//
// Every block Claude produces and every tool result is written to the Message table as it happens (see history.ts for the matching read side), so a later turn can reload the whole conversation from the database.

import Anthropic from "@anthropic-ai/sdk";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { loadHistory } from "./history.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { tools, runTool } from "./tools.js";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;

const MAX_ITERATIONS = 12;

const client = new Anthropic();

export interface AgentResult {
  reply: string;
  complete: boolean;
}

interface SummaryInput {
  chiefComplaint: string;
  symptoms: unknown;
  duration: string;
  medications: unknown;
  allergies: unknown;
  bmi?: number;
  rawSummary: string;
}

export async function runAgentLoop(sessionId: string, userText: string): Promise<AgentResult> {
  await prisma.message.create({
    data: { sessionId, role: "user", content: userText },
  });
  const messages = await loadHistory(sessionId);

  let summaryGenerated = false;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: tools as Anthropic.Tool[],
      messages,
    });

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

// Join the text blocks of a response into the plain message shown to the patient.
function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}
