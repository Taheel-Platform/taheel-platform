import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";

// ... إعدادات Firebase فقط لو لم تكن مهيأة

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, lang } = req.body;
  let dataString = '';

  // مثال: لو السؤال فيه كلمة "سعر" أو "خدمة" أو "تتبع"
  if (/سعر|price|cost|خدمة|service|تتبع|tracking/i.test(prompt)) {
    // جلب بيانات الخدمات من Firestore (غير المسار حسب مجموعتك)
    const db = getFirestore();
    const servicesSnapshot = await getDocs(collection(db, "services"));
    const services = [];
    servicesSnapshot.forEach(doc => {
      services.push(doc.data());
    });
    // بناء نص بالأسعار والخدمات
    dataString = services.map(s => `${s.name}: ${s.price || s.cost} (${s.description || ""})`).join('\n');
  }

  // بناء برومبت ChatGPT
  let systemPrompt = dataString
    ? `Use ONLY the following services data to answer the user's question:\n${dataString}\n\nUser question: ${prompt}`
    : prompt;

  // إرسال إلى ChatGPT
  const apiKey = process.env.OPENAI_API_KEY;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 700,
      temperature: 0.4,
    }),
  });
  const data = await response.json();
  return res.status(200).json({
    text: data.choices?.[0]?.message?.content?.trim() || "",
  });
}