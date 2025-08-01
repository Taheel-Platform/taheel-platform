import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";
import { NextResponse } from "next/server";
import { findFaqAnswer } from "../../../components/ClientChat/faqSearch";

// إعداد فايربيز (مرة واحدة فقط)
const firebaseConfig = { /* نفس الإعدادات */ };
if (!getApps().length) initializeApp(firebaseConfig);

const countryLangMap = { /* نفس خريطة البلد للغة */ };

export async function POST(req) {
  let { prompt, lang, country, userName, isWelcome, userId } = await req.json();

  // بيانات العميل الأساسية
  let realName = userName;
  let realLang = lang;
  let realEmail = "";
  let realRole = "";
  let clientRequests = [];
  let clientServices = [];

  // جلب بيانات العميل + الطلبات + الخدمات من فايربيز
  if (userId) {
    try {
      const db = getFirestore();
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
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
      const requestsCol = collection(db, "users", userId, "requests");
      const requestsSnap = await getDocs(requestsCol);
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
      const servicesCol = collection(db, "users", userId, "services");
      const servicesSnap = await getDocs(servicesCol);
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

  // ===== رسالة ترحيب تلقائية من OpenAI مع بيانات العميل =====
  if (isWelcome || /welcome|ترحيب|bienvenue/i.test(prompt)) {
    // تجهيز بيانات الطلبات والخدمات للنص
    const requestsText = clientRequests.length
      ? clientRequests.map(
          r => `طلب رقم ${r.id}: النوع: ${r.type}, الحالة: ${r.status}, التاريخ: ${r.date}`
        ).join("\n")
      : "لا توجد طلبات مسجلة حتى الآن.";

    const servicesText = clientServices.length
      ? clientServices.map(
          s => `خدمة: ${s.name}، السعر: ${s.price}، الحالة: ${s.status}${s.desc ? "، الوصف: " + s.desc : ""}`
        ).join("\n")
      : "لا توجد خدمات مفعلة حتى الآن.";

    // معلومات الشركة (يمكنك تعديل النص كما تريد)
    const companyInfo =
      realLang === "ar"
        ? "منصة تأهيل هي منصة إلكترونية متخصصة في تقديم حلول التدريب والتأهيل للأفراد والشركات في الوطن العربي. مقرنا الرئيسي في دبي، الإمارات العربية المتحدة، ونسعى لتقديم أفضل الخدمات الرقمية في مجال التطوير المهني والتعليم المستمر."
        : realLang === "en"
        ? "Taheel is a leading digital platform for training and qualification solutions for individuals and companies in the Arab world. Headquartered in Dubai, UAE, we strive to offer top-quality professional development and continuous learning services."
        : "Taheel est une plateforme numérique leader dans le domaine de la formation et de la qualification pour les individus et les entreprises dans le monde arabe. Notre siège est à Dubaï, EAU."

    // بناء البرومبت ليكون مخصص للعميل
    let welcomePrompt = "";
    switch (realLang) {
      case "ar":
        welcomePrompt =
          `اكتب رسالة ترحيب احترافية وودية للعميل الجديد باسم ${realName}، البريد الإلكتروني: ${realEmail}, النوع: ${realRole} في منصة تأهيل (الدولة: ${country || ""}).\n\n` +
          `نبذة عن الشركة: ${companyInfo}\n\n` +
          `طلبات العميل:\n${requestsText}\n\n` +
          `الخدمات المفعلة:\n${servicesText}\n\n` +
          "اجعل الترحيب شخصي واذكر الخدمات أو الطلبات لو موجودة.";
        break;
      case "en":
        welcomePrompt =
          `Write a professional and friendly welcome message for the new user named ${realName}, email: ${realEmail}, role: ${realRole} on Taheel platform (country: ${country || ""}).\n\n` +
          `About the company: ${companyInfo}\n\n` +
          `Client requests:\n${requestsText}\n\n` +
          `Activated services:\n${servicesText}\n\n` +
          "Make the welcome personal and mention any services or requests if available.";
        break;
      case "fr":
        welcomePrompt =
          `Rédige un message de bienvenue professionnel et convivial pour le nouvel utilisateur nommé ${realName}, email : ${realEmail}, rôle : ${realRole} sur la plateforme Taheel (pays : ${country || ""}).\n\n` +
          `À propos de l'entreprise : ${companyInfo}\n\n` +
          `Demandes du client :\n${requestsText}\n\n` +
          `Services activés :\n${servicesText}\n\n` +
          "Rends le message personnel et mentionne les services ou demandes s'ils existent.";
        break;
      default:
        welcomePrompt =
          `Write a professional and friendly welcome message for the new user named ${realName}, email: ${realEmail}, role: ${realRole} on Taheel platform (country: ${country || ""}).\n\n` +
          `About the company: ${companyInfo}\n\n` +
          `Client requests:\n${requestsText}\n\n` +
          `Activated services:\n${servicesText}\n\n` +
          "Make the welcome personal and mention any services or requests if available. Respond ONLY in language code: ${realLang}.";
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
        max_tokens: 500,
        temperature: 0.4,
      }),
    });
    const data = await response.json();
    return NextResponse.json({
      text: data?.choices?.[0]?.message?.content?.trim() || "",
    });
  }
  // ===== نهاية الترحيب =====

  // 1. البحث في الأسئلة الشائعة أولاً (حسب لغة العميل النهائية)
  const faqAnswer = findFaqAnswer(prompt, realLang);
  if (faqAnswer) {
    return NextResponse.json({ text: faqAnswer });
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
        text: realLang === "ar"
          ? "حدث خطأ أثناء جلب بيانات الخدمات."
          : realLang === "en"
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
      switch (realLang) {
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

    // بناء prompt للـ OpenAI حسب اللغة النهائية للعميل
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

    // رسالة النظام لتأكيد اللغة النهائية
    const systemMessage =
      realLang === "ar"
        ? "أنت مساعد ذكي، يجب أن ترد فقط باللغة العربية مهما كان السؤال أو البرومبت."
        : realLang === "en"
        ? "You are a smart assistant. You must respond ONLY in English, no matter what the user prompt is."
        : realLang === "fr"
        ? "Tu es un assistant intelligent. Tu dois répondre UNIQUEMENT en français, quel que soit le prompt de l'utilisateur."
        : `You are a smart assistant. Respond ONLY in language code: ${realLang}.`;

    // إرسال الطلب للـ OpenAI بنفس اللغة النهائية للعميل
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

  // 3. الرد العام من OpenAI بنفس اللغة النهائية للعميل
let userPrompt = "";
switch (realLang) {
  case "ar":
    userPrompt =
      `اكتب رد احترافي ودود للعميل باسم ${realName} باللغة العربية فقط: ${prompt}.\n` +
      `إذا استشعرت أن العميل يريد التواصل مع موظف خدمة العملاء أو لم تستطع مساعدته، أضف جملة واضحة في نهاية الرد: "هل ترغب في التواصل مع موظف خدمة العملاء؟ اضغط الزر بالأسفل."`;
    break;
  case "en":
    userPrompt =
      `Write a professional and friendly reply in English only to the client${realName ? ` named ${realName}` : ""}: ${prompt}.\n` +
      `If you detect the client wants to contact a customer service agent, or the question can't be answered, add this sentence at the end: "Would you like to contact a customer service agent? Click the button below."`;
    break;
  case "fr":
    userPrompt =
      `Rédige une réponse professionnelle et conviviale en français uniquement pour le client${realName ? ` nommé ${realName}` : ""}: ${prompt}.\n` +
      `Si tu vois que le client demande un agent du service client ou que tu ne peux pas répondre, ajoute à la fin : "Voulez-vous contacter un agent du service client ? Cliquez sur le bouton ci-dessous."`;
    break;
  default:
    userPrompt =
      `Write a professional and friendly reply for the client${realName ? ` named ${realName}` : ""}: ${prompt}. Respond ONLY in language code: ${realLang}.\n` +
      `If you detect the client wants to contact a customer service agent, or the question can't be answered, add this sentence at the end: "Would you like to contact a customer service agent? Click the button below."`;
    break;
}

  // رسالة النظام لتأكيد اللغة النهائية للعميل
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