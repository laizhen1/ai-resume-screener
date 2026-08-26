import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "@/lib/auth";

describe("signed sessions", () => {
  it("round-trips a valid session and rejects tampering", () => {
    const session = { username: "reviewer", role: "reviewer" as const, expiresAt: Date.now() + 60_000 };
    const token = createSessionToken(session);
    expect(readSessionToken(token)?.username).toBe("reviewer");
    expect(readSessionToken(`${token}tampered`)).toBeNull();
  });

  it("rejects expired sessions", () => {
    const token = createSessionToken({ username: "reviewer", role: "reviewer", expiresAt: Date.now() - 1 });
    expect(readSessionToken(token)).toBeNull();
  });
});
