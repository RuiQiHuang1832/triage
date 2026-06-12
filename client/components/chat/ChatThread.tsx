"use client";

import { useEffect, useRef } from "react";
import type { DisplayItem } from "@/lib/messages";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="flex-1">
      {/* Extra bottom padding keeps the last message clear of the composer, which is pinned over the bottom of this scroll area. */}
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-6 pb-40">
        {loading ? (
          <ChatThreadSkeleton />
        ) : error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : (
          items.map((item) =>
            item.kind === "bubble" ? (
              <MessageBubble key={item.id} role={item.role}>
                {item.content}
              </MessageBubble>
            ) : (
              <ToolCallBadge key={item.id} tool={item.tool} state={item.state} />
            ),
          )
        )}

        {pending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}


function ChatThreadSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Loading conversation" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-8 w-2/5" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-8 w-1/3" />
      </div>
    </div>
  );
}
