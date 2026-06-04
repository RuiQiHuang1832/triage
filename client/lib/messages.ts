// Turns the persisted Message rows from GET /session/:id into the items the chat thread renders.
// The backend stores one row per content block, so a single assistant turn can span several rows: a text block (content set, no toolName), then one tool_use block per tool it called (toolName set, content empty), then a matching `tool` row carrying that tool's result.
// We render the text blocks as assistant bubbles and collapse each tool_use/result pair into a single badge — driven off the `tool` row, since that's the one that knows whether the call errored.

import type { Message } from "./types";

export type DisplayItem =
  | { kind: "bubble"; id: string; role: "user" | "assistant"; content: string }
  | { kind: "tool"; id: string; tool: string; isError: boolean };

export function toDisplayItems(messages: Message[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      items.push({ kind: "bubble", id: m.id, role: "user", content: m.content });
    } else if (m.role === "assistant") {
      // Skip the assistant's tool_use rows (empty content): the matching `tool` row below represents that call, so rendering both would double up the badge.
      if (m.content.trim()) {
        items.push({ kind: "bubble", id: m.id, role: "assistant", content: m.content });
      }
    } else if (m.role === "tool") {
      items.push({ kind: "tool", id: m.id, tool: m.toolName ?? "", isError: isErrorResult(m.toolResult) });
    }
  }
  return items;
}

// A failed tool stores its result as { error: string } (see executeTool in the agent loop); anything else is a successful payload.
function isErrorResult(result: unknown): boolean {
  return typeof result === "object" && result !== null && "error" in result;
}
