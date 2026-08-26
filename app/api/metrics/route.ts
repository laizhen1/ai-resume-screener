import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { metricsSnapshot } from "@/lib/telemetry";

export async function GET(request: Request) {
  const auth = authorize(request, "metrics.read", 60, ["admin"]);
  if ("response" in auth) return auth.response;
  return NextResponse.json({ metrics: metricsSnapshot() });
}
