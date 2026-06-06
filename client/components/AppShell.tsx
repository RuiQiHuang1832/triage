"use client";

import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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

export function AppShell({ children }: { children: ReactNode }) {
  const intake = useIntakeBootstrap();
  const { state, sessions, sessionsLoading, beginIntake, newIntake, selectSession } = intake;
  const router = useRouter();

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
        />
        <SidebarInset className="min-h-0">
          <header className="flex h-12 items-center gap-2 border-b border-border px-3">
            <SidebarTrigger />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>

      <OnboardingDialog open={showOnboarding} onBegin={handleBegin} pending={starting} />
    </IntakeContext.Provider>
  );
}
