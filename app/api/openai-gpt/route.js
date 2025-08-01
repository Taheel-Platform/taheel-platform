import { NextResponse } from "next/server";
import { findFaqAnswer } from "../../../components/ClientChat/faqSearch";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

export async function POST(req) {
  let {
    prompt,
    lang,
    country,
    userName,
    isWelcome,
    userId,
    waitingForAgent,
    customerServiceRequestCount = 5
  } = await req.json();

  // ----------- اسم العميل الصحيح فقط --------
  let realName = (userName && userName.trim()) || "";
  let realLang = lang;
  let realEmail = "";
  let realRole = "";
  let clientRequests = [];
  let clientServices = [];

  // جلب بيانات العميل من فايربيز لو موجود
  if (userId) {
    try {
      const userRef = db.collection("users").doc(userId);
      const snap = await userRef.get();
      if (snap.exists) {
        const data = snap.data();
        // لو لم يُرسل اسم من المودال، استخدم من فايربيز فقط
        if (!realName) {
          realName = realLang === "ar"
            ? data.nameAr || data.name || data.firstName || ""
            : realLang === "en"
            ? data.nameEn || data.name || data.firstName || ""
            : data.nameEn || data.nameAr || data.name || data.firstName || "";
        }
        realEmail = data.email || "";
        realRole = data.role || "";
        if (data.lang) realLang = data.lang;
      }
      // الطلبات
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
      // الخدمات
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
    } catch (err) { }
  }

  // لا تجعل اسم العميل أبداً هو الدولة:
  if (!realName || realName === country) {
    realName = realLang === "ar" ? "ضيفنا الكريم" : realLang === "en" ? "Our valued guest" : "Cher client";
  }

  if (!realLang && country) {
    const countryCode = country.length === 2 ? country.toUpperCase() : null;
    realLang = countryLangMap[countryCode] || "ar";
  }
  if (!realLang) realLang = "ar";

  // تعريف الشركة
  const companyInfo =
    realLang === "ar"
      ? "منصة تأهيل: حلول إلكترونية متكاملة للمقيمين والغير مقيمين وأصحاب الأعمال والشركات داخل الإمارات."
      : realLang === "en"
      ? "Taheel Platform: Integrated e-solutions for residents, non-residents, business owners, and companies inside the UAE."
      : "Plateforme Taheel : solutions électroniques intégrées pour les résidents, non-résidents, entrepreneurs et entreprises aux Émirats arabes unis.";

  const requestsText = clientRequests.length
    ? clientRequests.map(r =>
      realLang === "ar"
        ? `نوع: ${r.type || ""}, حالة: ${r.status || ""}, تاريخ: ${r.date || ""}`
        : realLang === "en"
        ? `Type: ${r.type || ""}, Status: ${r.status || ""}, Date: ${r.date || ""}`
        : `Type : ${r.type || ""}, Statut : ${r.status || ""}, Date : ${r.date || ""}`
    ).join("\n")
    : realLang === "ar"
      ? "لا يوجد طلبات حالية."
      : realLang === "en"
        ? "No current requests."
        : "Aucune demande actuelle.";

  const servicesText = clientServices.length
    ? clientServices.map(s =>
      realLang === "ar"
        ? `${s.name || ""}: ${s.status || ""} (${s.price || ""})`
        : realLang === "en"
        ? `${s.name || ""}: ${s.status || ""} (${s.price || ""})`
        : `${s.name || ""} : ${s.status || ""} (${s.price || ""})`
    ).join("\n")
    : realLang === "ar"
      ? "لا يوجد خدمات مفعلة."
      : realLang === "en"
        ? "No activated services."
        : "Aucun service activé.";

  // ----------- رسالة الترحيب بأسلوب ودود وبسيط ---------
  if (isWelcome) {
    let welcomePrompt = "";
    switch (realLang) {
      case "ar":
        welcomePrompt =
          `اكتب رسالة ترحيب قصيرة ودودة جدًا للعميل الجديد باسم ${realName}. تحدث معه بصيغة المخاطب مباشرة وكأنك صديق جديد في منصة تأهيل. ابدأ الرسالة باسمه فقط، واشجعه على تجربة الخدمات، وإذا لم يكن لديه طلبات أو خدمات فعّالة، قل له ببساطة "لا يوجد لديك خدمات أو طلبات حالياً ويمكنك البدء متى شئت". اجعل الرسالة لا تزيد عن 3 أسطر، ولا تذكر فريق العمل أو عبارات رسمية أو تكرار كلمة الترحيب.\n\n` +
          `طلبات العميل:\n${requestsText}\n\n` +
          `الخدمات المفعلة:\n${servicesText}`;
        break;
      case "en":
        welcomePrompt =
          `Write a very short and friendly welcome message for the new user named ${realName}. Talk to them directly as if you are a new friend on the Taheel platform. Start the message with their name only, encourage them to try the services, and if they have no active requests or services, say simply: "You currently have no services or requests, but you can start anytime." Keep the message under 3 lines, do not use formal phrases or repeat the welcome word.\n\n` +
          `Client requests:\n${requestsText}\n\n` +
          `Activated services:\n${servicesText}`;
        break;
      case "fr":
        welcomePrompt =
          `Rédige un message de bienvenue très court et amical pour le nouvel utilisateur nommé ${realName}. Parle-lui directement comme si tu étais un nouvel ami sur la plateforme Taheel. Commence le message par son prénom uniquement, encourage-le à essayer les services, et s'il n'a pas de demandes ou services actifs, écris-lui simplement : "Vous n'avez pas encore de services ou demandes, mais vous pouvez commencer à tout moment." Maximum 3 lignes, évite les formules officielles ou les répétitions du mot bienvenue.\n\n` +
          `Demandes du client :\n${requestsText}\n\n` +
          `Services activés :\n${servicesText}`;
        break;
      default:
        welcomePrompt =
          `Write a very short and friendly welcome message for the new user named ${realName}. Talk to them directly as if you are a new friend on the Taheel platform. Start the message with their name only, and encourage them to try the services.`;
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
          { role: "user", content: welcomePrompt }
        ],
        max_tokens: 350,
        temperature: 0.5,
      }),
    });
    const data = await response.json();

    let welcomeText = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!welcomeText) {
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
    // لا تكرر كلمة مرحبًا بك في البداية (البرومبت يضمن ذلك)
    return NextResponse.json({
      text: welcomeText,
      isWelcome: true,
    });
  }

  // ----------- منطق زر خدمة العملاء ---------
  const customerServiceRegex = /(خدمة العملاء|موظف خدمة العملاء|اتواصل مع موظف|أكلم موظف|customer service|customer agent|contact agent|support agent|live agent)/i;
  if (customerServiceRegex.test(prompt)) {
    if (customerServiceRequestCount < 2) {
      return NextResponse.json({
        text: realLang === "ar"
          ? "أنا هنا لأساعدك! هل ترغب في شرح مشكلتك أو سؤالك بشكل أوضح؟"
          : realLang === "en"
            ? "I'm here to help! Please try to explain your request or question."
            : "Je suis là pour vous aider ! Essayez d’expliquer votre question.",
        customerServicePrompt: true,
        customerServiceRequestCount: customerServiceRequestCount + 1
      });
    } else {
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

  // ----------- البحث في الأسئلة الشائعة أولاً -----------
  const faqAnswer = findFaqAnswer(prompt, realLang);
  if (faqAnswer) {
    return NextResponse.json({ text: faqAnswer });
  }

  // ----------- بحث في الخدمات أو الأسعار أو التتبع من قاعدة البيانات ----------
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
          noDataMsg = "لا توجد بيانات خدمات متاحة حالياً.";
          break;
        case "en":
          noDataMsg = "No services data available at the moment.";
          break;
        case "fr":
          noDataMsg = "Aucune donnée de service disponible pour le moment.";
          break;
        default:
          noDataMsg = "No services data available.";
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

  // ----------- الرد العام (OpenAI) ----------
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