"use client";
import { useEffect, useRef, useState } from "react";
import {
  getDatabase,
  ref as dbRef,
  set,
  push,
  onValue,
  update,
  remove,
} from "firebase/database";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import {
  FaPaperPlane,
  FaMicrophone,
  FaImage,
  FaSmile,
  FaComments,
  FaTimes,
  FaWindowMinimize,
} from "react-icons/fa";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import faqData from "./faqData";
import { findFaqAnswer } from "./faqSearch";
import LanguageSelectModal from "./LanguageSelectModal";
import countriesData from "../../lib/countries-ar-en.js";

const countriesObject = {};
const countriesLang = {};
countriesData.forEach((item) => {
  countriesObject[item.value.toUpperCase()] = item.label;
  countriesLang[item.value.toUpperCase()] = item.lang || "ar";
});

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export default function ChatWidgetFull({
  userId,
  userName,
  initialRoomId,
  onClose,
  lang: initialLang = "ar",
}) {
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
  const [lang, setLang] = useState(initialLang);

  const [noBotHelpCount, setNoBotHelpCount] = useState(0);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [agentAccepted, setAgentAccepted] = useState(false);

  const chatEndRef = useRef(null);

  const safeUserId = userId || "guest";

  // مسح الرسائل عند فتح الشات من جديد
  const clearChatMessages = async () => {
    if (!roomId) return;
    await remove(dbRef(db, `chats/${roomId}/messages`));
    setMessages([]);
  };

  useEffect(() => {
    if (!safeUserId) return;
    const fetchUserData = async () => {
      try {
        const firestore = getFirestore();
        const userDoc = doc(firestore, "users", safeUserId);
        const snap = await getDoc(userDoc);
        if (snap.exists()) {
          setUserData(snap.data());
        }
      } catch (e) {
        setUserData(null);
      }
    };
    fetchUserData();
  }, [safeUserId]);

  const safeUserName =
    (userData &&
      (lang === "ar"
        ? userData.nameAr || userData.firstName || userData.lastName
        : userData.nameEn || userData.firstName || userData.lastName)) ||
    userName ||
    "زائر";

  const sendAudio = typeof Audio !== "undefined" ? new Audio("/sounds/send.mp3") : null;
  const receiveAudio = typeof Audio !== "undefined" ? new Audio("/sounds/receive.mp3") : null;

  const playSend = () => {
    if (sendAudio) {
      sendAudio.currentTime = 0;
      sendAudio.play();
    }
  };

  const playReceive = () => {
    if (receiveAudio) {
      receiveAudio.currentTime = 0;
      receiveAudio.play();
    }
  };

  const handleOpenChat = async () => {
    setClosed(false);
    setMinimized(false);
    setShowLangModal(true);
    setSelectedCountry("");
    setLang(initialLang);
    setMessages([]);
    setInput("");
    setNoBotHelpCount(0);
    setWaitingForAgent(false);
    setAgentAccepted(false);
    setImagePreview(null);
    setAudioBlob(null);
    setRecording(false);
    setShowEmoji(false);

    await clearChatMessages();
  };

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

      if (msgs.length > messages.length) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.senderId !== safeUserId) {
          playReceive();
        }
      }

      setMessages(msgs);

      setTimeout(() => {
        requestAnimationFrame(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      }, 100);
    });
  }, [db, roomId, messages.length]);

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

  // تغيير اتجاه الدردشة حسب اللغة
  const dir = lang === "ar" ? "rtl" : "ltr";

  // جلب رسالة الترحيب حسب اختيار اللغة
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

      // أضف رسالة الترحيب بعد اختيار اللغة فقط
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
        text: data.text
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
  };

  // إرسال رسالة المستخدم
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
    playSend();
  };

  // إرسال سؤال المستخدم للـ OpenAI أو الرد من FAQ
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
      await sendMessage("bot", { text: data.text });
    }
    setInput("");
  };

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
        await sendMessage("bot", { text: data.text });
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

  const closeChat = () => {
    setClosed(true);
    if (onClose) onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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
    } else {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const handleSelectEmoji = (emoji) => {
    setInput((prev) => prev + emoji.native);
    setShowEmoji(false);
  };

  function renderMsgBubble(msg) {
    let isSelf = msg.senderId === safeUserId;
    let isBot = msg.type === "bot";
    let isSystem = msg.type === "system";
    let base =
      "rounded-2xl px-4 py-3 mb-2 shadow transition-all max-w-[78%] whitespace-pre-line break-words";
    let align = isSelf
      ? lang === "ar" ? "mr-auto self-end" : "ml-auto self-end"
      : isBot
      ? "self-start"
      : isSystem
      ? "mx-auto"
      : "self-start";
    let color =
      isSystem
        ? "bg-gradient-to-r from-yellow-50 to-yellow-100 text-emerald-900 border border-yellow-300"
        : isBot
        ? "bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-900 border border-emerald-400"
        : isSelf
        ? "bg-gradient-to-br from-emerald-500 to-cyan-500 text-white"
        : "bg-gradient-to-br from-white to-gray-100 text-gray-900 border border-gray-200";
    return (
      <div className={`${base} ${align} ${color} flex items-start gap-2`} key={msg.id}>
        {isBot && (
          <img
            src="/taheel-bot.png"
            alt="Bot"
            width={36}
            height={36}
            className="rounded-full border border-emerald-400 shadow-sm mt-1"
            style={{ minWidth: 36, minHeight: 36, objectFit: "cover", background: "#fff" }}
          />
        )}
        <div className="flex-1">
          {msg.type === "text" && <span>{msg.text}</span>}
          {msg.type === "bot" && <span>{msg.text}</span>}
          {msg.type === "image" && (
            <img
              src={msg.imageBase64}
              alt="img"
              width={160}
              height={160}
              className="max-w-[160px] max-h-[160px] rounded-lg border mt-1"
            />
          )}
          {msg.type === "audio" && (
            <audio controls src={msg.audioBase64} className="mt-1" />
          )}
          <div className="text-[10px] text-gray-400 mt-1 text-left ltr:text-left rtl:text-right">
            {isBot
              ? lang === "ar"
                ? "المساعد الذكي"
                : lang === "en"
                ? "Smart Assistant"
                : "Assistant"
              : isSystem
              ? lang === "ar"
                ? "النظام"
                : lang === "en"
                ? "System"
                : "Système"
              : msg.senderName}
            {" · "}
            {msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString(
                  lang === "ar"
                    ? "ar-EG"
                    : lang === "en"
                    ? "en-US"
                    : "fr-FR",
                  { hour: "2-digit", minute: "2-digit" }
                )
              : ""}
          </div>
        </div>
      </div>
    );
  }

  const headerButtonsClass =
    lang === "ar"
      ? "chat-header-buttons right-2 flex-row-reverse"
      : "chat-header-buttons left-2 flex-row";

  if (closed) return null;

  return (
    <>
      <style>{`
        .chat-bg-grad { background: linear-gradient(120deg, #183d3d 60%, #1a2236 100%); }
        button, .cursor-pointer, [role="button"] { cursor: pointer !important; }
        .chat-action-btn {
          transition: background .2s, color .2s, box-shadow .2s;
        }
        .chat-action-btn:hover {
          box-shadow: 0 0 8px #14b8a6;
          background: #e0f7fa;
        }
        .chat-header-buttons {
          display: flex;
          gap: 8px;
          position: absolute;
          top: 12px;
          z-index: 11;
        }
        .right-2 { right: 12px }
        .left-2 { left: 12px }
        .flex-row-reverse { flex-direction: row-reverse }
        .flex-row { flex-direction: row }
      `}</style>
      {minimized ? (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-[150px] right-6 bg-gradient-to-br from-emerald-600 to-cyan-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-xl z-[1000] animate-bounce chat-action-btn"
          title={lang === "ar" ? "فتح المحادثة" : lang === "en" ? "Open Chat" : "Ouvrir le chat"}
        >
          <FaComments size={32} />
        </button>
      ) : (
        <div className={`fixed bottom-24 right-4 z-[1000] font-sans`} dir={dir} style={{ direction: dir }}>
          <div className="w-[94vw] max-w-[430px] h-[calc(62vh)] min-h-[340px] flex flex-col bg-[#222a36] rounded-2xl shadow-2xl border border-emerald-900 relative overflow-hidden" style={{ maxHeight: "540px" }}>
            <div className="px-4 py-3 border-b border-emerald-800 text-emerald-200 font-bold flex items-center gap-1 relative bg-gradient-to-l from-cyan-900 to-emerald-900">
              <span className="text-lg">
                {lang === "ar"
                  ? "الدردشة الذكية"
                  : lang === "en"
                  ? "Smart Chat"
                  : "Chat intelligente"}
              </span>
              <div className={headerButtonsClass}>
                <button
                  onClick={() => setMinimized(true)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full w-7 h-7 flex items-center justify-center shadow border border-yellow-600 chat-action-btn"
                  title={lang === "ar" ? "تصغير المحادثة" : lang === "en" ? "Minimize" : "Minimiser"}
                  style={{ fontWeight: 700 }}
                >
                  <FaWindowMinimize style={{ fontWeight: 900, fontSize: 18 }} />
                </button>
                <button
                  onClick={closeChat}
                  className="bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow border border-red-600 chat-action-btn"
                  title={lang === "ar" ? "إغلاق المحادثة" : lang === "en" ? "Close chat" : "Fermer"}
                  style={{ fontWeight: 700 }}
                >
                  <FaTimes style={{ fontWeight: 900, fontSize: 18 }} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col chat-bg-grad">
              {showLangModal && (
                <div className="flex justify-center mb-2">
                  <LanguageSelectModal
                    userName={safeUserName}
                    countries={countriesObject}
                    countriesLang={countriesLang}
                    onSelect={handleLanguageSelect}
                  />
                </div>
              )}
              {!showLangModal && messages.map(renderMsgBubble)}
              <div ref={chatEndRef} />
            </div>
            {!showLangModal && (
              <form
                className="border-t border-emerald-800 px-3 py-3 flex items-center gap-2 bg-[#222a36]"
                onSubmit={handleSend}
                dir={dir}
                style={{ direction: dir }}
              >
                <div className="relative">
                  <button
                    type="button"
                    className="text-yellow-400 hover:text-yellow-600 chat-action-btn"
                    title={lang === "ar" ? "إضافة إيموجي" : lang === "en" ? "Add Emoji" : "Ajouter Emoji"}
                    onClick={() => setShowEmoji((v) => !v)}
                    tabIndex={-1}
                  >
                    <FaSmile size={22} />
                  </button>
                  {showEmoji && (
                    <div className="fixed bottom-28 right-8 z-[9999]">
                      <Picker
                        data={emojiData}
                        onEmojiSelect={handleSelectEmoji}
                        theme="dark"
                        locale={lang}
                      />
                    </div>
                  )}
                </div>
                <label className="cursor-pointer text-emerald-400 hover:text-emerald-600 chat-action-btn">
                  <FaImage size={22} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRecord}
                  className={`text-emerald-400 hover:text-emerald-600 chat-action-btn ${recording ? "animate-pulse text-red-600" : ""}`}
                  title={
                    recording
                      ? lang === "ar"
                        ? "جارٍ التسجيل..."
                        : lang === "en"
                        ? "Recording..."
                        : "Enregistrement..."
                      : lang === "ar"
                      ? "تسجيل صوتي"
                      : lang === "en"
                      ? "Record audio"
                      : "Enregistrer audio"
                  }
                  disabled={uploading}
                >
                  <FaMicrophone size={22} />
                </button>
                <input
                  type="text"
                  className="flex-1 bg-[#1a2236] rounded-full px-4 py-2 outline-none text-white shadow border border-emerald-700"
                  placeholder={
                    waitingForAgent && !agentAccepted
                      ? lang === "ar"
                        ? "يرجى الانتظار..."
                        : lang === "en"
                        ? "Please wait..."
                        : "Veuillez patienter..."
                      : lang === "ar"
                      ? "اكتب رسالتك أو سؤالك..."
                      : lang === "en"
                      ? "Type your message or question..."
                      : "Tapez votre message ou question..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={
                    uploading ||
                    recording ||
                    (waitingForAgent && !agentAccepted)
                  }
                  style={{ fontSize: "1rem" }}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-br from-emerald-600 to-cyan-500 hover:from-emerald-700 hover:to-cyan-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow chat-action-btn"
                  title={lang === "ar" ? "إرسال" : lang === "en" ? "Send" : "Envoyer"}
                  disabled={uploading || (waitingForAgent && !agentAccepted)}
                  style={{ cursor: "pointer" }}
                >
                  <FaPaperPlane />
                </button>
                {(imagePreview || audioBlob) && (
                  <span className="ml-2 text-xs text-emerald-700 bg-cyan-50 px-2 py-1 rounded flex items-center">
                    {imagePreview && <>صورة جاهزة للإرسال</>}
                    {audioBlob && <>صوت جاهز للإرسال</>}
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setAudioBlob(null);
                      }}
                      className="ml-1 text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
              </form>
            )}
            {waitingForAgent && !agentAccepted && !showLangModal && (
              <div className="flex justify-center p-3">
                <div className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 px-4 py-2 rounded-xl text-center font-semibold animate-pulse border border-orange-300 shadow">
                  {lang === "ar"
                    ? "يرجى الانتظار سيتم تحويل الدردشة لموظف خدمة العملاء للرد عليك في أقرب وقت..."
                    : lang === "en"
                    ? "Please wait, your chat will be transferred to a customer service agent soon..."
                    : "Veuillez patienter, votre chat sera transféré à un agent du service client sous peu..."}
                </div>
              </div>
            )}
            {!waitingForAgent && !agentAccepted && !showLangModal && messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {faqData.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickFAQ(f.q[lang] || f.q.en)}
                    className="bg-gradient-to-br from-emerald-200 to-cyan-100 hover:from-emerald-300 hover:to-cyan-200 text-emerald-900 rounded-full px-4 py-2 text-sm font-semibold shadow chat-action-btn"
                    style={lang === "ar" ? { direction: "rtl", textAlign: "right" } : { direction: "ltr", textAlign: "left" }}
                  >
                    {f.q[lang] || f.q.en}
                  </button>
                ))}
              </div>
            )}
            {!waitingForAgent && !agentAccepted && !showLangModal && noBotHelpCount >= 2 && (
              <div className="flex justify-center p-3">
                <button
                  type="button"
                  onClick={requestAgent}
                  className="bg-gradient-to-br from-yellow-400 to-yellow-200 hover:from-yellow-500 hover:to-yellow-300 text-gray-900 rounded-full px-4 py-2 flex items-center justify-center font-bold text-sm chat-action-btn shadow border border-yellow-600"
                  title={lang === "ar" ? "اتواصل مع الموظف" : lang === "en" ? "Contact Agent" : "Contacter un agent"}
                >
                  {lang === "ar"
                    ? "اتواصل مع موظف خدمة العملاء"
                    : lang === "en"
                    ? "Contact Customer Service"
                    : "Contacter le service client"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}