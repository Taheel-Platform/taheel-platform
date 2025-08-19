/* eslint-disable no-console */
export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_TRANSLATE_MODEL || "gpt-3.5-turbo";
const TEMPERATURE = 0;

// كاش بالذاكرة مع TTL (30 يوم)
const memCache = new Map(); // key -> { value, expireAt }
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function cacheKey(item) {
  // item = { text, targetLang, sourceLang, key }
  return `tr:${item.key || ""}:${item.sourceLang || "auto"}:${item.targetLang}:${item.text}`;
}
function getFromCache(key) {
  const hit = memCache.get(key);
  if (hit && hit.expireAt > Date.now()) return hit.value;
  if (hit) memCache.delete(key);
  return null;
}
function setToCache(key, value) {
  memCache.set(key, { value, expireAt: Date.now() + TTL_MS });
}

// تنظيف المخرجات
function sanitizeOut(s) {
  if (!s || typeof s !== "string") return "";
  // إزالة اقتباسات ومسافات من الطرفين
  return s.replace(/^["'«»\s]+|["'«»\s]+$/g, "").trim();
}

// كشف ردود الاعتذار/الشرح
function looksLikeApology(s) {
  if (!s) return true;
  const p = [
    /i'?m sorry/i,
    /i apologize/i,
    /as an ai/i,
    /cannot translate/i,
    /error in the translation/i,
    /unable to/i,
    /please provide/i,
  ];
  return p.some((rx) => rx.test(s));
}

async function translateOne({ text, targetLang = "en", sourceLang = "ar" }) {
  if (!text) return "";
  if (targetLang === "ar") return String(text || "");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");

  const messages = [
    {
      role: "system",
      content:
        "You are a translation engine. Return ONLY the translated text. No apologies, no explanations, no quotes. Preserve bullets, punctuation, and line breaks. If the input is already in the target language, return it as-is.",
    },
    {
      role: "user",
      content: `Source: ${sourceLang || "auto"}\nTarget: ${targetLang}\nText:\n${text}`,
    },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: TEMPERATURE,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${errText}`);
  }

  const data = await res.json().catch(() => ({}));
  let translated = data?.choices?.[0]?.message?.content ?? "";
  translated = sanitizeOut(translated);
  // لو رد غير مناسب، رجّع النص الأصلي
  if (!translated || looksLikeApology(translated)) return String(text || "");
  return translated;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text, targetLang = "en", sourceLang = "ar", items } = req.body || {};

    // ترجمة دفعة عناصر: items = [{ key, text, targetLang?, sourceLang? }]
    if (Array.isArray(items) && items.length) {
      const results = await Promise.all(
        items.map(async (it) => {
          const payload = {
            text: String(it.text || ""),
            targetLang: it.targetLang || targetLang || "en",
            sourceLang: it.sourceLang || sourceLang || "ar",
          };
          const k = cacheKey({ ...payload, key: it.key });
          const cached = getFromCache(k);
          if (cached) return { key: it.key, translated: cached, cached: true };

          try {
            const translated = await translateOne(payload);
            // خزّن فقط لو الناتج صالح
            if (translated && translated !== payload.text) setToCache(k, translated);
            return { key: it.key, translated, cached: false };
          } catch {
            return { key: it.key, translated: payload.text, cached: false };
          }
        })
      );

      return res.status(200).json({ items: results, provider: "openai" });
    }

    // حالة نص واحد
    const single = {
      text: String(text || ""),
      targetLang: targetLang || "en",
      sourceLang: sourceLang || "ar",
    };
    const k = cacheKey({ ...single, key: "single" });
    const cached = getFromCache(k);
    if (cached) {
      return res.status(200).json({ translated: cached, cached: true, provider: "openai" });
    }

    const translated = await translateOne(single);
    if (translated && translated !== single.text) setToCache(k, translated);
    return res.status(200).json({ translated, cached: false, provider: "openai" });
  } catch (e) {
    console.error("Translate API error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}