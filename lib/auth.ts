import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

export type Session = { username: string; role: "admin" | "reviewer"; expiresAt: number };
export const SESSION_COOKIE = "open_resume_lab_session";

function secret(): string {
  const configured = process.env.AUTH_SECRET;
  if (process.env.AUTH_DISABLED === "false" && (!configured || configured.length < 32)) {
    throw new Error("AUTH_SECRET must contain at least 32 characters when authentication is enabled.");
  }
  return configured ?? "local-development-only-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string | null): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function sessionFromRequest(request: Request): Session | null {
  if (process.env.AUTH_DISABLED !== "false") return { username: "local-demo", role: "admin", expiresAt: Date.now() + 3_600_000 };
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return readSessionToken(cookie?.slice(SESSION_COOKIE.length + 1));
}

export function verifyLogin(username: string, password: string): Session | null {
  const configuredUser = process.env.AUTH_USERNAME ?? "admin";
  const configuredHash = process.env.AUTH_PASSWORD_HASH;
  if (!configuredHash || username !== configuredUser) return null;
  const [salt, expectedHex] = configuredHash.split(":");
  if (!salt || !expectedHex) return null;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const role = process.env.AUTH_ROLE === "reviewer" ? "reviewer" : "admin";
  return { username, role, expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
}
