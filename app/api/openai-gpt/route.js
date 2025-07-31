import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { NextResponse } from "next/server";
import { findFaqAnswer } from "../../../components/ClientChat/faqSearch";

// إعداد فايربيز (مرة واحدة فقط)
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

// خريطة البلد للغة
const countryLangMap = {
  "SA": "ar", // السعودية
  "AE": "ar", // الإمارات
  "EG": "ar", // مصر
  "JO": "ar",
  "KW": "ar",
  "QA": "ar",
  "OM": "ar",
  "BH": "ar",
  "DZ": "ar",
  "MA": "ar",
  "TN": "ar",
  "LB": "ar",
  "SY": "ar",
  "IQ": "ar",
  "PS": "ar",
  "SD": "ar",
  "YE": "ar",
  "LY": "ar",
  "MR": "ar",
  "DJ": "ar",
  "SO": "ar",
  "FR": "fr",
  "BE": "fr",
  "CH": "fr",
  "US": "en",
  "GB": "en",
  "CA": "en",
  "DE": "de",
  "ES": "es",
  "IT": "it",
  // أضف باقي الدول حسب الحاجة
};

export async function POST(req) {
  // استقبال بيانات العميل من المودال/الشات
  let { prompt, lang, country, userName, isWelcome } = await req.json();

  // تحديد اللغة من البلد لو لم يتم إرسالها
  if (!lang && country) {
    const countryCode = country.length === 2 ? country.toUpperCase() : null;
    lang = countryLangMap[countryCode] || "ar";
  }

  // ===== رسالة ترحيب تلقائية من OpenAI =====
  if (isWelcome || /welcome|ترحيب|bienvenue/i.test(prompt)) {
    let welcomePrompt = "";
    switch (lang) {
      case "ar":
        welcomePrompt = `اكتب رسالة ترحيب احترافية وودية للعميل الجديد باسم ${userName || "العميل"} في منصة تأهيل، واذكر الدولة ${country || ""} في الترحيب.`;
        break;
      case "en":
        welcomePrompt = `Write a professional and friendly welcome message for a new user named ${userName || "the client"} on Taheel platform. Mention the country ${country || ""} in the welcome.`;
        break;
      case "fr":
        welcomePrompt = `Rédige un message de bienvenue professionnel et convivial pour un nouvel utilisateur nommé ${userName || "le client"} sur la plateforme Taheel. Mentionne le pays ${country || ""} dans le message.`;
        break;
      default:
        welcomePrompt = `Write a professional and friendly welcome message for a new user named ${userName || "the client"} on Taheel platform. Country: ${country || ""}. Respond ONLY in language code: ${lang}.`;
        break;
    }

    // رسالة النظام لتأكيد اللغة المختارة
    const systemMessage =
      lang === "ar"
        ? "أنت مساعد ذكي، يجب أن ترد فقط باللغة العربية مهما كان السؤال أو البرومبت."
        : lang === "en"
        ? "You are a smart assistant. You must respond ONLY in English, no matter what the user prompt is."
        : lang === "fr"
        ? "Tu es un assistant intelligent. Tu dois répondre UNIQUEMENT en français, quel que soit le prompt de l'utilisateur."
        : `You are a smart assistant. Respond ONLY in language code: ${lang}.`;

    const apiKey = process.env.OPENAI_API_KEY;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: welcomePrompt }
        ],
        max_tokens: 300,
        temperature: 0.4,
      }),
    });
    const data = await response.json();
    return NextResponse.json({
      text: data?.choices?.[0]?.message?.content?.trim() || "",
    });
  }
  // ===== نهاية الترحيب =====

  // 1. البحث في الأسئلة الشائعة أولاً (حسب لغة العميل المختارة من المودال)
  const faqAnswer = findFaqAnswer(prompt, lang);
  if (faqAnswer) {
    return NextResponse.json({ text: faqAnswer });
  }

  if (!data?.choices?.[0]?.message?.content) {
  return NextResponse.json({
    text:
      lang === "ar"
        ? "نعتذر، حدث خطأ أثناء توليد الإجابة. يرجى المحاولة مرة أخرى أو التواصل مع خدمة العملاء."
        : lang === "fr"
        ? "Désolé, une erreur s'est produite lors de la génération de la réponse. Veuillez réessayer ou contacter le service client."
        : "Sorry, something went wrong while generating the reply. Please try again or contact support.",
    customerService: true,
  });
}


  // 2. بحث في الخدمات أو الأسعار أو التتبع من قاعدة البيانات
  if (/سعر|price|cost|خدمة|service|تتبع|tracking/i.test(prompt)) {
    const db = getFirestore();
    let servicesSnapshot;
    try {
      servicesSnapshot = await getDocs(collection(db, "services"));
    } catch (e) {
      // خطأ في جلب البيانات
      return NextResponse.json({
        text: lang === "ar"
          ? "حدث خطأ أثناء جلب بيانات الخدمات."
          : lang === "en"
          ? "An error occurred while fetching services data."
          : "Une erreur est survenue lors de la récupération des données de service.",
        customerService: true,
      });
    }

    // حماية ضد undefined/null
    const services = [];
    if (servicesSnapshot && typeof servicesSnapshot.forEach === "function") {
      servicesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data && typeof data === "object") services.push(data);
      });
    }

    // لو لم توجد بيانات
    if (!Array.isArray(services) || services.length === 0) {
      let noDataMsg;
      switch (lang) {
        case "ar":
          noDataMsg = "لم يتم العثور على بيانات الخدمات في قاعدة البيانات. هل ترغب بالتواصل مع موظف خدمة العملاء؟";
          break;
        case "en":
          noDataMsg = "No service data was found in the database. Would you like to contact a customer service agent?";
          break;
        case "fr":
          noDataMsg = "Aucune donnée de service trouvée dans la base de données. Voulez-vous contacter un agent du service client?";
          break;
        default:
          noDataMsg = `No service data found in the database. Would you like to contact a customer service agent?`;
          break;
      }
      return NextResponse.json({
        text: noDataMsg,
        customerService: true,
      });
    }

    // تجهيز بيانات الخدمات بشكل آمن
    const dataString = services
      .map(s => {
        const name = typeof s.name === "string" ? s.name : "";
        const price = s.price || s.cost || "";
        const description = typeof s.description === "string" ? s.description : "";
        return `${name}: ${price} (${description})`;
      })
      .join('\n');

    // بناء prompt للـ OpenAI حسب اللغة المختارة من العميل
    let systemPrompt = "";
    switch (lang) {
      case "ar":
        systemPrompt = `استخدم فقط بيانات الخدمات التالية للإجابة على سؤال المستخدم باللغة العربية، ووجه الإجابة للعميل باسم ${userName || "العميل"}:\n${dataString}\n\nسؤال المستخدم: ${prompt}`;
        break;
      case "en":
        systemPrompt = `Use ONLY the following services data to answer the user's question in English, addressing the client named ${userName || "the client"}:\n${dataString}\n\nUser question: ${prompt}`;
        break;
      case "fr":
        systemPrompt = `Utilise UNIQUEMENT les données de services suivantes pour répondre à la question de l'utilisateur en français, en s'adressant au client nommé ${userName || "le client"}:\n${dataString}\n\nQuestion utilisateur: ${prompt}`;
        break;
      default:
        systemPrompt = `Use ONLY the following services data to answer the user's question, addressing the client named ${userName || "the client"}:\n${dataString}\n\nUser question: ${prompt}. Respond ONLY in language code: ${lang}.`;
        break;
    }

    // رسالة النظام لتأكيد اللغة المختارة
    const systemMessage =
      lang === "ar"
        ? "أنت مساعد ذكي، يجب أن ترد فقط باللغة العربية مهما كان السؤال أو البرومبت."
        : lang === "en"
        ? "You are a smart assistant. You must respond ONLY in English, no matter what the user prompt is."
        : lang === "fr"
        ? "Tu es un assistant intelligent. Tu dois répondre UNIQUEMENT en français, quel que soit le prompt de l'utilisateur."
        : `You are a smart assistant. Respond ONLY in language code: ${lang}.`;

    // إرسال الطلب للـ OpenAI بنفس اللغة المختارة
    const apiKey = process.env.OPENAI_API_KEY;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: systemPrompt }
        ],
        max_tokens: 700,
        temperature: 0.4,
      }),
    });
    const data = await response.json();
    return NextResponse.json({
      text: data?.choices?.[0]?.message?.content?.trim() || "",
    });
  }

  // 3. الرد العام من OpenAI بنفس اللغة المختارة من العميل
  let userPrompt = "";
  switch (lang) {
    case "ar":
      userPrompt = `اكتب رد احترافي ودود للعميل باسم ${userName || "العميل"} باللغة العربية فقط: ${prompt}`;
      break;
    case "en":
      userPrompt = `Write a professional and friendly reply in English only to the client${userName ? ` named ${userName}` : ""}: ${prompt}`;
      break;
    case "fr":
      userPrompt = `Rédige une réponse professionnelle et conviviale en français uniquement pour le client${userName ? ` nommé ${userName}` : ""}: ${prompt}`;
      break;
    default:
      userPrompt = `Write a professional and friendly reply for the client${userName ? ` named ${userName}` : ""}: ${prompt}. Respond ONLY in language code: ${lang}.`;
      break;
  }

  // رسالة النظام لتأكيد اللغة المختارة
  const systemMessage =
    lang === "ar"
      ? "أنت مساعد ذكي، يجب أن ترد فقط باللغة العربية مهما كان السؤال أو البرومبت."
      : lang === "en"
      ? "You are a smart assistant. You must respond ONLY in English, no matter what the user prompt is."
      : lang === "fr"
      ? "Tu es un assistant intelligent. Tu dois répondre UNIQUEMENT en français, quel que soit le prompt de l'utilisateur."
      : `You are a smart assistant. Respond ONLY in language code: ${lang}.`;

  const apiKey = process.env.OPENAI_API_KEY;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 700,
      temperature: 0.4,
    }),
  });
  const data = await response.json();
  return NextResponse.json({
    text: data?.choices?.[0]?.message?.content?.trim() || "",
  });
}