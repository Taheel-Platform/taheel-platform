const mem = new Map();

function keyOf({ text, target = "en", source = "ar", fieldKey }) {
  return `tr:${fieldKey || ""}:${source}:${target}:${text}`;
}
function getLocal(k) { if (typeof window === "undefined") return null; try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } }
function setLocal(k, v) { if (typeof window === "undefined") return; try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function stripEchoPrefix(s) {
  if (!s) return s;
  return s
    .replace(/^(```[a-z]*\n)?\s*(source\s*:.*\n)?\s*(target\s*:.*\n)?\s*(text\s*:)?\s*/i, "")
    .replace(/```+$/g, "")
    .trim();
}
function looksBad(s) {
  if (!s) return true;
  const bad = [/i'?m sorry/i, /i apologize/i, /as an ai/i, /error in the translation/i, /please provide/i, /unable to/i];
  return bad.some((rx) => rx.test(s));
}

export async function translateText(arg, maybeTarget) {
  let text = "", target = "en", source = "ar", fieldKey;
  if (typeof arg === "string") { text = arg || ""; target = maybeTarget || "en"; }
  else if (arg && typeof arg === "object") { text = arg.text || ""; target = arg.target || "en"; source = arg.source || "ar"; fieldKey = arg.fieldKey; }

  if (!text || target === "ar") return text;

  const key = keyOf({ text, target, source, fieldKey });
  const memHit = mem.get(key); if (memHit) return memHit;
  const loc = getLocal(key); if (loc) { mem.set(key, loc); return loc; }

  try {
    const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, targetLang: target, sourceLang: source }) });
    const data = await res.json().catch(() => ({}));
    let out = data?.translated ?? text;
    if (!out || looksBad(out)) out = text;
    out = stripEchoPrefix(out).replace(/^["'«»\s]+|["'«»\s]+$/g, "").trim();

    mem.set(key, out); setLocal(key, out);
    return out;
  } catch {
    return text;
  }
}