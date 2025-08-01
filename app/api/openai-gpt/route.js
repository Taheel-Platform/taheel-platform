import { NextResponse } from "next/server";
import { findFaqAnswer } from "../../../components/ClientChat/faqSearch";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// إعداد فايربيز أدمن لمرة واحدة فقط
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

const countryLangMap = { EG: "ar", SA: "ar", AE: "ar", QA: "ar", KW: "ar", OM: "ar", JO: "ar", MA: "ar", DZ: "ar", TN: "ar", LB: "ar", IQ: "ar", PS: "ar", FR: "fr", US: "en", GB: "en", CA: "en", DE: "de", IT: "it", ES: "es", PT: "pt", IN: "hi", CN: "zh", JP: "ja", KR: "ko", RU: "ru", BR: "pt", AU: "en", ZA: "en", TR: "tr", ID: "id" };

export async function POST(req) {
  let {
    prompt,
    lang,
    country,
    userName,
    isWelcome,
    userId,
    waitingForAgent, // يجب ترسله من الواجهة
    customerServiceRequestCount = 0 // عدد مرات طلب خدمة العملاء (ترسله من الواجهة)
  } = await req.json();

  // 1. لو العميل محول للموظف خلاص: الذكاء الصناعي يسكت
  if (waitingForAgent) {
    return NextResponse.json({
      text: lang === "ar"
        ? "تم تحويلك لموظف خدمة العملاء. يرجى الانتظار..."
        : lang === "en"
        ? "You are being transferred to a customer service agent. Please wait..."
        : "Vous êtes en cours de transfert vers un agent du service client. Veuillez patienter...",
      customerService: true,
      aiSilenced: true,
    });
  }

  // بيانات العميل
  let realName = userName;
  let realLang = lang;
  let realEmail = "";
  let realRole = "";
  let clientRequests = [];
  let clientServices = [];

  // جلب بيانات العميل + الطلبات + الخدمات من فايربيز
  if (userId) {
    try {
      const userRef = db.collection("users").doc(userId);
      const snap = await userRef.get();

      if (snap.exists) {
        const data = snap.data();
        realName = lang === "ar"
          ? data.nameAr || data.name || data.firstName || realName
          : lang === "en"
          ? data.nameEn || data.name || data.firstName || realName
          : data.nameEn || data.nameAr || data.name || data.firstName || realName;
        realEmail = data.email || "";
        realRole = data.role || "";
        if (data.lang) realLang = data.lang;
      }

      // جلب الطلبات
      const requestsSnap = await userRef.collection("requests").get();
      requestsSnap.forEach(doc => {
        const req = doc.data();
        clientRequests.push({
          id: doc.id,
          type: req.type || "",
          status: req.status || "",
          date: req.date || req.createdAt || ""
        });
      });

      // جلب الخدمات
      const servicesSnap = await userRef.collection("services").get();
      servicesSnap.forEach(doc => {
        const svc = doc.data();
        clientServices.push({
          id: doc.id,
          name: svc.name || "",
          price: svc.price || "",
          status: svc.status || "",
          desc: svc.description || ""
        });
      });

    } catch (err) { /* تجاهل الخطأ */ }
  }

  if (!realLang && country) {
    const countryCode = country.length === 2 ? country.toUpperCase() : null;
    realLang = countryLangMap[countryCode] || "ar";
  }
  if (!realLang) realLang = "ar";
  if (!realName) realName = "زائر";

  // 2. رسالة الترحيب - ترسل مرة واحدة فقط
if (isWelcome) {
  // ... إعداد بيانات الترحيب
  let welcomePrompt = "";
  switch (realLang) {
    case "ar":
      welcomePrompt =
        `اكتب رسالة ترحيب احترافية وودية للعميل الجديد باسم ${realName}، البريد الإلكتروني: ${realEmail}, النوع: ${realRole} في منصة تأهيل (الدولة: ${country || ""}).\n\n` +
        `نبذة عن الشركة: ${companyInfo}\n\n` +
        `طلبات العميل:\n${requestsText}\n\n` +
        `الخدمات المفعلة:\n${servicesText}\n\n` +
        "اجعل الترحيب شخصي واذكر الخدمات أو الطلبات لو موجودة. لا تذكر خدمة العملاء أو الدعم في رسالة الترحيب.";
      break;
    case "en":
      welcomePrompt =
        `Write a professional and friendly welcome message for the new user named ${realName}, email: ${realEmail}, role: ${realRole} on Taheel platform (country: ${country || ""}).\n\n` +
        `About the company: ${companyInfo}\n\n` +
        `Client requests:\n${requestsText}\n\n` +
        `Activated services:\n${servicesText}\n\n` +
        "Make the welcome personal and mention any services or requests if available. Do not mention customer service or support in the welcome message.";
      break;
    case "fr":
      welcomePrompt =
        `Rédige un message de bienvenue professionnel et convivial pour le nouvel utilisateur nommé ${realName}, email : ${realEmail}, rôle : ${realRole} sur la plateforme Taheel (pays : ${country || ""}).\n\n` +
        `À propos de l'entreprise : ${companyInfo}\n\n` +
        `Demandes du client :\n${requestsText}\n\n` +
        `Services activés :\n${servicesText}\n\n` +
        "Rends le message personnel et mentionne les services ou demandes s'ils existent. N'inclus pas le service client ou le support dans le message de bienvenue.";
      break;
    // ... باقي اللغات
  }

    const systemMessage =
      realLang === "ar"
        ? "أنت مساعد ذكي، يجب أن ترد فقط باللغة العربية مهما كان السؤال أو البرومبت."
        : realLang === "en"
        ? "You are a smart assistant. You must respond ONLY in English, no matter what the user prompt is."
        : realLang === "fr"
        ? "Tu es un assistant intelligent. Tu dois répondre UNIQUEMENT en français, quel que soit le prompt de l'utilisateur."
        : `You are a smart assistant. Respond ONLY in language code: ${realLang}.`;

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
        max_tokens: 500,
        temperature: 0.4,
      }),
    });
    const data = await response.json();
    // تأكيد أن الرسالة الترحيبية تبدأ باسم العميل
let welcomeText = data?.choices?.[0]?.message?.content?.trim() || "";
if (!welcomeText) {
  // fallback حسب اللغة المختارة
  if (realLang === "ar") {
    welcomeText = `مرحبًا بك يا ${realName}!`;
  } else if (realLang === "en") {
    welcomeText = `Welcome ${realName}!`;
  } else if (realLang === "fr") {
    welcomeText = `Bienvenue ${realName}!`;
  } else {
    welcomeText = `مرحبًا بك يا ${realName}!`;
  }
}
if (realLang === "ar" && !welcomeText.startsWith(`مرحبًا بك يا ${realName}`)) {
  welcomeText = `مرحبًا بك يا ${realName}!\n\n${welcomeText}`;
}
if (realLang === "en" && !welcomeText.toLowerCase().startsWith(`welcome ${realName.toLowerCase()}`)) {
  welcomeText = `Welcome ${realName}!\n\n${welcomeText}`;
}
    // أضف الفرنسي لو تحب

    return NextResponse.json({
      text: welcomeText,
      isWelcome: true,
    });
  }

  // 3. البحث في الأسئلة الشائعة أولاً
  const faqAnswer = findFaqAnswer(prompt, realLang);
  if (faqAnswer) {
    return NextResponse.json({ text: faqAnswer });
  }

  // 4. بحث في الخدمات أو الأسعار أو التتبع من قاعدة البيانات
  if (/سعر|price|cost|خدمة|service|تتبع|tracking/i.test(prompt)) {
    let servicesSnapshot;
    try {
      servicesSnapshot = await db.collection("services").get();
    } catch (e) {
      return NextResponse.json({
        text: realLang === "ar"
          ? "حدث خطأ أثناء جلب بيانات الخدمات."
          : realLang === "en"
          ? "An error occurred while fetching services data."
          : "Une erreur est survenue lors de la récupération des données de service.",
        customerService: true,
      });
    }

    const services = [];
    if (servicesSnapshot && typeof servicesSnapshot.forEach === "function") {
      servicesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data && typeof data === "object") services.push(data);
      });
    }

    if (!Array.isArray(services) || services.length === 0) {
      let noDataMsg;
      switch (realLang) {
        case "ar":
  welcomePrompt =
    `اكتب رسالة ترحيب احترافية وودية للعميل الجديد باسم ${realName}، البريد الإلكتروني: ${realEmail}, النوع: ${realRole} في منصة تأهيل (الدولة: ${country || ""}).\n\n` +
    `نبذة عن الشركة: ${companyInfo}\n\n` +
    `طلبات العميل:\n${requestsText}\n\n` +
    `الخدمات المفعلة:\n${servicesText}\n\n` +
    "اجعل الترحيب شخصي واذكر الخدمات أو الطلبات لو موجودة. لا تذكر خدمة العملاء أو الدعم في الترحيب.";
  break;
case "en":
  welcomePrompt =
    `Write a professional and friendly welcome message for the new user named ${realName}, email: ${realEmail}, role: ${realRole} on Taheel platform (country: ${country || ""}).\n\n` +
    `About the company: ${companyInfo}\n\n` +
    `Client requests:\n${requestsText}\n\n` +
    `Activated services:\n${servicesText}\n\n` +
    "Make the welcome personal and mention any services or requests if available. Do not mention customer service or support in the welcome message.";
  break;
case "fr":
  welcomePrompt =
    `Rédige un message de bienvenue professionnel et convivial pour le nouvel utilisateur nommé ${realName}, email : ${realEmail}, rôle : ${realRole} sur la plateforme Taheel (pays : ${country || ""}).\n\n` +
    `À propos de l'entreprise : ${companyInfo}\n\n` +
    `Demandes du client :\n${requestsText}\n\n` +
    `Services activés :\n${servicesText}\n\n` +
    "Rends le message personnel et mentionne les services ou demandes s'ils existent. N'inclus pas le service client ou le support dans le message de bienvenue.";
  break;

      }
      return NextResponse.json({
        text: noDataMsg,
        customerService: true,
      });
    }

    const dataString = services
      .map(s => {
        const name = typeof s.name === "string" ? s.name : "";
        const price = s.price || s.cost || "";
        const description = typeof s.description === "string" ? s.description : "";
        return `${name}: ${price} (${description})`;
      })
      .join('\n');

    let systemPrompt = "";
    switch (realLang) {
      case "ar":
        systemPrompt = `استخدم فقط بيانات الخدمات التالية للإجابة على سؤال المستخدم باللغة العربية، ووجه الإجابة للعميل باسم ${realName}:\n${dataString}\n\nسؤال المستخدم: ${prompt}`;
        break;
      case "en":
        systemPrompt = `Use ONLY the following services data to answer the user's question in English, addressing the client named ${realName}:\n${dataString}\n\nUser question: ${prompt}`;
        break;
      case "fr":
        systemPrompt = `Utilise UNIQUEMENT les données de services suivantes pour répondre à la question de l'utilisateur en français, en s'adressant au client nommé ${realName}:\n${dataString}\n\nQuestion utilisateur: ${prompt}`;
        break;
      default:
        systemPrompt = `Use ONLY the following services data to answer the user's question, addressing the client named ${realName}:\n${dataString}\n\nUser question: ${prompt}. Respond ONLY in language code: ${realLang}.`;
        break;
    }

    const systemMessage =
      realLang === "ar"
        ? "أنت مساعد ذكي، يجب أن ترد فقط باللغة العربية مهما كان السؤال أو البرومبت."
        : realLang === "en"
        ? "You are a smart assistant. You must respond ONLY in English, no matter what the user prompt is."
        : realLang === "fr"
        ? "Tu es un assistant intelligent. Tu dois répondre UNIQUEMENT en français, quel que soit le prompt de l'utilisateur."
        : `You are a smart assistant. Respond ONLY in language code: ${realLang}.`;

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

  // 5. الرد على جمل طلب خدمة العملاء (ذكاء صناعي)
  const customerServiceRegex = /(خدمة العملاء|موظف خدمة العملاء|اتواصل مع موظف|أكلم موظف|customer service|customer agent|contact agent|support agent|live agent)/i;
  if (customerServiceRegex.test(prompt)) {
    // لو أول مرة أو الثانية: شجعه يكمل مع الذكاء الصناعي فقط
    if (customerServiceRequestCount < 2) {
      return NextResponse.json({
        text: realLang === "ar"
          ? "أنا هنا لأساعدك! هل ترغب في شرح مشكلتك أو سؤالك بشكل أوضح؟"
          : realLang === "en"
          ? "I'm here to help! Please try to explain your request or question."
          : "Je suis là pour vous aider ! Essayez d’expliquer votre question.",
        customerServicePrompt: true,
        customerServiceRequestCount: customerServiceRequestCount + 1 // عُدّل في الواجهة
      });
    } else {
      // للمرة الثالثة أو أكثر: أظهر زر التحويل
      return NextResponse.json({
        text: realLang === "ar"
          ? "تم تفعيل خيار التواصل مع موظف خدمة العملاء. اضغط الزر بالأسفل ليتم تحويلك."
          : realLang === "en"
          ? "You can now contact a customer service agent. Click the button below to be transferred."
          : "Vous pouvez maintenant contacter un agent du service client. Cliquez sur le bouton ci-dessous.",
        showTransferButton: true,
        customerServiceRequestCount: customerServiceRequestCount + 1
      });
    }
  }

  // 6. الرد العام من OpenAI
let userPrompt = "";
switch (realLang) {
  case "ar":
    userPrompt = `اكتب رد احترافي ودود للعميل باسم ${realName} باللغة العربية فقط: ${prompt}.`;
    break;
  case "en":
    userPrompt = `Write a professional and friendly reply in English only to the client${realName ? ` named ${realName}` : ""}: ${prompt}.`;
    break;
  case "fr":
    userPrompt = `Rédige une réponse professionnelle et conviviale en français uniquement pour le client${realName ? ` nommé ${realName}` : ""}: ${prompt}.`;
    break;
  default:
    userPrompt = `Write a professional and friendly reply for the client${realName ? ` named ${realName}` : ""}: ${prompt}. Respond ONLY in language code: ${realLang}.`;
    break;
}

  const systemMessage =
    realLang === "ar"
      ? "أنت مساعد ذكي، يجب أن ترد فقط باللغة العربية مهما كان السؤال أو البرومبت."
      : realLang === "en"
      ? "You are a smart assistant. You must respond ONLY in English, no matter what the user prompt is."
      : realLang === "fr"
      ? "Tu es un assistant intelligent. Tu dois répondre UNIQUEMENT en français, quel que soit le prompt de l'utilisateur."
      : `You are a smart assistant. Respond ONLY in language code: ${realLang}.`;

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