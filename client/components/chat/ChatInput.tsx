//Message Composer

"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUp, FileText, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// A ready-made, detailed intake so recruiters/testers don't have to invent symptoms. It supplies chief complaint, duration, severity, meds, allergies, and history up front so the agent has almost nothing left to ask, and the lisinopril + ibuprofen pairing gives the drug-interaction tool something real to flag.
const SAMPLE_PROMPT =
  "I'm a 54-year-old man and for the past 5 days I've had a persistent throbbing headache across my forehead and behind my eyes, about a 7 out of 10. It's worse in the mornings, and I've also had a stuffy nose. No fever, no vision changes, and no nausea. I take lisinopril 20mg daily for high blood pressure and metformin 1000mg twice a day for type 2 diabetes, and I've been taking ibuprofen 400mg every few hours to deal with the headache. I'm allergic to penicillin, which gives me hives. My medical history is high blood pressure and type 2 diabetes, and my father had a stroke at 60.";

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
        {/* Auto-fill helper: only on the landing composer, only while interactive (skips the disabled loading/onboarding placeholder so the slide-up doesn't replay when the real input mounts), and only while the box is empty so we never clobber what someone is typing. Fills the textarea but deliberately does not submit. */}
        {!compact && !disabled && text.length === 0 && (
          <div className="mt-3 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            <Button type="button" variant="outline" size="sm" onClick={() => setText(SAMPLE_PROMPT)} className="rounded-full text-muted-foreground">
              <Sparkles />
              Auto-fill test prompt
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
