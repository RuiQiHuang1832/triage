import express, { type Request, type Response, type NextFunction } from "express";
import { intakeRouter } from "./routes/intake.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cors);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.use("/api/intake", intakeRouter);

  return app;
}

// Minimal hand-rolled CORS so we don't pull in a dependency for a demo.
function cors(req: Request, res: Response, next: NextFunction): void {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
}
