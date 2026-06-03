import { createApp } from "./app.js";

const PORT = Number(process.env.PORT) || 3001;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Check server/.env and the --env-file flag.");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Check server/.env and the --env-file flag.");
  process.exit(1);
}

const app = createApp();

app.listen(PORT, () => {
  console.log(`intake server listening on http://localhost:${PORT}`);
});
