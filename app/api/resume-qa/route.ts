import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getRepository } from "@/lib/repository";
import { extractDocument } from "@/lib/documents";
import { answerResumeQuestion } from "@/lib/resume-qa";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const throttle = rateLimit(request, "resume.qa", 10);
  if (!throttle.allowed) return NextResponse.json({ error: "Too many questions. Try again shortly." }, { status: 429 });
  try {
    const form = await request.formData();
    const question = z.string().trim().min(3).max(500).parse(form.get("question"));
    const candidateId = form.get("candidateId");
    let resumeText = "";
    if (candidateId) {
      const auth = authorize(request, "candidate.qa", 10);
      if ("response" in auth) return auth.response!;
      const id = z.uuid().parse(candidateId);
      const candidate = await (await getRepository()).getCandidate(id);
      if (!candidate?.resumeText) return NextResponse.json({ error: "Candidate source is unavailable." }, { status: 404 });
      resumeText = candidate.resumeText;
    } else {
      resumeText = String(form.get("resumeText") ?? "");
      const file = form.get("resumeFile");
      if (file instanceof File && file.size) resumeText = await extractDocument(file);
    }
    if (resumeText.length < 80 || resumeText.length > 100_000) return NextResponse.json({ error: "Provide a resume containing 80 to 100,000 characters." }, { status: 400 });
    return NextResponse.json({ answer: await answerResumeQuestion(question, resumeText, request.signal) });
  } catch {
    return NextResponse.json({ error: "Could not read the question or resume. Use a question of 3 to 500 characters and a supported document." }, { status: 400 });
  }
}
