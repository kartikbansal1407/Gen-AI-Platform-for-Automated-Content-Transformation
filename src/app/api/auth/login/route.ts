import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Access code removed — login always succeeds for backwards compat.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "demo-session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
