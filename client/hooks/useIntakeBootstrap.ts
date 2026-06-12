"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSession, deleteSession, listSessions } from "@/lib/api";
import { getClientId, peekClientId } from "@/lib/clientId";
import type { SessionSummaryRow } from "@/lib/types";
import {
  clearCurrentSessionId,
  peekCurrentSessionId,
  setCurrentSessionId,
} from "@/lib/session";

export type BootstrapState =
  | { status: "loading" }
  | { status: "onboarding" }
  // `sessionId` is null for a fresh draft: no server session exists until the first message is sent (see activateDraft), so empty intakes never reach the DB or the sidebar.
  // `viewKey` keys the chat view. It stays constant when a draft is promoted to a real session so the view doesn't remount mid-stream, but changes for each new draft or selected session so the view resets.
  // `existing` is true only when reopening a session that already has messages, which tells the view to rehydrate its history.
  | { status: "ready"; sessionId: string | null; viewKey: string; existing: boolean }
  | { status: "error"; error: string };

export interface IntakeBootstrap {
  state: BootstrapState;
  // Sidebar list, newest first. Empty until the first fetch resolves.
  sessions: SessionSummaryRow[];
  sessionsLoading: boolean;
  beginIntake: () => Promise<void>;
  newIntake: () => Promise<void>;
  selectSession: (id: string) => void;
  // Delete a session server-side and drop it from the sidebar; if it's the one being viewed, fall back to a fresh draft.
  removeSession: (id: string) => Promise<void>;
  // Promote the current draft to a real server session on the first message; returns the new id.
  activateDraft: () => Promise<string>;
  refreshSessions: () => void;
  // Apply an AI-generated title to a sidebar row live, as it arrives over SSE mid-turn.
  applySessionTitle: (id: string, title: string) => void;
}

// A fresh key per draft/selection so the chat view remounts when the user genuinely switches views.
let viewSeq = 0;
const nextViewKey = (): string => `view-${++viewSeq}`;

export function useIntakeBootstrap(): IntakeBootstrap {
  const [state, setState] = useState<BootstrapState>({ status: "loading" });
  const [sessions, setSessions] = useState<SessionSummaryRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const started = useRef(false);
  // The clientId, captured once it's known (on boot or at "Begin Intake"), so the session actions don't have to re-read localStorage each time.
  const clientIdRef = useRef<string | null>(null);

  // Titles pushed over SSE mid-turn, before the server-side row reflects them. We overlay these onto
  // every fetched list so a refresh that lands between the row's creation and its title write can't
  // blank a title we've already shown.
  const liveTitles = useRef<Map<string, string>>(new Map());

  // Refetch the sidebar list. Non-critical: on failure we keep whatever list we already have rather than surfacing an error.
  const refreshSessions = useCallback(() => {
    const clientId = clientIdRef.current;
    if (!clientId) return;
    setSessionsLoading(true);
    listSessions(clientId)
      .then((rows) => setSessions(rows.map((s) => {
        const title = liveTitles.current.get(s.id);
        return title ? { ...s, preview: title } : s;
      })))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, []);

  // Drop an AI-generated title onto its row immediately, and remember it so a later refresh keeps it.
  const applySessionTitle = useCallback((id: string, title: string) => {
    liveTitles.current.set(id, title);
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, preview: title } : s)));
  }, []);

  // Open a fresh draft: nothing is created server-side, so this doesn't touch the DB and the draft stays out of the sidebar until its first message (activateDraft).
  const openDraft = useCallback((clientId: string) => {
    clientIdRef.current = clientId;
    clearCurrentSessionId();
    setState({ status: "ready", sessionId: null, viewKey: nextViewKey(), existing: false });
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const clientId = peekClientId();
    if (!clientId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only store
      setState({ status: "onboarding" });
      return;
    }
    clientIdRef.current = clientId;
    refreshSessions();

    const existing = peekCurrentSessionId();
    if (existing) {
      // Returning to a session that already has messages — reopen and rehydrate it.
      setState({ status: "ready", sessionId: existing, viewKey: existing, existing: true });
    } else {
      // No active session: start on a blank draft (nothing created until the first message).
      setState({ status: "ready", sessionId: null, viewKey: nextViewKey(), existing: false });
    }
  }, [refreshSessions]);

  const beginIntake = useCallback(async () => {
    openDraft(getClientId()); // getClientId generates + persists on first visit
  }, [openDraft]);

  // "New Intake" from the sidebar: drop onto a blank draft. The previous session, if it had messages, stays in the sidebar.
  const newIntake = useCallback(async () => {
    openDraft(clientIdRef.current ?? getClientId());
  }, [openDraft]);

  // Switch to an existing session picked from the sidebar. ChatView is keyed on viewKey, so changing it here remounts the view, which rehydrates the history.
  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    setState({ status: "ready", sessionId: id, viewKey: id, existing: true });
  }, []);

  // Delete a session, then refresh the sidebar. If the deleted session is the one currently open, reset to a blank draft so the chat view doesn't keep pointing at a gone session.
  const removeSession = useCallback(async (id: string): Promise<void> => {
    await deleteSession(id);
    liveTitles.current.delete(id);
    if (peekCurrentSessionId() === id) {
      clearCurrentSessionId();
      setState({ status: "ready", sessionId: null, viewKey: nextViewKey(), existing: false });
    }
    refreshSessions();
  }, [refreshSessions]);

  // Create the server session for the current draft, on its first message. Records it as current and surfaces it in the sidebar, but keeps the same viewKey so ChatView doesn't remount mid-stream.
  const activateDraft = useCallback(async (): Promise<string> => {
    const clientId = clientIdRef.current ?? getClientId();
    const { sessionId } = await createSession(clientId);
    setCurrentSessionId(sessionId);
    setState((prev) => (prev.status === "ready" ? { ...prev, sessionId } : prev));
    refreshSessions(); // now that it's about to hold a message, it belongs in the sidebar
    return sessionId;
  }, [refreshSessions]);

  return { state, sessions, sessionsLoading, beginIntake, newIntake, selectSession, removeSession, activateDraft, refreshSessions, applySessionTitle };
}
