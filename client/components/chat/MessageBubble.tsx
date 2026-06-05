import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MessageBubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap", isUser ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md text-foreground")}>{children}</div>
    </div>
  );
}
