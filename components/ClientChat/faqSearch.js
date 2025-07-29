import faqData from "./faqData";

export function findFaqAnswer(question, lang = "ar") {
  const normalizedQ = question.trim().toLowerCase();
  for (const item of faqData) {
    if (
      (item.q[lang] && normalizedQ.includes(item.q[lang].toLowerCase())) ||
      (item.q.en && normalizedQ.includes(item.q.en.toLowerCase()))
    ) {
      return item.a[lang] || item.a.en;
    }
  }
  return null;
}