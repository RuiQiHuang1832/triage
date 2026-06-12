"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSummary } from "@/lib/api";
import type { IntakeSummary, SessionSummaryRow } from "@/lib/types";
import { useIntake } from "@/components/AppShell";
import { PageTitle } from "@/components/PageTitle";
import { SummaryCard, SummaryCardSkeleton } from "@/components/SummaryCard";
import { Button } from "@/components/ui/button";

export default function SummariesPage() {
  // useSearchParams needs a Suspense boundary above it during prerendering.
  return (
    <>
      <PageTitle>Summaries</PageTitle>
      <Suspense>
        <SummariesContent />
      </Suspense>
    </>
  );
}

function SummariesContent() {
  // The sidebar list already carries every session for this browser; a completed one always has a summary behind it.
  const { sessions } = useIntake();
  const router = useRouter();
  // The open summary is whatever's in the URL: the chat's completion notice links here as /summaries?session=<id>, and list clicks push the same shape. Making the URL the source of truth means the back button and the sidebar "Summaries" link both behave without extra state.
  const selectedId = useSearchParams().get("session");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {selectedId ? (
          <SummaryDetail key={selectedId} id={selectedId} onBack={() => router.push("/summaries")} />
        ) : (
          <SummaryList
            sessions={sessions.filter((s) => s.status === "completed")}
            onOpen={(id) => router.push(`/summaries?session=${id}`)}
          />
        )}
      </div>
    </div>
  );
}

// Keyed on `id` by the parent, so picking a different summary remounts this fresh — no manual state reset, and the fetch only sets state in its async callbacks.
function SummaryDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSummary(id)
      .then((s) => active && setSummary(s))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-1.5 text-muted-foreground">
        <ArrowLeft className="size-4" /> All summaries
      </Button>
      {!summary && !error && <SummaryCardSkeleton />}
      {error && <p className="text-sm text-destructive">Couldn&apos;t load this summary: {error}</p>}
      {summary && <SummaryCard summary={summary} />}
    </div>
  );
}

function SummaryList({ sessions, onOpen }: { sessions: SessionSummaryRow[]; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Your summaries</h1>
        <p className="text-sm text-muted-foreground">Completed intakes and the pre-visit summary prepared for your clinician.</p>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed intakes yet. Finish an intake and its summary will appear here.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <button onClick={() => onOpen(session.id)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent">
                <p className="truncate text-sm font-medium text-foreground">{session.preview ?? "Completed intake"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.completedAt ?? session.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
