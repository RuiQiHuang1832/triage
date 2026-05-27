import { searchHealthTopics, type HealthTopic } from "../../external/medlineplus.js";
import type { ToolDefinition } from "../tools.js";

// Purpose: ground Claude's follow-up questioning in NIH-sourced condition info (e.g. suspected migraine → ask about aura, triggers, photophobia) and let the summary cite real sources for the clinician. Largely a demo of external grounding — NOT for educating the patient about conditions.

interface LookupConditionInfoInput {
  query: string;
  maxResults?: number;
}

interface LookupConditionInfoResult {
  query: string;
  total: number;
  topics: HealthTopic[];
}

export const lookupConditionInfoTool: ToolDefinition = {
  name: "lookup_condition_info",
  description:
    "Look up plain-language condition information from MedlinePlus (NIH/NLM consumer health topics). " +
    "Use this once enough symptoms have been gathered to form a likely hypothesis, or when the patient " +
    "names a condition you want grounded information about. Returns NIH-sourced topic titles, snippets, " +
    "and full summaries that you can cite in the final intake summary. " +
    "IMPORTANT: this is a keyword search (not semantic search). Pass a tight query — a likely condition " +
    "name ('asthma', 'GERD', 'type 2 diabetes') or a short symptom phrase ('chronic lower back pain'). " +
    "Do NOT pass full sentences or paste the patient's words verbatim; reason first, then query.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "A condition name or short symptom phrase. Keep it under ~6 words. " +
          "Examples: 'asthma', 'GERD', 'chronic lower back pain'.",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of topics to return. Defaults to 3. Cap at 5.",
      },
    },
    required: ["query"],
  },
};

export async function lookupConditionInfo(
  input: LookupConditionInfoInput,
): Promise<LookupConditionInfoResult> {
  const query = input.query?.trim();
  if (!query) {
    throw new Error("query must be a non-empty string");
  }
  const maxResults = Math.min(Math.max(input.maxResults ?? 3, 1), 5);
  return searchHealthTopics(query, maxResults);
}
