// Smoke test: confirms the Anthropic API key is wired up and a request round-trips.
// Run via `npm run test:ping`. Costs a fraction of a cent per invocation.

import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY is not set. Check server/.env and the --env-file flag.");
  process.exit(1);
}

const client = new Anthropic(); // API key is automatically read from process.env.ANTHROPIC_API_KEY

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 64,
  messages: [{ role: "user", content: "Respond with exactly: pong" }],
});

console.log("stop_reason:", response.stop_reason);
console.log("usage:", response.usage);
console.log("content:", response.content);
