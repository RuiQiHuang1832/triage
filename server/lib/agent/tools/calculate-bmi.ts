import type { ToolDefinition } from "../tools.js";

// Purpose: enrich the intake summary with a clinician-ready BMI value. Not used to advise the patient — BMI is recorded for the doctor reading the hand-off.

interface CalculateBmiInput {
  heightInches: number;
  weightPounds: number;
}

interface CalculateBmiResult {
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
