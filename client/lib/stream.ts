// The SSE reader for POST /session/:id/message. Native EventSource can't be used here: it only does GET with no body, and our  message endpoint is a POST carrying the patient's text. @microsoft/fetch-event-source gives us SSE semantics over a fetch we control.
//
// The agent loop streams `token`/`tool_call`/`tool_result` events as it runs; the route ends every stream with exactly one terminal event — `done` (with the full reply and whether the intake is now complete) or `error`. streamMessage resolves on `done` and rejects on `error`, so callers can `await` a single turn.

import { fetchEventSource } from "@microsoft/fetch-event-source";
import { apiRoot } from "./api";
import type { AgentEvent } from "./types";

export interface StreamHandlers {
  onToken?: (text: string) => void;
  onToolCall?: (tool: string) => void;
  onToolResult?: (tool: string, isError: boolean) => void;
}

export interface StreamResult {
  reply: string;
  complete: boolean;
}

// Thrown from onopen when the response isn't a stream, so the library stops instead of retrying.
class FatalStreamError extends Error {}

export function streamMessage(
  sessionId: string,
  message: string,
  handlers: StreamHandlers = {},
  signal?: AbortSignal,
): Promise<StreamResult> {
  // Our own controller closes the connection the moment we get a terminal event; we also chain the caller's signal into it for cancellation (e.g. unmount).
  const ctrl = new AbortController();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  return new Promise<StreamResult>((resolve, reject) => {
    let settled = false;
    // Resolve/reject exactly once, then abort to close the stream. Aborting makes fetchEventSource's own promise resolve quietly, so the .catch below won't fire. We have this because two cases can end the stream: the server can close it after a terminal event, or the client can abort on unmount. In the former we want to resolve/reject based on the event; in the latter we want to reject with an abort error. Without this guard, both could happen and we'd get an unhandled rejection from the .catch after we've already resolved.
    const settle = (run: () => void): void => {
      if (settled) return;
      settled = true;
      run();
      ctrl.abort();
    };

    fetchEventSource(`${apiRoot()}/session/${sessionId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: ctrl.signal,
      // Keep streaming even if the patient switches tabs mid-turn; otherwise the library pauses on hidden documents.
      openWhenHidden: true,

      async onopen(res) {
        const contentType = res.headers.get("content-type") ?? "";
        if (res.ok && contentType.includes("text/event-stream")) return;
        // A non-stream response means a 4xx/5xx (validation, missing session, crash). Surface the body and stop — retrying can't help.
        const detail = await res.text().catch(() => "");
        throw new FatalStreamError(`stream failed (${res.status}): ${detail || res.statusText}`);
      },

      onmessage(ev) {
        if (!ev.data) return;
        let event: AgentEvent;
        try {
          event = JSON.parse(ev.data) as AgentEvent;
        } catch {
          return; // Ignore anything that isn't a JSON event (e.g. stray keep-alives).
        }
        switch (event.type) {
          case "token":
            handlers.onToken?.(event.text);
            break;
          case "tool_call":
            handlers.onToolCall?.(event.tool);
            break;
          case "tool_result":
            handlers.onToolResult?.(event.tool, event.isError);
            break;
          case "done":
            settle(() => resolve({ reply: event.reply, complete: event.complete }));
            break;
          case "error":
            settle(() => reject(new Error(event.message)));
            break;
        }
      },

      onerror(err) {
        // Returning a number would schedule a retry; rethrow so the failure ends the stream and propagates to .catch.
        throw err;
      },

      onclose() {
        // The server closed without a terminal event — treat as a failure unless we already settled.
        settle(() => reject(new Error("stream closed before completion")));
      },
    }).catch((err: unknown) => {
      settle(() => reject(err instanceof Error ? err : new Error(String(err))));
    });
  });
}
