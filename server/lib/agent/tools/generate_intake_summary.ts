import type { ToolDefinition } from "../tools.js";

// Purpose: terminal tool that ends the intake by handing the clinician a structured pre-visit summary. This is the actual goal of the agent loop — every other tool exists to make this summary more accurate.

interface Symptom {
  description: string;
  severity?: "mild" | "moderate" | "severe";
  duration?: string;
  location?: string;
}

interface Medication {
  name: string;
  dose?: string;
  frequency?: string;
}

interface GenerateIntakeSummaryInput {
  chiefComplaint: string;
  symptoms: Symptom[];
  duration: string;
  medications: Medication[];
  allergies: string[];
  relevantHistory?: string[];
  bmi?: number;
  rawSummary: string;
}

interface GenerateIntakeSummaryResult {
  ok: true;
  summary: GenerateIntakeSummaryInput;
}

export const generateIntakeSummaryTool: ToolDefinition = {
  name: "generate_intake_summary",
  description:
    "Finalize the intake by submitting the structured pre-visit summary. Call this ONLY when you have " +
    "gathered enough information across chief complaint, symptom details, duration, medications, " +
    "allergies, and relevant history to produce a useful hand-off to the clinician. " +
    "Calling this tool ends the intake — do not call it prematurely. " +
    "You are the one assembling the summary; the tool simply stores what you pass in.",
  input_schema: {
    type: "object",
    properties: {
      chiefComplaint: {
        type: "string",
        description:
          "The primary reason the patient is here, in one short sentence. " +
          "Example: 'Persistent dry cough for the past three weeks.'",
      },
      symptoms: {
        type: "array",
        description:
          "All symptoms the patient described, each as a structured entry. " +
          "Include the patient's own words in description when useful.",
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "What the symptom is. Example: 'shortness of breath when climbing stairs'.",
            },
            severity: {
              type: "string",
              enum: ["mild", "moderate", "severe"],
              description: "Patient-reported severity, mapped to one of these three buckets.",
            },
            duration: {
              type: "string",
              description: "How long this specific symptom has been present. Example: '2 weeks'.",
            },
            location: {
              type: "string",
              description: "Body location if applicable. Example: 'lower right abdomen'.",
            },
          },
          required: ["description"],
        },
      },
      duration: {
        type: "string",
        description:
          "Overall duration of the chief complaint. Example: '3 weeks' or 'since last Tuesday'.",
      },
      medications: {
        type: "array",
        description: "All current medications the patient is taking, prescription or OTC.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Drug name as the patient said it." },
            dose: { type: "string", description: "Dose if known. Example: '500mg'." },
            frequency: { type: "string", description: "Frequency if known. Example: 'twice daily'." },
          },
          required: ["name"],
        },
      },
      allergies: {
        type: "array",
        description: "Known allergies (drugs, food, environmental). Use ['none reported'] if explicitly none.",
        items: { type: "string" },
      },
      relevantHistory: {
        type: "array",
        description:
          "Relevant past medical history the patient mentioned (chronic conditions, prior surgeries, " +
          "family history). Omit if nothing relevant came up.",
        items: { type: "string" },
      },
      bmi: {
        type: "number",
        description: "BMI value if calculated during the intake via calculate_bmi. Omit if not measured.",
      },
      rawSummary: {
        type: "string",
        description:
          "A full prose pre-visit summary the clinician can read top-to-bottom. Synthesize everything " +
          "above into clear, professional clinical language. This is what the doctor reads first.",
      },
    },
    required: [
      "chiefComplaint",
      "symptoms",
      "duration",
      "medications",
      "allergies",
      "rawSummary",
    ],
  },
};

export async function generateIntakeSummary(
  input: GenerateIntakeSummaryInput,
): Promise<GenerateIntakeSummaryResult> {
  if (!input?.chiefComplaint?.trim()) {
    throw new Error("chiefComplaint is required");
  }
  if (!input?.rawSummary?.trim()) {
    throw new Error("rawSummary is required");
  }
  if (!Array.isArray(input.symptoms) || input.symptoms.length === 0) {
    throw new Error("symptoms must be a non-empty array");
  }
  return { ok: true, summary: input };
}
