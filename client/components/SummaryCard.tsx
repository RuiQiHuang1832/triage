import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { IntakeSummary, SummaryMedication, SummarySymptom } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

// The JSON columns are best-effort shapes; coerce to an array so a malformed row never throws.
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function SummaryCard({ summary }: { summary: IntakeSummary }) {
  const symptoms = asArray<SummarySymptom>(summary.symptoms);
  const medications = asArray<SummaryMedication>(summary.medications);
  const allergies = asArray<string>(summary.allergies);
  const created = new Date(summary.createdAt);

  return (
    <article className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Chief complaint</p>
        <h2 className="text-xl font-semibold text-foreground">{summary.chiefComplaint}</h2>
        <p className="text-xs text-muted-foreground">
          {created.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          {summary.duration ? ` · ${summary.duration}` : ""}
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="Symptoms">
          {symptoms.length ? (
            <ul className="space-y-1.5">
              {symptoms.map((s, i) => {
                const detail = [s.severity, s.location, s.duration].filter(Boolean).join(", ");
                return (
                  <li key={i} className="text-sm text-foreground">
                    {s.description}
                    {detail && <span className="text-muted-foreground"> — {detail}</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty />
          )}
        </Section>

        <Section title="Medications">
          {medications.length ? (
            <ul className="space-y-1.5">
              {medications.map((m, i) => {
                const detail = [m.dose, m.frequency].filter(Boolean).join(", ");
                return (
                  <li key={i} className="text-sm text-foreground">
                    {m.name}
                    {detail && <span className="text-muted-foreground"> {detail}</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty />
          )}
        </Section>

        <Section title="Allergies">
          {allergies.length ? (
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((a, i) => (
                <span key={i} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground">
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Section>

        {summary.bmi != null && (
          <Section title="BMI">
            <p className="text-sm text-foreground">{summary.bmi}</p>
          </Section>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Clinical summary</p>
        <div className="space-y-2 text-sm leading-relaxed text-foreground">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
              ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              h1: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
              h2: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
              h3: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
            }}
          >
            {summary.rawSummary}
          </ReactMarkdown>
        </div>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">None reported.</p>;
}

// Mirrors SummaryCard's layout so the swap to real content doesn't shift the page.
export function SummaryCardSkeleton() {
  return (
    <article className="space-y-6 rounded-2xl border border-border bg-card p-6" aria-label="Loading summary" aria-busy="true">
      <header className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-3 w-40" />
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {["Symptoms", "Medications", "Allergies", "BMI"].map((title) => (
          <section key={title} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </section>
        ))}
      </div>

      <div className="space-y-2 border-t border-border pt-5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </article>
  );
}
