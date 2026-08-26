import { NextResponse } from "next/server";
import { sessionFromRequest } from "./auth";
import { rateLimit } from "./rate-limit";

export function authorize(request: Request, scope: string, limit = 60, roles: Array<"admin" | "reviewer"> = ["admin", "reviewer"]) {
  const throttle = rateLimit(request, scope, limit);
  if (!throttle.allowed) return { response: NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(throttle.retryAfter) } }) };
  const session = sessionFromRequest(request);
  if (!session) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  if (!roles.includes(session.role)) return { response: NextResponse.json({ error: "Insufficient permission." }, { status: 403 }) };
  return { session };
}
