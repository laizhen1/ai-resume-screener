import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, verifyLogin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const throttle = rateLimit(request, "login", 8, 15 * 60_000);
  if (!throttle.allowed) return NextResponse.json({ error: "Too many login attempts." }, { status: 429 });
  const body = await request.json() as { username?: string; password?: string };
  const session = verifyLogin(body.username ?? "", body.password ?? "");
  if (!session) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  const response = NextResponse.json({ user: { username: session.username, role: session.role } });
  response.cookies.set(SESSION_COOKIE, createSessionToken(session), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: new Date(session.expiresAt), path: "/"
  });
  return response;
}
