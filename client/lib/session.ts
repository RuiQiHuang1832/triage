// The session the user is currently viewing. It's set only once a session actually exists on the server — i.e. after the first message promotes a draft to a real session (see activateDraft in useIntakeBootstrap). A fresh draft has no entry, so reloading before sending lands the user back on a blank draft rather than reopening an empty server session.

const KEY = "triage:currentSessionId";

export function peekCurrentSessionId(): string | null {
  return localStorage.getItem(KEY);
}

export function setCurrentSessionId(id: string): void {
  localStorage.setItem(KEY, id);
}

export function clearCurrentSessionId(): void {
  localStorage.removeItem(KEY);
}
