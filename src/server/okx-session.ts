// Shared helpers for the OKX route handlers: the connection cookie and a same-origin guard.
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { OkxError } from "./okx-client";
import { VaultConfigError, isConnectionId } from "./vault";

export const COOKIE = "ef_okx";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function connectionId(req: NextRequest): string | null {
  const v = req.cookies.get(COOKIE)?.value;
  return isConnectionId(v) ? v : null;
}

export function setConnectionCookie(res: NextResponse, id: string) {
  res.cookies.set(COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/exchanges", maxAge: COOKIE_MAX_AGE });
}

export function clearConnectionCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/exchanges", maxAge: 0 });
}

/** Rejects requests from other websites (the cookie is SameSite=strict too; this is belt and braces). */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from some browsers omit it on GET; cookies are strict anyway
  try { return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host")); } catch { return false; }
}

export function fail(e: unknown) {
  if (e instanceof OkxError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  if (e instanceof VaultConfigError) return NextResponse.json({ error: e.message, code: "server-config" }, { status: 503 });
  console.error("okx route error", e);
  return NextResponse.json({ error: "Something went wrong on our side. Please try again." }, { status: 500 });
}
