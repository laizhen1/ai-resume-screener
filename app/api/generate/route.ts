import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSyntheticResume, resumeToText } from "@/lib/synthetic";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const requestSchema = z.object({
  role: z.string().trim().min(2).max(80),
  seniority: z.enum(["Entry-level", "Intermediate", "Senior"])
});

export async function POST(request: Request) {
  const throttle = rateLimit(request, "public.generate", 10);
  if (!throttle.allowed) return NextResponse.json({ error: "Too many generation requests. Try again shortly." }, { status: 429 });
  try {
    const input = requestSchema.parse(await request.json());
    const result = await generateSyntheticResume(input.role, input.seniority);
    return NextResponse.json({ ...result, text: resumeToText(result.resume) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate a resume.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
