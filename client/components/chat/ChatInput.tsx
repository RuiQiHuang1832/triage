//Message Composer

"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUp, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ChatInput({ onSend, disabled = false, compact = false }: { onSend: (text: string) => void; disabled?: boolean; compact?: boolean }) {
  // Once the conversation is underway we dock the composer: a neutral placeholder and a shorter resting height.
  const placeholder = compact ? "Write a message…" : "Describe your main symptom or concern…";
  const [text, setText] = useState("");
  const canSend = !disabled && text.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="bg-transparent">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex flex-col rounded-xl border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          {/* Keep the composer visually identical when disabled — the disabled state is conveyed by the hidden send button, not by dimming the box. Override the shadcn Textarea's default disabled:bg/opacity treatment. */}
          <Textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} disabled={disabled} rows={1} placeholder={placeholder} className={`max-h-40 ${compact ? "min-h-15" : "min-h-20"} resize-none border-0 bg-transparent shadow-none focus-visible:border-0 p-4 focus-visible:ring-0 dark:bg-transparent text-base! disabled:opacity-100 disabled:bg-transparent disabled:cursor-default dark:disabled:bg-transparent`} />
          <div className="flex items-center justify-between gap-2 p-2 pl-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="icon" variant="ghost" disabled={disabled} aria-label="Add attachment">
                  <Plus />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="bottom" className="w-auto min-w-48">
                <DropdownMenuItem disabled>
                  <FileText />
                  Import document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" onClick={submit} disabled={!canSend} aria-label="Send message" className={`transition-all duration-200 ${canSend ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"}`}>
              <ArrowUp />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
