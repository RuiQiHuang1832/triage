// Typed wrappers for the three non-streaming intake routes. The streaming message endpoint lives in stream.ts since it needs SSE parsing, not JSON.

import type {
  CreateSessionResponse,
  IntakeSummary,
  Session,
  SessionSummaryRow,
} from "./types";

// Built lazily rather than at module load so a missing env var fails at call time with a clear message instead of breaking the build.
export function apiRoot(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");
  return `${base}/api/intake`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiRoot()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", 
      ...init?.headers },
  });
  if (!res.ok) {
    // The API reports failures as { error: string }; fall back to the status text if the body isn't JSON.
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(`${path} failed (${res.status}): ${detail?.error ?? res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// POST /session — open a fresh intake for this browser.
export function createSession(clientId: string): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>("/session", {
    method: "POST",
    body: JSON.stringify({ clientId }),
  });
}

// GET /session?clientId=… — every session for the sidebar, newest first.
export async function listSessions(clientId: string): Promise<SessionSummaryRow[]> {
  const { sessions } = await request<{ sessions: SessionSummaryRow[] }>(
    `/session?clientId=${encodeURIComponent(clientId)}`,
  );
  return sessions;
}

// GET /session/:id — session plus its messages, to rehydrate the chat.
export function getSession(id: string): Promise<Session> {
  return request<Session>(`/session/${id}`);
}

// DELETE /session/:id — permanently remove a session and its messages/summary.
export async function deleteSession(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/session/${id}`, { method: "DELETE" });
}

// GET /session/:id/summary — the final summary; rejects with a 404 until the intake completes.
export function getSummary(id: string): Promise<IntakeSummary> {
  return request<IntakeSummary>(`/session/${id}/summary`);
}
