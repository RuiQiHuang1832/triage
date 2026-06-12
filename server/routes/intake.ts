// HTTP layer for the intake agent.

import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/db.js";
import { runAgentLoop, type AgentEvent } from "../lib/agent/agent.js";

export const intakeRouter = Router();

// POST /session — start a new intake.
// The browser sends a clientId it generated and stored in localStorage; we findOrCreate a Patient by it (one record per browser, no PII) and open a fresh session against that patient.
intakeRouter.post("/session", async (req: Request, res: Response) => {
  const clientId = req.body?.clientId;
  if (typeof clientId !== "string" || !clientId.trim()) {
    res.status(400).json({ error: "clientId is required" });
    return;
  }

  const patient = await prisma.patient.upsert({
    where: { clientId },
    create: { clientId },
    update: {},
  });
  const session = await prisma.intakeSession.create({
    data: { patientId: patient.id },
  });

  res.status(201).json({ sessionId: session.id, patientId: patient.id });
});

// GET /session?clientId=… — every session for a browser, newest first, to populate the sidebar.
// Each row carries a `preview`: the AI-generated session title once it exists, otherwise the first patient message as a fallback. A brand-new clientId with no patient record yet just gets an empty list.
intakeRouter.get("/session", async (req: Request, res: Response) => {
  const clientId = req.query.clientId;
  if (typeof clientId !== "string" || !clientId.trim()) {
    res.status(400).json({ error: "clientId is required" });
    return;
  }

  const patient = await prisma.patient.findUnique({
    where: { clientId },
    include: {
      sessions: {
        orderBy: { createdAt: "desc" },
        include: {
          // The first patient turn, used as the sidebar title.
          messages: {
            where: { role: "user" },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: 1,
          },
        },
      },
    },
  });

  const sessions = (patient?.sessions ?? []).map((session) => ({
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    preview: session.title ?? session.messages[0]?.content ?? null,
  }));

  res.json({ sessions });
});

// GET /session/:id — session + its messages, oldest first, so the client can rehydrate the chat on reload.
intakeRouter.get("/session/:id", async (req: Request, res: Response) => {
  const session = await prisma.intakeSession.findUnique({
    where: { id: req.params.id as string },
    include: {
      messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }
  res.json(session);
});

// DELETE /session/:id — remove a session along with its messages and summary. Those rows cascade-delete with the session (see schema), so a single delete clears everything. Prisma throws if the row is already gone, which we surface as a 404.
intakeRouter.delete("/session/:id", async (req: Request, res: Response) => {
  try {
    await prisma.intakeSession.delete({ where: { id: req.params.id as string } });
  } catch {
    res.status(404).json({ error: "session not found" });
    return;
  }
  res.json({ ok: true });
});

// POST /session/:id/message — send a patient message and stream the agent's turn. This is the SSE endpoint: it holds the connection open, forwards each AgentEvent as it happens, then emits a final `done` event carrying the full reply and whether the intake is now complete.
intakeRouter.post("/session/:id/message", async (req: Request, res: Response) => {
  const sessionId = req.params.id as string;
  const message = req.body?.message;
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const session = await prisma.intakeSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }

  // Open the SSE stream. flushHeaders sends them immediately so the browser's EventSource connects before the first token; X-Accel-Buffering disables  proxy buffering that would otherwise hold events back.
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  // If the patient closes the tab mid-turn we stop writing, but let the loop finish so its messages still get persisted for a later reload.
  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  const send = (event: unknown): void => {
    if (!closed) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const emit = (event: AgentEvent): void => send(event);

  try {
    const result = await runAgentLoop(sessionId, message, emit);
    send({ type: "done", reply: result.reply, complete: result.complete });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("agent loop failed:", err);
    send({ type: "error", message: errMessage });
  } finally {
    if (!closed) res.end();
  }
});

// GET /session/:id/summary — the final structured summary, once the intake has completed and generate_intake_summary has run.
intakeRouter.get("/session/:id/summary", async (req: Request, res: Response) => {
  const summary = await prisma.intakeSummary.findUnique({
    where: { sessionId: req.params.id as string },
  });
  if (!summary) {
    res.status(404).json({ error: "summary not found" });
    return;
  }
  res.json(summary);
});
