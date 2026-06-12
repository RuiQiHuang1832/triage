"use client";

import type { ReactNode } from "react";
import { ChatView } from "@/components/ChatView";
import { ChatLanding } from "@/components/chat/ChatLanding";
import { ChatInput } from "@/components/chat/ChatInput";
import { PageTitle } from "@/components/PageTitle";
import { useIntake } from "@/components/AppShell";

export default function Home() {
  const { state, sessions, refreshSessions, activateDraft, applySessionTitle } = useIntake();

  // Mirror the sidebar: a selected, titled session shows its preview; a fresh or not-yet-titled draft is "New Chat".
  const activeId = state.status === "ready" ? state.sessionId : null;
  const activePreview = activeId ? sessions.find((s) => s.id === activeId)?.preview ?? null : null;

  let content: ReactNode;
  if (state.status === "ready") {
    content = (
      <ChatView
        key={state.viewKey}
        sessionId={state.sessionId}
        existing={state.existing}
        activateDraft={activateDraft}
        onTurnEnd={refreshSessions}
        onTitle={applySessionTitle}
      />
    );
  } else if (state.status === "error") {
    content = (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-destructive">Couldn&apos;t start your session: {state.error}</p>
      </div>
    );
  } else {
    // loading / onboarding — the onboarding modal (rendered by AppShell) sits on top of this placeholder.
    content = (
      <ChatLanding>
        <ChatInput onSend={() => {}} disabled />
      </ChatLanding>
    );
  }

  return (
    <>
      <PageTitle>{activePreview ?? "New Chat"}</PageTitle>
      {content}
    </>
  );
}
