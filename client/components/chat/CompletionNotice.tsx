import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";

// Shown in place of the composer once an intake completes. The conversation is locked, so rather than leave a dead input we surface a path to the finished summary.
// Links to /summaries with the session id so that page opens this summary directly (see app/summaries/page.tsx).
export function CompletionNotice({ sessionId }: { sessionId: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleCheck className="size-4 text-foreground" />
          This intake is complete. You can view your summary here.
        </p>
        <Link
          href={`/summaries?session=${sessionId}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View summary
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
