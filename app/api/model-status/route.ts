import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { modelReadiness } from "@/lib/model-diagnostics";
export async function GET(request: Request) {
 const auth=authorize(request,"model.readiness",12); if(auth.response) return auth.response;
 return NextResponse.json(await modelReadiness(),{headers:{"Cache-Control":"no-store"}});
}
