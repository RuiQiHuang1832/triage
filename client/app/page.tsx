"use client";

import { useState, type CSSProperties } from "react";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { AppSidebar } from "@/components/Sidebar";
import { ChatView } from "@/components/ChatView";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIntakeBootstrap } from "@/hooks/useIntakeBootstrap";

export default function Home() {
  const { state, beginIntake } = useIntakeBootstrap();
  // Local flag so the modal stays open (showing "Starting…") across the brief loading state while the first session is created.
  const [starting, setStarting] = useState(false);

  const handleBegin = async () => {
    setStarting(true);
    try {
      await beginIntake();
    } finally {
      setStarting(false);
    }
  };

  const showOnboarding = state.status === "onboarding" || starting;

  return (
    <>
      {state.status === "ready" ? (
        <SidebarProvider className="h-svh" style={{ "--sidebar-width": "18rem" } as CSSProperties}>
          <AppSidebar />
          <SidebarInset className="min-h-0">
            <header className="flex h-12 items-center gap-2 border-b border-border px-3">
              <SidebarTrigger />
            </header>
            <ChatView key={state.sessionId} sessionId={state.sessionId} />
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <main className="flex flex-1 items-center justify-center p-8">{state.status === "error" ? <p className="text-sm text-destructive">Couldn&apos;t start your session: {state.error}</p> : <p className="text-sm text-muted-foreground">Loading…</p>}</main>
      )}

      <OnboardingDialog open={showOnboarding} onBegin={handleBegin} pending={starting} />
    </>
  );
}
