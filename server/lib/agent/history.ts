import type Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@prisma/client";
import { prisma } from "../db.js";

// The entire file is really just "enforce strict alternating turns so the Anthropic API doesn't reject the history."

// `history.ts` reconstructs a session's full conversation from the database into the format the Anthropic API expects. It fetches all message rows oldest-first and loops over them, regrouping flat one-row-per-block (user, assistant, tool — where tool calls and tool results are separate rows) DB records into proper grouped messages ({ role: "assistant", content: [tool_use_block1, tool_use_block2] }), { role: "user", content: [tool_result_block1, tool_result_block2] }. The main merging rule it enforces is that all blocks from a single model response must live in one assistant message, and all tool results must live in one user message immediately after. It also handles the quirk that tool results are sent back as a `role: "user"` turn, using a type check to make sure they never accidentally get merged into a real human text message. Basically whenever you need to resume or continue a session, this is the file that rebuilds the conversation history and hands it back to the API ready to go.

// Fetch all rows for this session oldest-first and regroup them into the shape the Anthropic API expects.
export async function loadHistory(sessionId: string): Promise<Anthropic.MessageParam[]> {
  const rows = await prisma.message.findMany({
    where: { sessionId },
    // createdAt first, then id as a tiebreaker for rows written in the same millisecond.
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return rowsToMessageParams(rows);
}

export function rowsToMessageParams(rows: Message[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  for (const row of rows) {
    // Plain user message — just push it and move on to NEXT iteration.
    if (row.role === "user") {
      messages.push({ role: "user", content: row.content });
      continue;
    }

    if (row.role === "assistant") {
      const block = assistantRowToBlock(row);
      const last = messages.at(-1);
      // If the previous message is already an assistant message, merge this block into it.
      // The API requires all blocks from one model response to live in a single assistant message.
      if (last?.role === "assistant" && Array.isArray(last.content)) {
        last.content.push(block);
      } else {
        messages.push({ role: "assistant", content: [block] });
      }
      continue;
    }

    // Tool results go back to the API as a user turn.
    const block: Anthropic.ToolResultBlockParam = {
      type: "tool_result",
      tool_use_id: row.toolUseId ?? "", // links this result back to the original tool call
      content: JSON.stringify(row.toolResult),
    };
    const last = messages.at(-1);

    // Merge into the previous message only if it's already a tool_result user message.
    // We check the type of the first block because plain user messages also live under role: "user" —
    // we never want to merge a tool result into a real human text message.
    if (last?.role === "user" && Array.isArray(last.content) && last.content[0]?.type === "tool_result") {
      last.content.push(block);
    } else {
      messages.push({ role: "user", content: [block] });
    }
  }

  return messages;
}

// An assistant row is either a tool call (toolName is set) or a plain text response.
function assistantRowToBlock(row: Message): Anthropic.ContentBlockParam {
  if (row.toolName) {
    return {
      type: "tool_use",
      id: row.toolUseId ?? "",
      name: row.toolName,
      input: row.toolInput ?? {},
    };
  }
  return { type: "text", text: row.content };
}
