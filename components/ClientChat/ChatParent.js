import React, { useState, useEffect, useRef } from "react";
import ChatWidgetFull from "./ChatWidgetFull";
import LanguageSelectModal from "./LanguageSelectModal";
import countriesData from "../../lib/countries-ar-en.js";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getDatabase, ref as dbRef, push, remove, update, set, onValue } from "firebase/database";
import faqData from "./faqData";
import { findFaqAnswer } from "./faqSearch";

// إعداد الدول واللغات مع حماية ضد undefined
const countriesObject = {};
const countriesLang = {};
(countriesData || []).forEach((item) => {
  countriesObject[item.value?.toUpperCase() || ""] = item.label || "";
  countriesLang[item.value?.toUpperCase() || ""] = item.lang || "ar";
});

// دالة لتحويل blob لـ base64 مع حماية
function blobToBase64(blob) {
  return new Promise((resolve) => {
    if (!blob) return resolve("");
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// الدالة الأساسية
export default function ChatParent({ userId, userName, initialRoomId, onClose }) {
  // STATE MANAGEMENT
  const db = getDatabase();
  const [roomId, setRoomId] = useState(initialRoomId || "");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [closed, setClosed] = useState(false);

  const [userData, setUserData] = useState(null);

  const [showLangModal, setShowLangModal] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [lang, setLang] = useState("ar");

  const [noBotHelpCount, setNoBotHelpCount] = useState(0);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [agentAccepted, setAgentAccepted] = useState(false);

  const chatEndRef = useRef(null);

  const safeUserId = userId || "guest";

  // جلب بيانات المستخدم مع حماية
  useEffect(() => {
    if (!safeUserId) return;
    const fetchUserData = async () => {
      try {
        const firestore = getFirestore();
        const userDoc = doc(firestore, "users", safeUserId);
        const snap = await getDoc(userDoc);
        setUserData(snap.exists() ? snap.data() : null);
      } catch (e) {
        setUserData(null);
      }
    };
    fetchUserData();
  }, [safeUserId]);

  // حماية اسم المستخدم
  const safeUserName =
    (userData &&
      (lang === "ar"
        ? userData.nameAr || userData.firstName || userData.lastName
        : userData.nameEn || userData.firstName || userData.lastName)) ||
    userName ||
    "زائر";

  // إدارة الغرفة مع حماية
  useEffect(() => {
    if (!roomId) {
      let id = initialRoomId;
      if (!id && typeof window !== "undefined") {
        const saved = window.localStorage.getItem("chatRoomId");
        if (saved) {
          id = saved;
        } else {
          id = "RES-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
          window.localStorage.setItem("chatRoomId", id);
        }
      }
      setRoomId(id);
    }
  }, [roomId, initialRoomId]);

  // حفظ بيانات الغرفة مع حماية
  useEffect(() => {
    if (!roomId || !safeUserId || !safeUserName || !selectedCountry || !lang) return;
    set(dbRef(db, `chats/${roomId}`), {
      clientId: safeUserId,
      clientName: safeUserName,
      createdAt: Date.now(),
      country: selectedCountry,
      lang: lang,
      status: "open",
    });
  }, [db, roomId, safeUserId, safeUserName, selectedCountry, lang]);

  // جلب الرسائل مع حماية
  useEffect(() => {
    if (!roomId) return;
    const msgsRef = dbRef(db, `chats/${roomId}/messages`);
    return onValue(msgsRef, (snap) => {
      const msgs = [];
      snap.forEach((child) => {
        const val = child.val();
        if (!val || typeof val !== "object") return;
        msgs.push({
          id: child.key,
          createdAt: val.createdAt || Date.now(),
          ...val,
        });
      });
      msgs.sort((a, b) => a.createdAt - b.createdAt);

      setMessages(msgs);

      setTimeout(() => {
        requestAnimationFrame(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      }, 100);
    });
  }, [db, roomId, messages.length]);

  // جلب حالة الموظف مع حماية
  useEffect(() => {
    if (!roomId) return;
    const chatRef = dbRef(db, `chats/${roomId}`);
    const unsub = onValue(chatRef, (snap) => {
      const val = snap.val();
      setWaitingForAgent(!!val?.waitingForAgent);
      setAgentAccepted(!!val?.agentAccepted);
    });
    return () => unsub();
  }, [db, roomId]);

  // اختيار اللغة والدولة
  const handleLanguageSelect = async (selectedLang, selectedCountry) => {
    setLang(selectedLang);
    setSelectedCountry(selectedCountry);
    setShowLangModal(false);

    let welcomePrompt = "";
    if (selectedLang === "ar") {
      welcomePrompt = `اكتب رسالة ترحيب ودية واحترافية للعميل الجديد "${safeUserName}" في منصة تأهيل.`;
    } else if (selectedLang === "en") {
      welcomePrompt = `Write a professional and friendly welcome message for a new user named "${safeUserName}" on Taheel platform. Respond ONLY in English.`;
    } else if (selectedLang === "fr") {
      welcomePrompt = `Rédige un message de bienvenue professionnel et convivial pour un nouvel utilisateur nommé "${safeUserName}" sur la plateforme Taheel. Réponds UNIQUEMENT en français.`;
    } else {
      welcomePrompt = `Write a professional and friendly welcome message for a new user named "${safeUserName}" on Taheel platform. Respond ONLY in language code: ${selectedLang}.`;
    }

    try {
      const res = await fetch("/api/openai-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: welcomePrompt,
          lang: selectedLang,
          country: selectedCountry,
          userName: safeUserName,
          isWelcome: true
        }),
      });
      const data = await res.json();

      await push(dbRef(db, `chats/${roomId}/messages`), {
        id: "welcome",
        type: "bot",
        senderId: "bot",
        senderName: 
          selectedLang === "ar" ? "المساعد الذكي"
          : selectedLang === "en" ? "Smart Assistant"
          : selectedLang === "fr" ? "Assistant"
          : "Assistant",
        createdAt: Date.now(),
        text: data.text || "",
      });

    } catch (err) {
      await push(dbRef(db, `chats/${roomId}/messages`), {
        id: "welcome",
        type: "bot",
        senderId: "bot",
        senderName: 
          selectedLang === "ar" ? "المساعد الذكي"
          : selectedLang === "en" ? "Smart Assistant"
          : selectedLang === "fr" ? "Assistant"
          : "Assistant",
        createdAt: Date.now(),
        text:
          selectedLang === "ar"
            ? `مرحبًا ${safeUserName} في خدمة الدردشة الذكية! يمكنك كتابة أي سؤال أو اختيار من الأسئلة الشائعة.`
            : selectedLang === "en"
            ? `Welcome ${safeUserName} to Smart Chat! You can ask any question or choose from FAQs.`
            : selectedLang === "fr"
            ? `Bienvenue ${safeUserName}! Vous pouvez poser n'importe quelle question ou choisir parmi les questions fréquentes.`
            : `Welcome ${safeUserName}! You can ask any question or choose from FAQs.`,
      });
    }
    setClosed(false);
  };

  // إرسال الرسائل مع حماية
  const sendMessage = async (type = "text", content = {}) => {
    if (type === "image" || type === "audio") setUploading(true);
    const msg = {
      senderId: safeUserId,
      senderName: safeUserName,
      type,
      createdAt: Date.now(),
      ...content,
    };
    await push(dbRef(db, `chats/${roomId}/messages`), msg);
    if (type === "image" || type === "audio") setUploading(false);
  };

  // منطق إرسال الرسائل مع حماية
  const handleSend = async (e) => {
    e.preventDefault();
    if (closed || (uploading && (imagePreview || audioBlob)) || (waitingForAgent && !agentAccepted)) return;
    if (imagePreview) {
      await sendMessage("image", { imageBase64: imagePreview });
      setImagePreview(null);
      setInput("");
      return;
    }
    if (audioBlob) {
      const audioBase64 = await blobToBase64(audioBlob);
      await sendMessage("audio", { audioBase64 });
      setAudioBlob(null);
      setInput("");
      return;
    }
    const textMsg = input.trim();
    if (!textMsg) return;

    await sendMessage("text", { text: textMsg });

    let foundAnswer = findFaqAnswer(textMsg, lang);

    if (foundAnswer) {
      await sendMessage("bot", { text: foundAnswer });
    } else {
      const openAIPrompt =
        lang === "ar"
          ? `أجب على هذا السؤال بشكل احترافي باللغة العربية: ${textMsg}`
          : lang === "en"
          ? `Answer this question professionally in English: ${textMsg}`
          : `Réponds à cette question professionnellement en français: ${textMsg}`;
      const res = await fetch("/api/openai-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: openAIPrompt,
          lang,
          country: selectedCountry,
          userName: safeUserName
        }),
      });
      const data = await res.json();
      await sendMessage("bot", { text: data.text || "" });
    }
    setInput("");
  };

  // منطق الأسئلة السريعة مع حماية
  const handleQuickFAQ = async (q) => {
    setInput("");
    await sendMessage("text", { text: q });
    let foundAnswer = findFaqAnswer(q, lang);
    if (foundAnswer) {
      await sendMessage("bot", { text: foundAnswer });
      setNoBotHelpCount(0);
    } else {
      try {
        const prompt =
          lang === "ar"
            ? `أجب على هذا السؤال بشكل احترافي باللغة العربية: ${q}`
            : lang === "en"
            ? `Answer this question professionally in English: ${q}`
            : `Réponds à cette question professionnellement en français: ${q}`;
        const res = await fetch("/api/openai-gpt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, lang }),
        });
        const data = await res.json();
        await sendMessage("bot", { text: data.text || "" });
        setNoBotHelpCount(0);
      } catch (err) {
        setNoBotHelpCount((c) => c + 1);
        await sendMessage("bot", {
          text:
            lang === "ar"
              ? "عذراً لم أجد إجابة لسؤالك. اضغط زر التواصل مع الموظف ليتم خدمتك مباشرة."
              : lang === "en"
              ? "Sorry, I couldn't find an answer to your question. Click the 'Contact Agent' button for assistance."
              : "Désolé, je n'ai pas trouvé de réponse à votre question. Cliquez sur le bouton pour contacter un agent.",
        });
      }
    }
  };

  // طلب موظف خدمة العملاء
  const requestAgent = async () => {
    if (!roomId || !safeUserId || !safeUserName) return;
    await update(dbRef(db, `chats/${roomId}`), {
      waitingForAgent: true,
      agentAccepted: false,
      assignedTo: null,
      clientId: safeUserId,
      clientName: safeUserName,
      status: "open",
    });
    setNoBotHelpCount(0);
  };

  // دالة تنظيف الرسائل عند الإغلاق (تأكد أنها معرفة)
  const clearChatMessages = async () => {
    try {
      // هنا يمكنك إزالة الرسائل من الغرفة إذا أردت بحذف كل عناصر messages من قاعدة البيانات
      const msgsRef = dbRef(db, `chats/${roomId}/messages`);
      // إذا أردت فعلاً حذف جميع الرسائل، أضف منطق الحذف هنا
      // أو تجاهلها لو لا تريد حذف الرسائل عند الإغلاق
    } catch (e) {
      // لا مشكلة إذا فشلت عملية التنظيف
    }
  };

  // إغلاق الشات مع إعادة التهيئة
  const closeChat = async () => {
    setClosed(true);        
    setShowLangModal(false); 
    setMinimized(false);
    if (onClose) onClose();
    await clearChatMessages();
    let newRoomId = "RES-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
    setRoomId(newRoomId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chatRoomId", newRoomId);
    }
    setShowLangModal(true);
    setLang("ar");
    setSelectedCountry("");
    setMessages([]);
    setInput("");
    setNoBotHelpCount(0);
    setWaitingForAgent(false);
    setAgentAccepted(false);
    setImagePreview(null);
    setAudioBlob(null);
    setRecording(false);
    setShowEmoji(false);
    setClosed(true); 
    setMinimized(false);
  };

  // رفع الملفات مع حماية
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // التسجيل الصوتي مع حماية
  const handleRecord = async () => {
    if (!recording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } else if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  // اختيار الإيموجي مع حماية
  const handleSelectEmoji = (emoji) => {
    setInput((prev) => prev + (emoji?.native || ""));
    setShowEmoji(false);
  };

  // اتجاه الدردشة
  const dir = lang === "ar" ? "rtl" : "ltr";
  const headerButtonsStyle = lang === "ar"
    ? { position: "absolute", top: 12, left: 12, right: "auto", display: "flex", flexDirection: "row-reverse", gap: 8, zIndex: 11 }
    : { position: "absolute", top: 12, right: 12, left: "auto", display: "flex", flexDirection: "row", gap: 8, zIndex: 11 };

  // واجهة الاستخدام مع حماية الرسائل وبيانات الأسئلة الشائعة
  if (closed) return null;
  return (
    <>
      {showLangModal ? (
        <LanguageSelectModal
          userName={safeUserName}
          countries={countriesObject}
          countriesLang={countriesLang}
          onSelect={handleLanguageSelect}
        />
      ) : (
        <ChatWidgetFull
          messages={messages || []}
          lang={lang}
          country={selectedCountry}
          input={input}
          setInput={setInput}
          uploading={uploading}
          imagePreview={imagePreview}
          handleFileChange={handleFileChange}
          audioBlob={audioBlob}
          handleRecord={handleRecord}
          recording={recording}
          showEmoji={showEmoji}
          setShowEmoji={setShowEmoji}
          handleSelectEmoji={handleSelectEmoji}
          minimized={minimized}
          setMinimized={setMinimized}
          closed={closed}
          setClosed={setClosed}
          waitingForAgent={waitingForAgent}
          agentAccepted={agentAccepted}
          handleSend={handleSend}
          handleQuickFAQ={handleQuickFAQ}
          noBotHelpCount={noBotHelpCount}
          requestAgent={requestAgent}
          closeChat={closeChat}
          dir={dir}
          headerButtonsStyle={headerButtonsStyle}
          faqData={faqData || []}
          chatEndRef={chatEndRef}
        />
      )}
    </>
  );
}