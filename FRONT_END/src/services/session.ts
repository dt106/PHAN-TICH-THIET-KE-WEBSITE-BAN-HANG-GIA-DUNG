export const TOKEN_KEY = "gd_token";
export const AI_SESSION_KEY = "gd_ai_session";

export function readToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Khách vãng lai: AI chat nhận diện bằng sessionId 16–128 ký tự. */
export function readAiSession() {
  const current = localStorage.getItem(AI_SESSION_KEY);
  if (current && current.length >= 16 && current.length <= 128) return current;
  const next = crypto.randomUUID();
  localStorage.setItem(AI_SESSION_KEY, next);
  return next;
}
