import { NextResponse } from "next/server";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  // بيانات مشروعك هنا
};
if (!getApps().length) initializeApp(firebaseConfig);

export async function POST(req) {
  const { prompt, lang } = await req.json();
  let dataString = '';

  // مثال: جلب الخدمات لو السؤال فيه خدمة أو سعر أو تتبع
  if (/سعر|price|cost|خدمة|service|تتبع|tracking/i.test(prompt)) {
    const db = getFirestore();
    const servicesSnapshot = await getDocs(collection(db, "services"));
    const services = [];
    servicesSnapshot.forEach(doc => {
      services.push(doc.data());
    });
    dataString = services.map(s => `${s.name}: ${s.price || s.cost} (${s.description || ""})`).join('\n');
  }

  let systemPrompt = dataString
    ? `Use ONLY the following services data to answer the user's question:\n${dataString}\n\nUser question: ${prompt}`
    : prompt;

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
  return NextResponse.json({
    text: data.choices?.[0]?.message?.content?.trim() || "",
  });
}