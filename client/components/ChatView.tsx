"use client";

import { useEffect, useRef, useState } from "react";
import { getSession } from "@/lib/api";
import { streamMessage } from "@/lib/stream";
import { toDisplayItems, type DisplayItem } from "@/lib/messages";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatInput } from "@/components/chat/ChatInput";

const GREETINGS = ["Let's begin your intake.", "Welcome. Let's get started.", "Let's start your health intake.", "Let's gather a few details.", " Let's prepare your visit.",]

export function ChatView({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // `pending` drives the typing indicator: true whenever we're waiting on the agent's next output (before the first token, and again after a tool resolves). `streaming` locks the composer for the whole turn; `completed` locks it permanently once the intake is done.
  const [pending, setPending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  // Monotonic id source for the local items we create mid-stream (assistant bubble, tool badges), so React keys stay stable as we mutate their contents.
  const idCounter = useRef(0);
  const nextId = (prefix: string) => `local-${prefix}-${idCounter.current++}`;

  // Aborts an in-flight stream if the component unmounts (e.g. switching sessions in Phase 5, which remounts on the sessionId key).
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Rehydrate on mount.
  useEffect(() => {
    let active = true;
    getSession(sessionId)
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
  }, [sessionId]);

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
      const result = await streamMessage(
        sessionId,
        text,
        {
          onToken: (delta) => ensureAssistantBubble(delta),
          onToolCall: (tool) => {
            setPending(false);
            const id = nextId(`tool-${tool}`);
            (runningTools[tool] ??= []).push(id);
            setItems((prev) => [...prev, { kind: "tool", id, tool, state: "running" }]);
          },
          onToolResult: (tool, isError) => {
            const id = runningTools[tool]?.shift();
            if (id) {
              setItems((prev) => prev.map((it) => (it.id === id && it.kind === "tool" ? { ...it, state: isError ? "error" : "done" } : it)));
            }
            // The agent resumes reasoning after a tool resolves — wait on it again.
            setPending(true);
          },
        },
        ctrl.signal,
      );

      // The completion turn returns a canned closing message without streaming any tokens, so there may be no assistant bubble yet. Fall back to the final reply for that case.
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
      }
    }
  };

  // On a fresh intake (no messages, nothing in flight) we show a centered landing — greeting stacked above the composer in the middle of the screen. The first send pushes a user bubble into `items`, which flips this false and swaps in the docked conversation layout on the next render.
  const isEmpty = !loading && !error && items.length === 0 && !pending;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isEmpty ? (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-7 overflow-hidden px-4 pb-[12vh]">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[50vh] bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.13),transparent_70%)]" />
          <h1 className="relative font-display text-3xl text-foreground">{greeting}</h1>
          <div className="relative w-full max-w-5xl ">
            <ChatInput onSend={handleSend} disabled={loading || error !== null} />
          </div>
        </div>
      ) : (
        <>
          <ChatThread items={items} loading={loading} error={error} pending={pending} />
          {streamError && (
            <div className="mx-auto w-full max-w-3xl px-4">
              <p className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{streamError} — please try again.</p>
            </div>
          )}
          <ChatInput onSend={handleSend} disabled={loading || streaming || completed || error !== null} />
        </>
      )}
    </div>
  );
}
