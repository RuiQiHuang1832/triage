import { calculateBmi, runTool } from "./tools.js";

const cases = [
  { heightInches: 70, weightPounds: 150 }, // normal
  { heightInches: 70, weightPounds: 120 }, // underweight
  { heightInches: 70, weightPounds: 190 }, // overweight
  { heightInches: 70, weightPounds: 230 }, // obese
  { heightInches: 64, weightPounds: 140 }, // 5'4" 140lb
];

for (const c of cases) {
  console.log(`${c.heightInches}in / ${c.weightPounds}lb →`, calculateBmi(c));
}

console.log("via runTool →", await runTool("calculate_bmi", { heightInches: 70, weightPounds: 150 }));
