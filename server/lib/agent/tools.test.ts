import { runTool } from "./tools.js";
import { calculateBmi } from "./tools/calculate-bmi.js";

console.log("=== calculate_bmi ===");
const bmiCases = [
  { heightInches: 70, weightPounds: 150 }, // normal
  { heightInches: 70, weightPounds: 120 }, // underweight
  { heightInches: 70, weightPounds: 190 }, // overweight
  { heightInches: 70, weightPounds: 230 }, // obese
  { heightInches: 64, weightPounds: 140 }, // 5'4" 140lb
];

for (const c of bmiCases) {
  console.log(`${c.heightInches}in / ${c.weightPounds}lb →`, calculateBmi(c));
}

console.log("via runTool →", await runTool("calculate_bmi", { heightInches: 70, weightPounds: 150 }));

console.log("\n=== check_drug_interaction ===");
const drugCases: { label: string; drugs: string[] }[] = [
  { label: "metformin + ibuprofen (direct labels)", drugs: ["metformin", "ibuprofen"] },
  { label: "Tylenol (brand → ingredient fallback)", drugs: ["Tylenol"] },
  { label: "Bactrim (combination, multi-ingredient)", drugs: ["Bactrim"] },
  { label: "typo: tylenoll (approximate match)", drugs: ["tylenoll"] },
  { label: "unknown: notarealdrug12345", drugs: ["notarealdrug12345"] },
  { label: "mixed batch", drugs: ["warfarin", "aspirin", "Lipitor"] },
];

for (const c of drugCases) {
  console.log(`\n--- ${c.label} ---`);
  const result = (await runTool("check_drug_interaction", { drugs: c.drugs })) as {
    drugs: {
      inputName: string;
      resolvedName: string | null;
      source: string;
      brandNames: string[];
      genericNames: string[];
      interactionsText: string | null;
    }[];
  };
  for (const d of result.drugs) {
    console.log(`  ${d.inputName.padEnd(20)} → ${d.source}`);
    console.log(`    resolved: ${d.resolvedName ?? "(none)"}`);
    console.log(`    brands:   ${d.brandNames.slice(0, 3).join(", ") || "(none)"}`);
    console.log(`    generics: ${d.genericNames.slice(0, 3).join(", ") || "(none)"}`);
    console.log(`    interactions: ${truncate(d.interactionsText, 180)}`);
  }
}

function truncate(value: string | null, max: number): string {
  if (!value) return "(none)";
  const oneLine = value.replace(/\s+/g, " ");
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

console.log("\n=== lookup_condition_info ===");
const conditionCases: { label: string; query: string }[] = [
  { label: "asthma (canonical condition)", query: "asthma" },
  { label: "GERD (acronym)", query: "GERD" },
  { label: "type 2 diabetes (multi-word)", query: "type 2 diabetes" },
  { label: "chronic lower back pain (symptom phrase)", query: "chronic lower back pain" },
  { label: "nonsense (no match)", query: "xyzzynonsense" },
];

for (const c of conditionCases) {
  console.log(`\n--- ${c.label} ---`);
  const result = (await runTool("lookup_condition_info", { query: c.query })) as {
    query: string;
    total: number;
    topics: {
      title: string;
      url: string | null;
      organizationName: string | null;
      snippet: string | null;
      fullSummary: string | null;
    }[];
  };
  console.log(`  total=${result.total}, topics=${result.topics.length}`);
  for (const t of result.topics) {
    console.log(`  - ${t.title} [${t.organizationName ?? "n/a"}]`);
    console.log(`    url:     ${t.url ?? "n/a"}`);
    console.log(`    snippet: ${truncate(t.snippet, 120)}`);
    console.log(`    summary: ${truncate(t.fullSummary, 200)}`);
  }
}

console.log("\n=== generate_intake_summary ===");

const fullMockSummary = {
  chiefComplaint: "Persistent dry cough for the past three weeks.",
  symptoms: [
    {
      description: "dry cough, worse at night",
      severity: "moderate",
      duration: "3 weeks",
    },
    {
      description: "shortness of breath when climbing stairs",
      severity: "mild",
      duration: "2 weeks",
    },
    {
      description: "occasional wheeze",
      severity: "mild",
    },
  ],
  duration: "3 weeks",
  medications: [
    { name: "lisinopril", dose: "10mg", frequency: "once daily" },
    { name: "ibuprofen", dose: "200mg", frequency: "as needed" },
  ],
  allergies: ["penicillin"],
  relevantHistory: ["hypertension diagnosed 2 years ago", "ex-smoker, quit 5 years ago"],
  bmi: 26.4,
  rawSummary:
    "45-year-old patient presenting with 3 weeks of dry nocturnal cough and 2 weeks of exertional " +
    "shortness of breath. Current meds include lisinopril (ACE-inhibitor cough is on the differential) " +
    "and PRN ibuprofen. PMH notable for HTN and remote smoking history. BMI 26.4 (overweight). " +
    "Penicillin allergy noted.",
};

console.log("\n--- full mock (happy path) ---");
const happy = await runTool("generate_intake_summary", fullMockSummary);
console.log(JSON.stringify(happy, null, 2));

console.log("\n--- minimal required fields ---");
const minimal = await runTool("generate_intake_summary", {
  chiefComplaint: "Headache.",
  symptoms: [{ description: "frontal headache" }],
  duration: "2 days",
  medications: [],
  allergies: ["none reported"],
  rawSummary: "Patient reports a 2-day frontal headache. No meds, no known allergies.",
});
console.log(JSON.stringify(minimal, null, 2));

console.log("\n--- validation: missing chiefComplaint ---");
try {
  await runTool("generate_intake_summary", {
    symptoms: [{ description: "x" }],
    duration: "1d",
    medications: [],
    allergies: [],
    rawSummary: "x",
  });
  console.log("  UNEXPECTED: did not throw");
} catch (err) {
  console.log(`  threw: ${(err as Error).message}`);
}

console.log("\n--- validation: empty symptoms ---");
try {
  await runTool("generate_intake_summary", {
    chiefComplaint: "x",
    symptoms: [],
    duration: "1d",
    medications: [],
    allergies: [],
    rawSummary: "x",
  });
  console.log("  UNEXPECTED: did not throw");
} catch (err) {
  console.log(`  threw: ${(err as Error).message}`);
}

console.log("\n--- validation: missing rawSummary ---");
try {
  await runTool("generate_intake_summary", {
    chiefComplaint: "x",
    symptoms: [{ description: "x" }],
    duration: "1d",
    medications: [],
    allergies: [],
  });
  console.log("  UNEXPECTED: did not throw");
} catch (err) {
  console.log(`  threw: ${(err as Error).message}`);
}
