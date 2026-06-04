"use client";

import { useEffect, useRef } from "react";
import type { DisplayItem } from "@/lib/messages";
import { MessageBubble } from "./MessageBubble";
import { ToolCallBadge } from "./ToolCallBadge";
import { TypingIndicator } from "./TypingIndicator";

interface ChatThreadProps {
  items: DisplayItem[];
  loading?: boolean;
  error?: string | null;
  pending?: boolean;
}

export function ChatThread({ items, loading = false, error = null, pending = false }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Pin to the bottom as content arrives. Re-runs on every item/pending change so streamed tokens keep the latest line visible.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items, pending]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading conversation…</p>
        ) : error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : items.length === 0 && !pending ? (
          <EmptyState />
        ) : (
          items.map((item) =>
            item.kind === "bubble" ? (
              <MessageBubble key={item.id} role={item.role}>
                {item.content}
              </MessageBubble>
            ) : (
              <ToolCallBadge key={item.id} tool={item.tool} state={item.isError ? "error" : "done"} />
            ),
          )
        )}

        {pending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <p className="text-sm font-medium text-foreground">Let&apos;s get started</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Describe what brought you in today — your main symptom or concern — and I&apos;ll ask a few
        follow-up questions.
      </p>
    </div>
  );
}
