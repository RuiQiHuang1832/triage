
const KEY = "triage:clientId";

// Read the existing clientId without creating one. Returns null on first visit — the onboarding modal uses this to decide whether to show.
export function peekClientId(): string | null {
  return localStorage.getItem(KEY);
}

// Read the clientId, generating and persisting one on first call.
export function getClientId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
