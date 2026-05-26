// Tool definitions + handlers for the intake agent.
// Each tool is a pair: an Anthropic tool schema (sent to Claude) and a handler
// (executed by the backend when Claude calls the tool).

import { resolveDrug, getIngredients } from "../external/rxnorm.js";
import { fetchLabelByName, type DrugLabel } from "../external/openfda.js";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface CalculateBmiInput {
  heightInches: number;
  weightPounds: number;
}

export interface CalculateBmiResult {
  bmi: number;
  category: "underweight" | "normal" | "overweight" | "obese";
}

export const calculateBmiTool: ToolDefinition = {
  name: "calculate_bmi",
  description:
    "Calculate Body Mass Index from a patient's height and weight. " +
    "Inputs are imperial units (inches and pounds). " +
    "Convert metric values to imperial before calling. " +
    "Returns the BMI value (rounded to 1 decimal) and a category " +
    "(underweight, normal, overweight, obese).",
  input_schema: {
    type: "object",
    properties: {
      heightInches: {
        type: "number",
        description: "Patient height in inches. Example: 5'10\" is 70.",
      },
      weightPounds: {
        type: "number",
        description: "Patient weight in pounds.",
      },
    },
    required: ["heightInches", "weightPounds"],
  },
};

export function calculateBmi(input: CalculateBmiInput): CalculateBmiResult {
  const { heightInches, weightPounds } = input;
  if (heightInches <= 0 || weightPounds <= 0) {
    throw new Error("heightInches and weightPounds must be positive");
  }

  const raw = (703 * weightPounds) / (heightInches * heightInches);
  const bmi = Math.round(raw * 10) / 10;

  let category: CalculateBmiResult["category"];
  if (bmi < 18.5) category = "underweight";
  else if (bmi < 25) category = "normal";
  else if (bmi < 30) category = "overweight";
  else category = "obese";

  return { bmi, category };
}

export interface CheckDrugInteractionInput {
  drugs: string[];
}

export interface DrugInteractionEntry {
  inputName: string;
  resolvedName: string | null;
  rxcui: string | null;
  brandNames: string[];
  genericNames: string[];
  interactionsText: string | null;
  // How we found the label. "label" = matched OpenFDA on the resolved RxNorm name directly.
  // "ingredient-fallback" = the brand name had no label, so we retried with its active
  // ingredient(s). "not-found-rxnorm" = RxNorm didn't recognize the name at all (likely
  // a typo or non-drug). "not-found-openfda" = RxNorm recognized it but OpenFDA had no
  // label with an interactions section (common for OTC products).
  source: "label" | "ingredient-fallback" | "not-found-rxnorm" | "not-found-openfda";
}

export interface CheckDrugInteractionResult {
  drugs: DrugInteractionEntry[];
}

export const checkDrugInteractionTool: ToolDefinition = {
  name: "check_drug_interaction",
  description:
    "Look up documented drug interaction warnings for one or more medications the patient mentioned. " +
    "For each drug, returns the canonical name (RxNorm), brand/generic names, and the free-text " +
    "drug-interactions section from the FDA-approved label (OpenFDA). " +
    "This tool does NOT compute pairwise interactions between two drugs — it returns each drug's " +
    "documented interaction warnings, and you must read across them to identify shared substances " +
    "or contraindications. Call this whenever the patient mentions one or more current medications.",
  input_schema: {
    type: "object",
    properties: {
      drugs: {
        type: "array",
        items: { type: "string" },
        description:
          "Drug names as the patient said them (brand or generic, e.g. ['metformin', 'Tylenol']). " +
          "Misspellings are tolerated — RxNorm performs approximate matching.",
      },
    },
    required: ["drugs"],
  },
};

async function lookupOneDrug(name: string): Promise<DrugInteractionEntry> {
  const match = await resolveDrug(name);
  if (!match) {
    return {
      inputName: name,
      resolvedName: null,
      rxcui: null,
      brandNames: [],
      genericNames: [],
      interactionsText: null,
      source: "not-found-rxnorm",
    };
  }

  const direct = match.name ? await fetchLabelByName(match.name) : null;
  if (direct) return toEntry(name, match.rxcui, match.name, direct, "label");

  // Brand names (e.g. Tylenol, Bactrim) often lack a label of their own — retry with
  // each active ingredient. For combination products we collect every ingredient label
  // we can find and concatenate them, since each ingredient has its own interaction
  // profile and Claude needs to see them all to reason about cross-drug conflicts.
  const ingredients = await getIngredients(match.rxcui);
  const ingredientLabels = (
    await Promise.all(ingredients.map((ing) => fetchLabelByName(ing.name)))
  ).filter((l): l is DrugLabel => l !== null);

  if (ingredientLabels.length > 0) {
    return {
      inputName: name,
      resolvedName: match.name,
      rxcui: match.rxcui,
      brandNames: dedupe(ingredientLabels.flatMap((l) => l.brandNames)),
      genericNames: dedupe(ingredientLabels.flatMap((l) => l.genericNames)),
      interactionsText: ingredientLabels
        .map((l) => `[${l.queriedName}]\n${l.interactionsText ?? "(no interactions section)"}`)
        .join("\n\n---\n\n"),
      source: "ingredient-fallback",
    };
  }

  return {
    inputName: name,
    resolvedName: match.name,
    rxcui: match.rxcui,
    brandNames: [],
    genericNames: [],
    interactionsText: null,
    source: "not-found-openfda",
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function toEntry(
  inputName: string,
  rxcui: string,
  resolvedName: string | null,
  label: DrugLabel,
  source: DrugInteractionEntry["source"],
): DrugInteractionEntry {
  return {
    inputName,
    resolvedName,
    rxcui,
    brandNames: label.brandNames,
    genericNames: label.genericNames,
    interactionsText: label.interactionsText,
    source,
  };
}

export async function checkDrugInteraction(
  input: CheckDrugInteractionInput,
): Promise<CheckDrugInteractionResult> {
  if (!Array.isArray(input.drugs) || input.drugs.length === 0) {
    throw new Error("drugs must be a non-empty array of strings");
  }
  const drugs = await Promise.all(input.drugs.map(lookupOneDrug));
  return { drugs };
}

export const tools: ToolDefinition[] = [calculateBmiTool, checkDrugInteractionTool];

export async function runTool(
  name: string,
  input: unknown,
): Promise<unknown> {
  switch (name) {
    case "calculate_bmi":
      return calculateBmi(input as CalculateBmiInput);
    case "check_drug_interaction":
      return checkDrugInteraction(input as CheckDrugInteractionInput);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
