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

// One sidebar row from GET /session?clientId=…. `preview` is the AI-generated session title once it exists, falling back to the first patient message.
export interface SessionSummaryRow {
  id: string;
  status: SessionStatus;
  createdAt: string;
  completedAt: string | null;
  preview: string | null;
}

// One symptom entry inside a summary, as the agent's generate_intake_summary tool structures it.
export interface SummarySymptom {
  description: string;
  severity?: "mild" | "moderate" | "severe";
  duration?: string;
  location?: string;
}

// One medication entry inside a summary.
export interface SummaryMedication {
  name: string;
  dose?: string;
  frequency?: string;
}

// The final structured summary from GET /session/:id/summary (404 until the intake completes).
// The array fields are stored as JSON columns, so treat them as best-effort shapes and render defensively.
export interface IntakeSummary {
  id: string;
  sessionId: string;
  chiefComplaint: string;
  symptoms: SummarySymptom[];
  duration: string;
  medications: SummaryMedication[];
  allergies: string[];
  bmi: number | null;
  rawSummary: string;
  createdAt: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  patientId: string;
}

// Events streamed over SSE from POST /session/:id/message.
// `token`/`tool_call`/`tool_result`/`title` come from the agent loop; `done`/`error` are emitted by the route to terminate the stream.
export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool_call"; tool: string }
  | { type: "tool_result"; tool: string; isError: boolean }
  | { type: "title"; title: string }
  | { type: "done"; reply: string; complete: boolean }
  | { type: "error"; message: string };
