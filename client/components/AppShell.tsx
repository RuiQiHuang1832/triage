"use client";

import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { AppSidebar } from "@/components/Sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIntakeBootstrap, type IntakeBootstrap } from "@/hooks/useIntakeBootstrap";

const IntakeContext = createContext<IntakeBootstrap | null>(null);

export function useIntake(): IntakeBootstrap {
  const ctx = useContext(IntakeContext);
  if (!ctx) throw new Error("useIntake must be used within <AppShell>");
  return ctx;
}

// Cap the header title at `max` words, appending an ellipsis when there's more.
function truncateWords(text: string, max: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length <= max ? text : `${words.slice(0, max).join(" ")}…`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const intake = useIntakeBootstrap();
  const { state, sessions, sessionsLoading, beginIntake, newIntake, selectSession, removeSession } = intake;
  const router = useRouter();
  const pathname = usePathname();

  // Mirror the chat page: the header echoes the active session's preview as its title. Only on the chat route — /summaries has its own heading.
  const activeId = state.status === "ready" ? state.sessionId : null;
  const activePreview = activeId ? sessions.find((s) => s.id === activeId)?.preview ?? null : null;
  const headerTitle = pathname === "/" ? (activePreview ? truncateWords(activePreview, 5) : "New Chat") : null;

  // Keeps the onboarding modal open showing "Starting…" across the brief loading state while the first session is created.
  const [starting, setStarting] = useState(false);

  const handleBegin = async () => {
    setStarting(true);
    try {
      await beginIntake();
    } finally {
      setStarting(false);
    }
  };


  const handleNewIntake = async () => {
    await newIntake();
    router.push("/");
  };

  const handleSelect = (id: string) => {
    selectSession(id);
    router.push("/");
  };

  const handleDelete = async (id: string) => {
    await removeSession(id);
  };

  const showOnboarding = state.status === "onboarding" || starting;

  return (
    <IntakeContext.Provider value={intake}>
      <SidebarProvider className="h-svh" style={{ "--sidebar-width": "18rem" } as CSSProperties}>
        <AppSidebar
          sessions={sessions}
          activeSessionId={state.status === "ready" ? state.sessionId ?? undefined : undefined}
          loading={sessionsLoading}
          onSelect={handleSelect}
          onNewIntake={handleNewIntake}
          onDelete={handleDelete}
        />
        <SidebarInset className="min-h-0">
          <header className="flex h-12 items-center gap-2 border-b border-border px-3">
            <SidebarTrigger />
            {headerTitle && (
              <span className="min-w-0 truncate text-sm font-medium" title={activePreview ?? undefined}>
                {headerTitle}
              </span>
            )}
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>

      <OnboardingDialog open={showOnboarding} onBegin={handleBegin} pending={starting} />
    </IntakeContext.Provider>
  );
}
