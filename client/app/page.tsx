"use client";

import { ChatView } from "@/components/ChatView";
import { ChatLanding } from "@/components/chat/ChatLanding";
import { ChatInput } from "@/components/chat/ChatInput";
import { useIntake } from "@/components/AppShell";

export default function Home() {
  const { state, refreshSessions, activateDraft } = useIntake();

  if (state.status === "ready") {
    return (
      <ChatView
        key={state.viewKey}
        sessionId={state.sessionId}
        existing={state.existing}
        activateDraft={activateDraft}
        onTurnEnd={refreshSessions}
      />
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-destructive">Couldn&apos;t start your session: {state.error}</p>
      </div>
    );
  }

  // loading / onboarding — the onboarding modal (rendered by AppShell) sits on top of this placeholder.
  return (
    <ChatLanding>
      <ChatInput onSend={() => {}} disabled />
    </ChatLanding>
  );
}
