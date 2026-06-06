import type { ReactNode } from "react";

export function ChatLanding({ greeting, children }: { greeting?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-7 overflow-hidden px-4 pb-[12vh]">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[50vh] bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.13),transparent_70%)]" />
        {greeting ? <h1 className="relative font-display text-3xl text-foreground">{greeting}</h1> : <div aria-hidden className="h-9" />}
        <div className="relative w-full max-w-5xl">{children}</div>
      </div>
    </div>
  );
}
