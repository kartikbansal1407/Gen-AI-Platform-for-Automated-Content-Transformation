import { cookies } from "next/headers";

export const SESSION_COOKIE = "content_forge_session";

// Access code removed — app is open. Keep cookie helpers for backwards compat.
export async function isAuthenticated() {
  void cookies;
  return true;
}

export function isValidAccessCode(_code: unknown) {
  void _code;
  return true;
}
