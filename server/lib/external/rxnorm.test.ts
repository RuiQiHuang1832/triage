import { resolveDrug, getIngredients } from "./rxnorm.js";

const drugs = ["metformin", "Tylenol", "edvil", "notarealdrug12345", "metphormin", "tylenoll"];

for (const drug of drugs) {
  const result = await resolveDrug(drug);
  console.log(`${drug.padEnd(20)} →`, result);
}

console.log("\n=== getIngredients ===");
for (const drug of ["Tylenol", "Advil", "Lipitor", "Bactrim"]) {
  const match = await resolveDrug(drug);
  if (!match) {
    console.log(`${drug.padEnd(20)} → no match`);
    continue;
  }
  const ingredients = await getIngredients(match.rxcui);
  console.log(`${drug.padEnd(20)} →`, ingredients);
}
