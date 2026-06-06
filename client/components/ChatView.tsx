"use client";

import { useEffect, useRef, useState } from "react";
import { getSession } from "@/lib/api";
import { streamMessage } from "@/lib/stream";
import { toDisplayItems, type DisplayItem } from "@/lib/messages";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatLanding } from "@/components/chat/ChatLanding";
import { CompletionNotice } from "@/components/chat/CompletionNotice";

const GREETINGS = ["Let's begin your intake.", "Welcome. Let's get started.", "Let's start your health intake.", "Let's gather a few details.", " Let's prepare your visit.",]

export function ChatView({
  sessionId: propSessionId,
  existing = false,
  activateDraft,
  onTurnEnd,
}: {
  sessionId: string | null;
  existing?: boolean;
  activateDraft: () => Promise<string>;
  onTurnEnd?: () => void;
}) {
  // The live session id. Null on a fresh draft until the first message promotes it to a real server session (activateDraft); seeded from the prop when reopening an existing session.
  const [sessionId, setSessionId] = useState<string | null>(propSessionId);

  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(existing);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  // Monotonic id source for the local items we create mid-stream (assistant bubble, tool badges), so React keys stay stable as we mutate their contents.
  const idCounter = useRef(0);
  const nextId = (prefix: string) => `local-${prefix}-${idCounter.current++}`;

  // Aborts an in-flight stream if the component unmounts (e.g. switching sessions, which remounts on the viewKey).
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Rehydrate a reopened session on mount. A fresh draft (existing=false) has nothing to load.
  useEffect(() => {
    if (!existing || !propSessionId) return;
    let active = true;
    getSession(propSessionId)
      .then((session) => {
        if (!active) return;
        setItems(toDisplayItems(session.messages));
        setCompleted(session.status === "completed");
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [propSessionId, existing]);

  const handleSend = async (text: string) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Optimistically echo the patient's message, then show the typing indicator while we wait for the agent's first output.
    setItems((prev) => [...prev, { kind: "bubble", id: nextId("user"), role: "user", content: text }]);
    setStreamError(null);
    setStreaming(true);
    setPending(true);

    // The assistant's reply streams into a single bubble we create lazily on the first token. Tool badges resolve in FIFO order per tool name, since a turn emits every tool_call up front and then every tool_result.
    const assistantId = nextId("assistant");
    let assistantStarted = false;
    const runningTools: Record<string, string[]> = {};

    // The flag decision lives out here, not inside the updater: React Strict Mode invokes state updaters twice in dev, so a flag flipped inside one would take the wrong branch on the second run and drop the bubble. The updater itself stays pure.
    const ensureAssistantBubble = (delta: string) => {
      setPending(false);
      if (!assistantStarted) {
        assistantStarted = true;
        setItems((prev) => [...prev, { kind: "bubble", id: assistantId, role: "assistant", content: delta }]);
      } else {
        setItems((prev) => prev.map((it) => (it.id === assistantId && it.kind === "bubble" ? { ...it, content: it.content + delta } : it)));
      }
    };

    try {
      // First message of a draft: create the server session now. Empty drafts never reach the DB, and the session only appears in the sidebar from this point.
      let id = sessionId;
      if (!id) {
        id = await activateDraft();
        setSessionId(id);
      }

      const result = await streamMessage(
        id,
        text,
        {
          onToken: (delta) => ensureAssistantBubble(delta),
          onToolCall: (tool) => {
            setPending(false);
            const toolId = nextId(`tool-${tool}`);
            (runningTools[tool] ??= []).push(toolId);
            setItems((prev) => [...prev, { kind: "tool", id: toolId, tool, state: "running" }]);
          },
          onToolResult: (tool, isError) => {
            const toolId = runningTools[tool]?.shift();
            if (toolId) {
              setItems((prev) => prev.map((it) => (it.id === toolId && it.kind === "tool" ? { ...it, state: isError ? "error" : "done" } : it)));
            }
            // The agent resumes reasoning after a tool resolves — wait on it again.
            setPending(true);
          },
        },
        ctrl.signal,
      );

      // The completion turn may return a canned closing without streaming any tokens, so there may be no assistant bubble yet. Fall back to the final reply for that case.
      if (!assistantStarted && result.reply) {
        setItems((prev) => [...prev, { kind: "bubble", id: assistantId, role: "assistant", content: result.reply }]);
      }
      if (result.complete) setCompleted(true);
    } catch (err) {
      if (ctrl.signal.aborted) return; // Unmounted mid-stream; the component is gone, nothing to update.
      setStreamError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ctrl.signal.aborted) {
        setStreaming(false);
        setPending(false);
        onTurnEnd?.();
      }
    }
  };

  // On a fresh intake (no messages, nothing in flight) we show a centered landing — greeting stacked above the composer in the middle of the screen. The first send pushes a user bubble into `items`, which flips this false and swaps in the docked conversation layout on the next render.
  const isEmpty = !loading && !error && items.length === 0 && !pending;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isEmpty ? (
        <ChatLanding greeting={greeting}>
          <ChatInput onSend={handleSend} disabled={loading || error !== null} />
        </ChatLanding>
      ) : (
        <>
          <ChatThread items={items} loading={loading} error={error} pending={pending} />
          {streamError && (
            <div className="mx-auto w-full max-w-3xl px-4">
              <p className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{streamError} — please try again.</p>
            </div>
          )}
          {completed ? (
            sessionId && <CompletionNotice sessionId={sessionId} />
          ) : (
            <ChatInput onSend={handleSend} disabled={loading || streaming || error !== null} compact />
          )}
        </>
      )}
    </div>
  );
}
