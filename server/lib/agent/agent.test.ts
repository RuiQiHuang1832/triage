// Smoke test: drives one full agent turn end-to-end against the real database and the real Anthropic API.
// It creates a throwaway Patient + IntakeSession, sends a single patient message, runs the agent loop, and prints the reply.
// Run via `npm run test:agent`. Needs a live DATABASE_URL and ANTHROPIC_API_KEY in server/.env. Costs a few cents per invocation.

import { prisma } from "../db.js";
import { runAgentLoop } from "./agent.js";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Check server/.env and the --env-file flag.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Check server/.env and the --env-file flag.");
  process.exit(1);
}

const patient = await prisma.patient.create({
  data: { name: "Test Patient", dateOfBirth: new Date("1990-01-01") },
});
const session = await prisma.intakeSession.create({
  data: { patientId: patient.id },
});

console.log("patient:", patient.id);
console.log("session:", session.id);

const result = await runAgentLoop(session.id, "I've had a headache for 3 days");

console.log("\n--- reply ---\n" + result.reply);
console.log("\ncomplete:", result.complete);

const messageCount = await prisma.message.count({ where: { sessionId: session.id } });
console.log("messages persisted:", messageCount);

await prisma.$disconnect();
