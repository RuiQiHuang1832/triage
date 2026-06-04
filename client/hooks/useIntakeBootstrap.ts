"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSession } from "@/lib/api";
import { getClientId, peekClientId } from "@/lib/clientId";
import { peekCurrentSessionId, setCurrentSessionId } from "@/lib/session";

export type BootstrapState =
  | { status: "loading" }
  | { status: "onboarding" }
  | { status: "ready"; sessionId: string }
  | { status: "error"; error: string };

export interface IntakeBootstrap {
  state: BootstrapState;
  beginIntake: () => Promise<void>;
}

export function useIntakeBootstrap(): IntakeBootstrap {
  const [state, setState] = useState<BootstrapState>({ status: "loading" });

  const started = useRef(false);

  const openFreshSession = useCallback(async (clientId: string) => {
    try {
      const { sessionId } = await createSession(clientId);
      setCurrentSessionId(sessionId);
      setState({ status: "ready", sessionId });
    } catch (err) {
      setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
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

    const existing = peekCurrentSessionId();
    if (existing) {
      setState({ status: "ready", sessionId: existing });
      return;
    }

    void openFreshSession(clientId);
  }, [openFreshSession]);

  const beginIntake = useCallback(async () => {
    setState({ status: "loading" });
    await openFreshSession(getClientId()); // getClientId generates + persists on first visit
  }, [openFreshSession]);

  return { state, beginIntake };
}
