// Registry for the intake agent's tools. Each tool lives in its own file under
// ./tools/ and exports a ToolDefinition (the Anthropic schema sent to Claude)
// plus a handler (executed when Claude calls the tool). To add a new tool:
// create the file, import its definition + handler here, then wire both into
// the `tools` array and the `runTool` switch.

import { calculateBmi, calculateBmiTool } from "./tools/calculate-bmi.js";
import {
  checkDrugInteraction,
  checkDrugInteractionTool,
} from "./tools/check-drug-interaction.js";
import {
  lookupConditionInfo,
  lookupConditionInfoTool,
} from "./tools/lookup_condition_info.js";
import {
  generateIntakeSummary,
  generateIntakeSummaryTool,
} from "./tools/generate_intake_summary.js";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const tools: ToolDefinition[] = [
  calculateBmiTool,
  checkDrugInteractionTool,
  lookupConditionInfoTool,
  generateIntakeSummaryTool,
];

export async function runTool(name: string, input: unknown): Promise<unknown> {
  switch (name) {
    case "calculate_bmi":
      return calculateBmi(input as Parameters<typeof calculateBmi>[0]);
    case "check_drug_interaction":
      return checkDrugInteraction(
        input as Parameters<typeof checkDrugInteraction>[0],
      );
    case "lookup_condition_info":
      return lookupConditionInfo(
        input as Parameters<typeof lookupConditionInfo>[0],
      );
    case "generate_intake_summary":
      return generateIntakeSummary(
        input as Parameters<typeof generateIntakeSummary>[0],
      );
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
