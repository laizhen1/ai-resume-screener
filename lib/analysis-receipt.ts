import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AnalysisResult } from "./types";

export type AnalysisSnapshot = { analysis: AnalysisResult; jobDescription: string; resumeText: string; fileName: string };
export type AnalysisReceipt = { id: string; expiresAt: number; signature: string };
// Process-local key means receipts expire on restart and never require storing source documents.
const receiptGlobal = globalThis as typeof globalThis & { __resumeReceiptKey?: Buffer };
const key = receiptGlobal.__resumeReceiptKey ??= randomBytes(32);
const signed = (snapshot: AnalysisSnapshot, id: string, expiresAt: number) => createHmac("sha256", key)
  .update(JSON.stringify({ id, expiresAt, analysis: snapshot.analysis, jobDescription: snapshot.jobDescription, resumeText: snapshot.resumeText, fileName: snapshot.fileName })).digest("hex");

export function issueReceipt(snapshot: AnalysisSnapshot, now = Date.now()): AnalysisReceipt {
  const id = randomBytes(24).toString("hex");
  const expiresAt = now + 30 * 60_000;
  return { id, expiresAt, signature: signed(snapshot, id, expiresAt) };
}

export function verifyReceipt(snapshot: AnalysisSnapshot, receipt: AnalysisReceipt, now = Date.now()) {
  if (!receipt || !/^[a-f0-9]{48}$/.test(receipt.id) || !/^[a-f0-9]{64}$/.test(receipt.signature) || !Number.isSafeInteger(receipt.expiresAt) || receipt.expiresAt <= now || receipt.expiresAt > now + 30 * 60_000) throw new Error("This analysis receipt expired. Analyse again before saving.");
  if (!timingSafeEqual(Buffer.from(receipt.signature, "hex"), Buffer.from(signed(snapshot, receipt.id, receipt.expiresAt), "hex"))) throw new Error("The analysis or its source changed. Analyse again before saving.");
}
