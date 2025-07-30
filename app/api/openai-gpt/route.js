import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { NextResponse } from "next/server";
import { findFaqAnswer } from "../../../components/ClientChat/faqSearch";

// إعداد فايربيز
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// التأكد من تهيئة فايربيز مرة واحدة فقط
if (!getApps().length) initializeApp(firebaseConfig);

export async function POST(req) {
  // استقبال البيانات من العميل
  const { prompt, lang = "ar", country, userName, isWelcome } = await req.json();

  // ===== رسالة ترحيب تلقائية من OpenAI =====
  if (isWelcome || /welcome|ترحيب|bienvenue/i.test(prompt)) {
    let welcomePrompt = "";
    if (lang === "ar") {
      welcomePrompt =
        `اكتب رسالة ترحيب احترافية وودية للعميل الجديد باسم ${userName ? userName : "العميل"} في منصة تأهيل.`;
    } else if (lang === "en") {
      welcomePrompt =
        `Write a professional and friendly welcome message for a new user named ${userName ? userName : "the client"} on Taheel platform.`;
    } else if (lang === "fr") {
      welcomePrompt =
        `Rédige un message de bienvenue professionnel et convivial pour un nouvel utilisateur nommé ${userName ? userName : "le client"} sur la plateforme Taheel.`;
    } else {
      // لأي لغة أخرى، اطلب الرد بنفس language code
      welcomePrompt =
        `Write a professional and friendly welcome message for a new user named ${userName ? userName : "the client"} on Taheel platform. Respond in language code: ${lang}.`;
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
        messages: [{ role: "user", content: welcomePrompt }],
        max_tokens: 300,
        temperature: 0.4,
      }),
    });
    const data = await response.json();
    return NextResponse.json({
      text: data.choices?.[0]?.message?.content?.trim() || "",
    });
  }
  // ===== نهاية الترحيب =====

  // 1. البحث في الأسئلة الشائعة أولاً (حسب لغة العميل)
  const faqAnswer = findFaqAnswer(prompt, lang);
  if (faqAnswer) {
    return NextResponse.json({ text: faqAnswer });
  }

  // 2. بحث في الخدمات أو الأسعار أو التتبع من قاعدة البيانات
  if (/سعر|price|cost|خدمة|service|تتبع|tracking/i.test(prompt)) {
    const db = getFirestore();
    const servicesSnapshot = await getDocs(collection(db, "services"));
    const services = [];
    servicesSnapshot.forEach(doc => {
      services.push(doc.data());
    });

    // لو لم توجد بيانات في قاعدة البيانات
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

    // تجهيز بيانات الخدمات
    const dataString = services
      .map(s => `${s.name}: ${s.price || s.cost} (${s.description || ""})`)
      .join('\n');

    // بناء prompt موجه للـ OpenAI حسب لغة العميل
    let systemPrompt = "";
    if (lang === "ar") {
      systemPrompt =
        `استخدم فقط بيانات الخدمات التالية للإجابة على سؤال المستخدم باللغة العربية، ووجه الإجابة للعميل باسم ${userName ? userName : "العميل"}:\n${dataString}\n\nسؤال المستخدم: ${prompt}`;
    } else if (lang === "en") {
      systemPrompt =
        `Use ONLY the following services data to answer the user's question in English, addressing the client named ${userName ? userName : "the client"}:\n${dataString}\n\nUser question: ${prompt}`;
    } else {
      systemPrompt =
        `Utilise UNIQUEMENT les données de services suivantes pour répondre à la question de l'utilisateur en français, en s'adressant au client nommé ${userName ? userName : "le client"}:\n${dataString}\n\nQuestion utilisateur: ${prompt}`;
    }

    // إرسال الطلب للـ OpenAI
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

  // 3. الرد العام من OpenAI حسب اللغة المختارة واسم العميل
  let userPrompt = "";
  if (lang === "ar") {
    userPrompt =
      `اكتب رد احترافي ودود للعميل باسم ${userName ? userName : "العميل"} باللغة العربية: ${prompt}`;
  } else if (lang === "en") {
    userPrompt =
      `Write a professional and friendly reply in English to the client${userName ? ` named ${userName}` : ""}: ${prompt}`;
  } else if (lang === "fr") {
    userPrompt =
      `Rédige une réponse professionnelle et conviviale en français pour le client${userName ? ` nommé ${userName}` : ""}: ${prompt}`;
  } else {
    // لأي لغة أخرى
    userPrompt =
      `Write a professional and friendly reply for the client${userName ? ` named ${userName}` : ""}: ${prompt}. Respond in language code: ${lang}.`;
  }

  // إرسال الطلب للـ OpenAI
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