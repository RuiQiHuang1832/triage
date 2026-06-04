export type Role = "user" | "assistant" | "tool";
export type SessionStatus = "in_progress" | "completed";

export interface Message {
  id: string;
  sessionId: string;
  role: Role;
  content: string;
  toolUseId: string | null;
  toolName: string | null;
  toolInput: unknown | null;
  toolResult: unknown | null;
  createdAt: string;
}

// Full session with its messages, oldest first — used to rehydrate the chat on load.
export interface Session {
  id: string;
  patientId: string;
  status: SessionStatus;
  createdAt: string;
  completedAt: string | null;
  messages: Message[];
}

// One sidebar row from GET /session?clientId=…. `preview` is the first patient message, used as an auto-title.
export interface SessionSummaryRow {
  id: string;
  status: SessionStatus;
  createdAt: string;
  completedAt: string | null;
  preview: string | null;
}

// The final structured summary from GET /session/:id/summary (404 until the intake completes).
export interface IntakeSummary {
  id: string;
  sessionId: string;
  chiefComplaint: string;
  symptoms: unknown;
  duration: string;
  medications: unknown;
  allergies: unknown;
  bmi: number | null;
  rawSummary: string;
  createdAt: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  patientId: string;
}

// Events streamed over SSE from POST /session/:id/message.
// `token`/`tool_call`/`tool_result` come from the agent loop; `done`/`error` are emitted by the route to terminate the stream.
export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool_call"; tool: string }
  | { type: "tool_result"; tool: string; isError: boolean }
  | { type: "done"; reply: string; complete: boolean }
  | { type: "error"; message: string };
