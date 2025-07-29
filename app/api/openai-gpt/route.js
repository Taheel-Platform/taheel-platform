import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { NextResponse } from "next/server";
import { findFaqAnswer } from "../../../components/ClientChat/faqSearch";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!getApps().length) initializeApp(firebaseConfig);

export async function POST(req) {
  const { prompt, lang } = await req.json();

  // 1. ابحث في الأسئلة الشائعة أولاً (بحث مرن جزئي)
  const faqAnswer = findFaqAnswer(prompt, lang || "ar");
  if (faqAnswer) {
    return NextResponse.json({ text: faqAnswer });
  }

  let dataString = '';

  // 2. لو السؤال متعلق بالخدمات أو الأسعار أو التتبع ابحث في فايرستور
  if (/سعر|price|cost|خدمة|service|تتبع|tracking/i.test(prompt)) {
    const db = getFirestore();
    const servicesSnapshot = await getDocs(collection(db, "services"));
    const services = [];
    servicesSnapshot.forEach(doc => {
      services.push(doc.data());
    });
    if (services.length === 0) {
      return NextResponse.json({
        text:
          lang === "ar"
            ? "لم يتم العثور على بياناتك في قاعدة البيانات. هل ترغب بالتواصل مع موظف خدمة العملاء؟"
            : lang === "en"
            ? "No data was found for you in the database. Would you like to contact a customer service agent?"
            : "Aucune donnée n'a été trouvée dans la base de données. Voulez-vous contacter un agent du service client?",
        customerService: true,
      });
    }
    dataString = services
      .map(s => `${s.name}: ${s.price || s.cost} (${s.description || ""})`)
      .join('\n');
    if (dataString) {
      // توجيه اللغة للـ OpenAI في الرد
      let systemPrompt = "";
      if (lang === "ar") {
        systemPrompt = `استخدم فقط بيانات الخدمات التالية للإجابة على سؤال المستخدم باللغة العربية:\n${dataString}\n\nسؤال المستخدم: ${prompt}`;
      } else if (lang === "en") {
        systemPrompt = `Use ONLY the following services data to answer the user's question in English:\n${dataString}\n\nUser question: ${prompt}`;
      } else {
        systemPrompt = `Utilise UNIQUEMENT les données de services suivantes pour répondre à la question de l'utilisateur en français:\n${dataString}\n\nQuestion utilisateur: ${prompt}`;
      }
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
  }

  // 3. الرد العام من OpenAI حسب اللغة المختارة
  let userPrompt = "";
  if (lang === "ar") {
    userPrompt = `أجب على هذا السؤال بشكل احترافي باللغة العربية: ${prompt}`;
  } else if (lang === "en") {
    userPrompt = `Answer this question professionally in English: ${prompt}`;
  } else {
    userPrompt = `Réponds à cette question professionnellement en français: ${prompt}`;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 700,
      temperature: 0.4,
    }),
  });
  const data = await response.json();
  return NextResponse.json({
    text: data.choices?.[0]?.message?.content?.trim() || "",
  });
}