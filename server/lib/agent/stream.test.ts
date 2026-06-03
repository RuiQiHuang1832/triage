// Streaming smoke test: drives one agent turn and prints every emitted AgentEvent
// as it happens, so you can watch token-by-token text and tool-call badges in the
// terminal before any frontend exists.
// It creates a throwaway Patient + IntakeSession, sends a single patient message
// that mentions two medications (to provoke a check_drug_interaction tool call),
// runs the agent loop with a live emit callback, and prints the final reply.
// Run via `npm run test:stream`. Needs a live DATABASE_URL and ANTHROPIC_API_KEY
// in server/.env. Costs a few cents per invocation.

import { prisma } from "../db.js";
import { runAgentLoop, type AgentEvent } from "./agent.js";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Check server/.env and the --env-file flag.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Check server/.env and the --env-file flag.");
  process.exit(1);
}

const patient = await prisma.patient.create({
  data: { clientId: `test-${crypto.randomUUID()}` },
});
const session = await prisma.intakeSession.create({
  data: { patientId: patient.id },
});

console.log("patient:", patient.id);
console.log("session:", session.id);
console.log("\n--- live stream ---\n");

// Print each event as the loop emits it. Tokens stream inline (no newline) so the
// reply assembles itself the way the patient would see it; tool events get their
// own bracketed line so they stand out against the streaming text.
const emit = (event: AgentEvent): void => {
  switch (event.type) {
    case "token":
      process.stdout.write(event.text);
      break;
    case "tool_call":
      process.stdout.write(`\n[🔧 tool_call: ${event.tool}]\n`);
      break;
    case "tool_result":
      process.stdout.write(`[✓ tool_result: ${event.tool}${event.isError ? " (error)" : ""}]\n`);
      break;
  }
};

const result = await runAgentLoop(session.id, "I take metformin and ibuprofen daily", emit);

console.log("\n\n--- final reply ---\n" + result.reply);
console.log("\ncomplete:", result.complete);

const messageCount = await prisma.message.count({ where: { sessionId: session.id } });
console.log("messages persisted:", messageCount);

await prisma.$disconnect();
