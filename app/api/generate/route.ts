import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSyntheticResume, resumeToText } from "@/lib/synthetic";

export const runtime = "nodejs";

const requestSchema = z.object({
  role: z.string().trim().min(2).max(80),
  seniority: z.enum(["Entry-level", "Intermediate", "Senior"])
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const result = await generateSyntheticResume(input.role, input.seniority);
    return NextResponse.json({ ...result, text: resumeToText(result.resume) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate a resume.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
