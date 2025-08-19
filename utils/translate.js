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

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, targetLang: target, sourceLang: source }),
  });

  const data = await res.json().catch(() => ({}));
  const translated = data?.translated ?? text;

  mem.set(key, translated);
  setLocal(key, translated);
  return translated;
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

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, targetLang: target, sourceLang: "ar" }),
  });
  const data = await res.json().catch(() => ({}));
  const list = data?.items || [];

  const out = {};
  for (const f of fields) {
    const k = `service:${sid}:${f}:${target}`;
    const hit = list.find((x) => x.key === k)?.translated ?? service?.[f] ?? "";
    out[f] = hit;
  }
  return out;
}