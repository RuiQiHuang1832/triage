import { fetchLabelByName } from "./openfda.js";

const names = ["metformin", "Tylenol", "ibuprofen", "notarealdrug12345", "ACETAMINOPHEN"];

for (const name of names) {
  const label = await fetchLabelByName(name);
  console.log(`\n=== ${name} ===`);
  if (!label) {
    console.log("no label found");
    continue;
  }
  console.log("brandNames:  ", label.brandNames.slice(0, 3));
  console.log("genericNames:", label.genericNames.slice(0, 3));
  console.log("interactions:", label.interactionsText?.slice(0, 200) ?? "(none)");
}
