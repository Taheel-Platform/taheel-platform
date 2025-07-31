import faqData from "./faqData";

export function findFaqAnswer(question, lang = "ar") {
  // حماية السؤال من null/undefined
  const normalizedQ = typeof question === "string" ? question.trim().toLowerCase() : "";
  for (const item of faqData) {
    // حماية كل قيمة من null أو undefined
    const langQ = typeof item.q?.[lang] === "string" ? item.q[lang].toLowerCase() : "";
    const enQ = typeof item.q?.en === "string" ? item.q.en.toLowerCase() : "";

    // استخدم includes فقط إذا كانت normalizedQ غير فارغة
    if (
      (langQ && normalizedQ && normalizedQ.includes(langQ)) ||
      (enQ && normalizedQ && normalizedQ.includes(enQ))
    ) {
      // الجواب
      return (item.a && (item.a[lang] || item.a.en)) || null;
    }
  }
  return null;
}