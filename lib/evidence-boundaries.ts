import { termsForSkill } from "./skills";
import type { EvidenceVerdict } from "./types";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Bounded, source-backed corrections; unknown never becomes a positive claim. */
export function explicitBoundary(skill: string, text: string, original: EvidenceVerdict): EvidenceVerdict | null {
  if (original === "unknown") return null;
  const terms = termsForSkill(skill).map(escape).join("|");
  const mention = new RegExp("(^|[^a-z0-9+#])(?:" + terms + ")([^a-z0-9+#]|$)", "i");
  // Structured fields are separate claims: a denial in another key must not transfer.
  let source = text;
  if (/^[{[]/.test(text.trim())) {
    try {
      const strings = (value: unknown): string[] => typeof value === "string" ? [value]
        : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
      source = strings(JSON.parse(text)).filter(s => mention.test(s)).join("\n");
    } catch { /* Keep non-JSON extracted text intact. */ }
  }
  const clauses = source.split(/\r?\n|(?<=[.!?;])\s+|(?<=[。！？；])\s*/).filter(s => mention.test(s));
  const learning = /\b(?:introductory|beginner|tutorials?|coursework|classroom|supervised\s+(?:training\s+)?(?:class|lab|club workshop|workshop))\b/i;
  const learner = /\b(?:completed|completing|followed|following|attending|studying|learning|exploring|taking|practising|familiar|copied)\b|\bmy\b.{0,35}\b(?:knowledge|exposure)\b/i;
  const delivery = /\b(?:built|shipped|deployed|developed|implemented|maintained|operated|authored)\b|(?:开发并上线|开发并部署|实现并上线|独立开发|上线并维护)/i;
  const delivered = clauses.some(s => delivery.test(s) && !learning.test(s) && !/\b(?:not|never|no)\b/i.test(s.replace(/\bno longer true\b/gi, "")));
  const denial = new RegExp("(?:never (?:used|worked (?:with|on)|programmed (?:in|with))|no (?:professional |hands-on |practical )?experience (?:with|in|using))\\s+(?:" + terms + ")(?:[^a-z0-9+#]|$)", "i");
  const retracted = /\b(?:no longer true|earlier statement is obsolete|that changed|replacing that earlier statement)\b/i.test(source);
  const years = (s: string) => [...s.matchAll(/\b(?:19|20)\d{2}\b/g)].map(m => Number(m[0]));
  const laterDelivery = (s: string) => {
    const dates = years(s);
    return dates.length === 1 && /\b(?:biography|profile|application|statement)\b.{0,30}\b(?:said|stated)\b/i.test(s)
      && clauses.some(c => delivery.test(c) && !learning.test(c) && !denial.test(c) && years(c).some(y => y > dates[0]));
  };
  const currentDenial = clauses.some(s => denial.test(s) && !/\b(?:previously|formerly|old|before|until|no longer|obsolete)\b/i.test(s) && !(retracted && laterDelivery(s)));
  // A dated denial can be superseded only by an explicit retraction and delivery.
  if (original === "contradicted" && delivered && retracted && !currentDenial) return "supported";
  if (currentDenial) return original === "contradicted" ? null : "contradicted";
  if (clauses.some(s => learning.test(s) && learner.test(s)) && !delivered) return original === "partial" ? null : "partial";
  if (!delivered && clauses.some(s =>
    /\b(?:not claimed|no .{0,35}experience claim|not a programming claim|placeholder|insert example here|blank (?:form|template)|add your example|applicant to complete|to be filled by (?:the )?applicant|ordinary English word|not a software skill)\b|没有提供.{0,30}(?:(?:使用|学习)经历|证据)|(?:引用|摘录).{0,12}(?:职位|招聘)广告|(?:招聘广告|职位广告).{0,12}(?:写着|要求|注明)|(?:明年|未来|计划).{0,35}(?:目前没有开始|尚未开始|还未开始)(?:学习|阅读)|(?:目前没有开始|尚未开始|还未开始)(?:学习|阅读)/i.test(s)
    || /\b(?:requested|required|listed) by (?:the )?(?:vacancy|employer|job advert)\b|\b(?:vacancy|job advert) (?:requests|requires|lists)\b/i.test(s)
    || /\b(?:might|plan to|hope to|wish list|future[ -](?:learning|reading|study|training))\b/i.test(s)
    || /\bI did not\b.{0,65}\b(?:the|this|those)\b.{0,45}\b(?:configuration|modules?|project)\b/i.test(s)
  )) return "unknown";
  return null;
}
