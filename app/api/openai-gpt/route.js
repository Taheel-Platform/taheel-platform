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

const countryLangMap = {
  EG: "ar", SA: "ar", AE: "ar", QA: "ar", KW: "ar", OM: "ar", JO: "ar", MA: "ar", DZ: "ar", TN: "ar", LB: "ar", IQ: "ar", PS: "ar",
  FR: "fr", US: "en", GB: "en", CA: "en", DE: "de", IT: "it", ES: "es", PT: "pt", IN: "hi", CN: "zh", JP: "ja", KR: "ko", RU: "ru",
  BR: "pt", AU: "en", ZA: "en", TR: "tr", ID: "id"
};

const STATES_LIST = [
  "الإمارات", "مصر", "السعودية", "قطر", "الكويت", "عمان", "الأردن", "المغرب", "الجزائر", "تونس", "لبنان", "العراق", "فلسطين",
  "france", "usa", "uk", "canada", "germany", "italy", "spain", "portugal", "india", "china", "japan", "korea", "russia", "brazil", "australia", "south africa", "turkey", "indonesia"
];

// helper: اسم عميل صالح
function getValidClientName({ userName, userData = {}, country = "", lang = "ar" }) {
  let name = (userName || "").trim();
  if (!name || name.length < 2 || STATES_LIST.includes(name.toLowerCase()) || name.toLowerCase() === country?.toLowerCase() || /^\d+$/.test(name)) {
    name = lang === "ar"
      ? userData.nameAr || userData.name || userData.firstName || ""
      : lang === "en"
      ? userData.nameEn || userData.name || userData.firstName || ""
      : userData.nameEn || userData.nameAr || userData.name || userData.firstName || "";
  }
  if (!name || name.length < 2 || STATES_LIST.includes(name.toLowerCase()) || name.toLowerCase() === country?.toLowerCase() || /^\d+$/.test(name)) {
    name = lang === "ar"
      ? "ضيفنا الكريم"
      : lang === "en"
      ? "Our valued guest"
      : "Cher client";
  }
  return name;
}

export async function POST(req) {
  let {
    prompt,
    lang,
    country,
    userName,
    isWelcome,
    userId,
    waitingForAgent,
    customerServiceRequestCount = 0,
    clientType // نوع العميل (company, resident, nonresident, ...)
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
      showTransferButton: false,
      suggestAgent: false,
      customerServiceRequestCount
    });
  }

  // --- بيانات العميل ---
  let userDataFromFirebase = {};
  let realLang = lang;
  let realClientType = clientType || "company";
  let realEmail = "";
  let realRole = "";

  // جلب بيانات العميل من فايربيز
  if (userId) {
    try {
      const userRef = db.collection("users").doc(userId);
      const snap = await userRef.get();
      if (snap.exists) {
        const data = snap.data();
        userDataFromFirebase = data;
        realEmail = data.email || "";
        realRole = data.role || "";
        if (data.lang) realLang = data.lang;
        if (data.clientType) realClientType = data.clientType;
      }
    } catch (err) {}
  }

  // اسم العميل
  let realName = getValidClientName({ userName, userData: userDataFromFirebase, country, lang: realLang });

  // لغة العميل
  if (!realLang && country) {
    const countryCode = country.length === 2 ? country.toUpperCase() : null;
    realLang = countryLangMap[countryCode] || "ar";
  }
  if (!realLang) realLang = "ar";

  // --- رسالة الترحيب (مرة واحدة) ---
  if (isWelcome) {
    let welcomeText =
      realLang === "ar"
        ? `مرحبًا بك يا ${realName} : أنا مساعدك الشخصي في منصة تأهيل، أول منصة رقمية شاملة للخدمات الحكومية في الإمارات العربية المتحدة. كيف أقدر أساعدك اليوم؟`
        : realLang === "en"
        ? `Welcome ${realName}! I am your personal assistant on Taheel, the first comprehensive digital platform for government services in the UAE. How may I assist you today?`
        : `Bienvenue ${realName} ! Je suis votre assistant personnel sur Taheel, première plateforme numérique complète pour les services gouvernementaux aux Émirats arabes unis. Comment puis-je vous aider aujourd'hui ?`;

    return NextResponse.json({
      text: welcomeText,
      isWelcome: true,
      showTransferButton: false,
      suggestAgent: false,
      aiSilenced: false,
      customerServiceRequestCount
    });
  }

  // --- البحث في الأسئلة الشائعة ---
  const faqAnswer = findFaqAnswer(prompt, realLang);
  if (faqAnswer) {
    return NextResponse.json({
      text: faqAnswer,
      showTransferButton: false,
      suggestAgent: false,
      aiSilenced: false,
      customerServiceRequestCount
    });
  }

  // --- البحث عن الخدمات ---
  if (/سعر|price|cost|خدمة|service|كم|fees|رسوم|تأسيس|company|formation/i.test(prompt)) {
    let services = [];
    try {
      const servicesByTypeRef = db.collection("servicesByClientType").doc(realClientType);
      const servicesDoc = await servicesByTypeRef.get();
      if (servicesDoc.exists) {
        const data = servicesDoc.data();
        services = Object.values(data).filter(s => s && typeof s === "object" && s.isActive);
      }
    } catch (e) {}

    if (!Array.isArray(services) || services.length === 0) {
      try {
        const servicesSnapshot = await db.collection("services").get();
        if (servicesSnapshot && typeof servicesSnapshot.forEach === "function") {
          services = [];
          servicesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data && typeof data === "object" && data.isActive) services.push(data);
          });
        }
      } catch (e) {
        return NextResponse.json({
          text: realLang === "ar"
            ? "حدث خطأ أثناء جلب بيانات الخدمات."
            : realLang === "en"
            ? "An error occurred while fetching services data."
            : "Une erreur est survenue lors de la récupération des données de service.",
          customerService: true,
          showTransferButton: false,
          suggestAgent: false,
          aiSilenced: false,
          customerServiceRequestCount
        });
      }
    }

    if (!Array.isArray(services) || services.length === 0) {
      let noDataMsg;
      switch (realLang) {
        case "ar": noDataMsg = "لا توجد بيانات خدمات متاحة حالياً."; break;
        case "en": noDataMsg = "No services data available at the moment."; break;
        case "fr": noDataMsg = "Aucune donnée de service disponible pour le moment."; break;
        default: noDataMsg = "No services data available."; break;
      }
      return NextResponse.json({
        text: noDataMsg,
        customerService: true,
        showTransferButton: false,
        suggestAgent: false,
        aiSilenced: false,
        customerServiceRequestCount
      });
    }

    const dataString = services
      .map(s => {
        const name = realLang === "ar" ? (s.name || "") : (s.name_en || s.name || "");
        const price = s.price || s.cost || "";
        const description = realLang === "ar" ? (s.description || "") : (s.description_en || s.description || "");
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
      showTransferButton: false,
      suggestAgent: false,
      aiSilenced: false,
      customerServiceRequestCount
    });
  }

  // --- البحث عن طلب (tracking) ---
  if (/طلب|tracking|رقم الطلب|order\s*number|track/i.test(prompt)) {
    const orderNumberMatch = prompt.match(/(?:طلب|tracking|رقم الطلب|order\s*number|#)(\d+)/i);
    const orderId = orderNumberMatch ? orderNumberMatch[1] : null;

    if (!orderId) {
      return NextResponse.json({
        text: realLang === "ar"
          ? "من فضلك أدخل رقم الطلب أو الكود حتى أستطيع مساعدتك."
          : realLang === "en"
          ? "Please provide the order number or code so I can assist you."
          : "Veuillez fournir le numéro ou le code de la demande pour que je puisse vous aider.",
        askOrderId: true,
        showTransferButton: false,
        suggestAgent: false,
        aiSilenced: false,
        customerServiceRequestCount
      });
    }

    try {
      let orderData = null;
      const userRef = db.collection("users").doc(userId);
      const reqSnap = await userRef.collection("requests").doc(orderId).get();
      if (reqSnap.exists) {
        orderData = reqSnap.data();
      }
      if (orderData) {
        return NextResponse.json({
          text: realLang === "ar"
            ? `تفاصيل طلبك: النوع: ${orderData.type || ""}, الحالة: ${orderData.status || ""}, التاريخ: ${orderData.date || orderData.createdAt || ""}`
            : realLang === "en"
            ? `Order details: Type: ${orderData.type || ""}, Status: ${orderData.status || ""}, Date: ${orderData.date || orderData.createdAt || ""}`
            : `Détails de la demande : Type : ${orderData.type || ""}, Statut : ${orderData.status || ""}, Date : ${orderData.date || orderData.createdAt || ""}`,
          showTransferButton: false,
          suggestAgent: false,
          aiSilenced: false,
          customerServiceRequestCount
        });
      }
      return NextResponse.json({
        text: realLang === "ar"
          ? "لم أجد طلب بهذا الرقم. تأكد من الرقم وحاول مرة أخرى."
          : realLang === "en"
          ? "No order found with this number. Please check and try again."
          : "Aucune demande trouvée avec ce numéro. Veuillez vérifier et réessayer.",
        notFound: true,
        showTransferButton: false,
        suggestAgent: false,
        aiSilenced: false,
        customerServiceRequestCount
      });
    } catch (e) {
      return NextResponse.json({
        text: realLang === "ar"
          ? "حدث خطأ أثناء جلب تفاصيل الطلب."
          : realLang === "en"
          ? "An error occurred while fetching order details."
          : "Une erreur est survenue lors de la récupération des détails de la demande.",
        customerService: true,
        showTransferButton: false,
        suggestAgent: false,
        aiSilenced: false,
        customerServiceRequestCount
      });
    }
  }

  // --- أسئلة عن الشركة ---
  if (/منصة|taheel|تأهيل|about\s+company|about\s+taheel|الشركة|company\s+info/i.test(prompt)) {
    return NextResponse.json({
      text: realLang === "ar"
        ? "منصة تأهيل: حلول إلكترونية متكاملة للمقيمين والغير مقيمين وأصحاب الأعمال والشركات داخل الإمارات."
        : realLang === "en"
        ? "Taheel Platform: Integrated e-solutions for residents, non-residents, business owners, and companies inside the UAE."
        : "Plateforme Taheel : solutions électroniques intégrées pour les résidents, non-résidents, entrepreneurs et entreprises aux Émirats arabes unis.",
      showTransferButton: false,
      suggestAgent: false,
      aiSilenced: false,
      customerServiceRequestCount
    });
  }

  // --- سؤال غير مفهوم او مش واضح ---
  if (!prompt || prompt.trim().length < 2) {
    customerServiceRequestCount += 1;
    if (customerServiceRequestCount >= 5) {
      return NextResponse.json({
        text: realLang === "ar"
          ? "يبدو أن سؤالك غير واضح أو لم أتمكن من المساعدة. إذا رغبت بالتواصل مع موظف خدمة العملاء، اضغط الزر بالأسفل."
          : realLang === "en"
          ? "Your question is not clear or I couldn't assist you. If you wish to contact a customer service agent, click the button below."
          : "Votre question n'est pas claire ou je n'ai pas pu vous aider. Si vous souhaitez contacter un agent du service client, cliquez sur le bouton ci-dessous.",
        suggestAgent: false,
        showTransferButton: true,
        aiSilenced: false,
        customerServiceRequestCount
      });
    }
    return NextResponse.json({
      text: realLang === "ar"
        ? "ممكن توضح لي سؤالك أكتر أو تعيد صياغته؟"
        : realLang === "en"
        ? "Could you please clarify or rephrase your question?"
        : "Pouvez-vous clarifier ou reformuler votre question ?",
      suggestAgent: true,
      showTransferButton: false,
      aiSilenced: false,
      customerServiceRequestCount
    });
  }

  // --- العميل طلب موظف خدمة عملاء صراحة ---
  const customerServiceRegex = /(خدمة العملاء|موظف خدمة العملاء|اتواصل مع موظف|أكلم موظف|customer service|customer agent|contact agent|support agent|live agent|اريد التحدث مع موظف|عايز اكلم موظف|اريد التواصل مع موظف|اريد الدعم)/i;
  if (customerServiceRegex.test(prompt)) {
    customerServiceRequestCount += 1;
    if (customerServiceRequestCount >= 3) {
      return NextResponse.json({
        text: realLang === "ar"
          ? "تم تفعيل خيار التواصل مع موظف خدمة العملاء. اضغط الزر بالأسفل ليتم تحويلك."
          : realLang === "en"
          ? "You can now contact a customer service agent. Click the button below to be transferred."
          : "Vous pouvez maintenant contacter un agent du service client. Cliquez sur le bouton ci-dessous.",
        showTransferButton: true,
        aiSilenced: true,
        suggestAgent: false,
        customerServiceRequestCount
      });
    } else {
      return NextResponse.json({
        text: realLang === "ar"
          ? "أنا هنا لأساعدك! هل ترغب في شرح مشكلتك أو سؤالك بشكل أوضح؟"
          : realLang === "en"
          ? "I'm here to help! Please try to explain your request or question."
          : "Je suis là pour vous aider ! Essayez d’expliquer votre question.",
        showTransferButton: false,
        suggestAgent: true,
        aiSilenced: false,
        customerServiceRequestCount
      });
    }
  }

  // --- الرد العام من OpenAI لأي سؤال آخر ---
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
    showTransferButton: false,
    suggestAgent: false,
    aiSilenced: false,
    customerServiceRequestCount
  });
}