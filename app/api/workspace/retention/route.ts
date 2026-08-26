import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { getRepository } from "@/lib/repository";

export async function POST(request: Request) {
  const auth = authorize(request, "retention.run", 5, ["admin"]);
  if ("response" in auth) return auth.response;
  const repository = await getRepository();
  const deleted = await repository.deleteExpiredCandidates();
  await repository.addAudit({ actor: auth.session.username, action: "retention.completed", entityType: "system", entityId: "retention", metadata: { deleted } });
  return NextResponse.json({ deleted });
}
