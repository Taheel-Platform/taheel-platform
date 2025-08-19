/* eslint-disable no-console */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_TRANSLATE_MODEL || "gpt-3.5-turbo";

// كاش بسيط بالذاكرة مع TTL (30 يوم)
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

async function translateOne({ text, targetLang = "en", sourceLang = "ar", outJson = false }) {
  // لو الهدف عربي رجّع النص كما هو
  if (!text || targetLang === "ar") return String(text || "");

  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");

  const userMsg = outJson
    ? [
        {
          role: "system",
          content:
            "You are a translation engine. Translate user content to the requested target language. Return only the translated text without any additional commentary.",
        },
        {
          role: "user",
          content: `Source language: ${sourceLang || "auto"}\nTarget language: ${targetLang}\nText:\n${text}`,
        },
      ]
    : [
        {
          role: "user",
          content: `Translate the following text from ${sourceLang || "auto"} to ${targetLang}. Return only the translated text:\n${text}`,
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
      messages: userMsg,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${errText}`);
  }

  const data = await res.json().catch(() => ({}));
  const translated = data?.choices?.[0]?.message?.content?.trim();
  return translated ?? "";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text, targetLang = "en", sourceLang = "ar", items } = req.body || {};

    // دعم: إما نص واحد text أو قائمة عناصر items = [{ key, text, sourceLang?, targetLang? }]
    if (Array.isArray(items) && items.length) {
      const results = await Promise.all(
        items.map(async (it) => {
          const payload = {
            text: String(it.text || ""),
            targetLang: it.targetLang || targetLang || "en",
            sourceLang: it.sourceLang || sourceLang || "ar",
          };
          const key = cacheKey({ ...payload, key: it.key });
          const cached = getFromCache(key);
          if (cached) return { key: it.key, translated: cached, cached: true };

          const translated = await translateOne(payload);
          setToCache(key, translated);
          return { key: it.key, translated, cached: false };
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
    const key = cacheKey({ ...single, key: "single" });
    const cached = getFromCache(key);
    if (cached) {
      return res.status(200).json({ translated: cached, cached: true, provider: "openai" });
    }

    const translated = await translateOne(single);
    setToCache(key, translated);
    return res.status(200).json({ translated, cached: false, provider: "openai" });
  } catch (e) {
    console.error("Translate API error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}