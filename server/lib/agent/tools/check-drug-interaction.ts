import { resolveDrug, getIngredients } from "../../external/rxnorm.js";
import { fetchLabelByName, type DrugLabel } from "../../external/openfda.js";
import type { ToolDefinition } from "../tools.js";

// Purpose: surface documented interactions for the clinician's summary and sharpen Claude's follow-up questions (e.g. patient on warfarin + new NSAID → ask about bruising/bleeding). NOT for advising the patient — never relay clinical interpretations back to them.

interface CheckDrugInteractionInput {
  drugs: string[];
}

interface DrugInteractionEntry {
  inputName: string;
  resolvedName: string | null;
  rxcui: string | null;
  brandNames: string[];
  genericNames: string[];
  interactionsText: string | null;
  source: "label" | "ingredient-fallback" | "not-found-rxnorm" | "not-found-openfda";
}

interface CheckDrugInteractionResult {
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
  if (direct) {
    return {
      inputName: name,
      resolvedName: match.name,
      rxcui: match.rxcui,
      brandNames: direct.brandNames,
      genericNames: direct.genericNames,
      interactionsText: direct.interactionsText,
      source: "label",
    };
  }

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

export async function checkDrugInteraction(
  input: CheckDrugInteractionInput,
): Promise<CheckDrugInteractionResult> {
  if (!Array.isArray(input.drugs) || input.drugs.length === 0) {
    throw new Error("drugs must be a non-empty array of strings");
  }
  const drugs = await Promise.all(input.drugs.map(lookupOneDrug));
  return { drugs };
}
