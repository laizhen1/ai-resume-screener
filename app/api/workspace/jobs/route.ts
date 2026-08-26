import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api";
import { getRepository } from "@/lib/repository";

const jobSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(40).max(30_000),
  criteria: z.array(z.object({ name: z.string().trim().min(2).max(100), weight: z.number().min(0).max(100), required: z.boolean() })).max(20).default([])
}).refine((value) => !value.criteria.length || value.criteria.reduce((sum, item) => sum + item.weight, 0) === 100, { message: "Criterion weights must total 100." });

export async function GET(request: Request) {
  const auth = authorize(request, "jobs.list");
  if ("response" in auth) return auth.response;
  return NextResponse.json({ jobs: await (await getRepository()).listJobs(), mode: process.env.DATA_MODE ?? "memory" });
}

export async function POST(request: Request) {
  const auth = authorize(request, "jobs.create", 20);
  if ("response" in auth) return auth.response;
  try {
    const input = jobSchema.parse(await request.json());
    const criteria = input.criteria.length ? input.criteria.map((item) => ({ ...item, id: randomUUID() })) : [
      { id: randomUUID(), name: "Relevant skills", weight: 55, required: true },
      { id: randomUUID(), name: "Demonstrated experience", weight: 20, required: false },
      { id: randomUUID(), name: "Measurable impact", weight: 15, required: false },
      { id: randomUUID(), name: "Document clarity", weight: 10, required: false }
    ];
    const repository = await getRepository();
    const job = await repository.createJob({ ...input, criteria });
    await repository.addAudit({ actor: auth.session.username, action: "job.created", entityType: "job", entityId: job.id, metadata: { title: job.title } });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create job." }, { status: 400 });
  }
}
