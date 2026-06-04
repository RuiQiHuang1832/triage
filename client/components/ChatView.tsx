// Phase 4 replaces handleSend's body with streamMessage(), which streams the agent's reply, drives the tool badges, and toggles the typing indicator.

"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/api";
import { toDisplayItems, type DisplayItem } from "@/lib/messages";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatInput } from "@/components/chat/ChatInput";

export function ChatView({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rehydrate on mount. The page keys this component on sessionId, so switching sessions (Phase 5) remounts with fresh loading state rather than us resetting it synchronously here. `active` guards against a resolved fetch landing after unmount.
  useEffect(() => {
    let active = true;
    getSession(sessionId)
      .then((session) => {
        if (active) setItems(toDisplayItems(session.messages));
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

  const handleSend = (text: string) => {
    // Phase 3: optimistic echo only. Phase 4 sends this to streamMessage(sessionId, text, …) and appends the streamed reply.
    setItems((prev) => [
      ...prev,
      { kind: "bubble", id: `local-${Date.now()}`, role: "user", content: text },
    ]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatThread items={items} loading={loading} error={error} />
      <ChatInput onSend={handleSend} disabled={loading || error !== null} />
    </div>
  );
}
