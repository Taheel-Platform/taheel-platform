// كاش بالذاكرة + localStorage
const mem = new Map();

function cacheKey({ text, target = "en", source = "ar", fieldKey }) {
  return `tr:${fieldKey || ""}:${source}:${target}:${text}`;
}
function getLocal(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setLocal(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// تنظيف المخرجات (إزالة اقتباسات ومسافات زائدة)
function sanitizeOut(s) {
  if (!s || typeof s !== "string") return "";
  return s.replace(/^["'«»\s]+|["'«»\s]+$/g, "").trim();
}

// كشف ردود اعتذارية/شرح بدل الترجمة
function looksBad(s) {
  if (!s) return true;
  const bad = [
    /i'?m sorry/i,
    /i apologize/i,
    /as an ai/i,
    /cannot translate/i,
    /error in the translation/i,
    /please provide/i,
    /unable to/i,
  ];
  return bad.some((rx) => rx.test(s));
}

/**
 * ترجمة نص واحد عبر API داخلي /api/translate
 * - text: النص العربي
 * - target: اللغة الهدف (افتراضي en)
 * - source: اللغة الأصل (افتراضي ar)
 * - fieldKey: مفتاح ثابت للكاش لكل حقل
 */
export async function translateText({ text, target = "en", source = "ar", fieldKey }) {
  if (!text) return text;
  // لو الهدف عربي، رجّع النص كما هو
  if (target === "ar") return text;

  const key = cacheKey({ text, target, source, fieldKey });
  if (mem.has(key)) return mem.get(key);

  const local = getLocal(key);
  if (local) {
    mem.set(key, local);
    return local;
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang: target, sourceLang: source }),
    });

    const data = await res.json().catch(() => ({}));
    let translated = data?.translated ?? text;

    // فلترة النتائج غير المناسبة + تنظيف
    if (!translated || looksBad(translated)) translated = text;
    translated = sanitizeOut(translated);

    mem.set(key, translated);
    setLocal(key, translated);
    return translated;
  } catch {
    // في حال فشل الشبكة، رجّع الأصل
    return text;
  }
}

/**
 * ترجمة مجموعة حقول لخدمة واحدة دفعة واحدة
 * fields: ["name","description","longDescription"] مثلاً
 * idKey: المفتاح المميز للخدمة (مثل serviceId)
 */
export async function translateServiceFields({
  service,
  lang,
  fields = ["name", "description", "longDescription"],
  idKey = "serviceId",
}) {
  const target = lang === "ar" ? "ar" : "en";
  if (target === "ar") {
    const o = {};
    for (const f of fields) o[f] = service?.[f] || "";
    return o;
  }

  const sid = service?.[idKey] || service?.id || service?.name || "";
  const items = fields.map((f) => ({
    key: `service:${sid}:${f}:${target}`,
    text: String(service?.[f] || ""),
  }));

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, targetLang: target, sourceLang: "ar" }),
    });
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.items) ? data.items : [];

    const out = {};
    for (const f of fields) {
      const k = `service:${sid}:${f}:${target}`;
      let hit = list.find((x) => x.key === k)?.translated ?? service?.[f] ?? "";
      if (!hit || looksBad(hit)) hit = service?.[f] ?? "";
      out[f] = sanitizeOut(hit);
    }
    return out;
  } catch {
    // فشل الشبكة => رجّع الأصل
    const o = {};
    for (const f of fields) o[f] = service?.[f] || "";
    return o;
  }
}

/**
 * ترجمة قائمة نصوص (مثلاً requiredDocuments) دفعة واحدة
 * texts: مصفوفة نصوص عربية
 * lang: "ar" | "en"
 * fieldKeyPrefix: بادئة للمفتاح (لتحسين الكاش)
 */
export async function translateList({ texts = [], lang = "en", fieldKeyPrefix = "list:item" }) {
  const target = lang === "ar" ? "ar" : "en";
  if (target === "ar" || !Array.isArray(texts) || texts.length === 0) return texts.map((t) => String(t || ""));

  const items = texts.map((t, i) => ({
    key: `${fieldKeyPrefix}:${i}:${target}`,
    text: String(t || ""),
  }));

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, targetLang: target, sourceLang: "ar" }),
    });
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.items) ? data.items : [];

    return texts.map((t, i) => {
      const k = `${fieldKeyPrefix}:${i}:${target}`;
      let out = list.find((x) => x.key === k)?.translated ?? String(t || "");
      if (!out || looksBad(out)) out = String(t || "");
      return sanitizeOut(out);
    });
  } catch {
    return texts.map((t) => String(t || ""));
  }
}