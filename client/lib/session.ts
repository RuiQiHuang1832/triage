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
