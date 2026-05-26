import { searchHealthTopics } from "./medlineplus.js";

const queries = [
  "asthma",
  "GERD",
  "diabetes type 2",
  "chronic lower back pain",
  "xyzzynonsense",
];

for (const q of queries) {
  const result = await searchHealthTopics(q);
  console.log(`\n=== "${q}" (total=${result.total}) ===`);
  for (const topic of result.topics) {
    console.log(`- ${topic.title} [${topic.organizationName ?? "n/a"}]`);
    console.log(`  url: ${topic.url ?? "n/a"}`);
    console.log(`  snippet: ${truncate(topic.snippet, 120)}`);
    console.log(`  summary: ${truncate(topic.fullSummary, 200)}`);
  }
}

function truncate(value: string | null, max: number): string {
  if (!value) return "n/a";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
