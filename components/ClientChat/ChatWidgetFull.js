"use client";
import { useEffect, useRef, useState } from "react";
import {
  getDatabase,
  ref as dbRef,
  set,
  push,
  onValue,
  update,
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
import countriesLang from "../../lib/countriesLang";

const countriesObject = {};
const countriesLangMap = {};
countriesLang.forEach((item) => {
  countriesObject[item.code] = `${item.flag} ${item.name}`;
  countriesLangMap[item.code] = item.lang;
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
  // ---- State ----
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
  const [showAgentButton, setShowAgentButton] = useState(false);
  const chatEndRef = useRef(null);

  const [welcomeSent, setWelcomeSent] = useState(false);

  const safeUserId = userId || "guest";
  const fontFamily = lang === "ar" ? "Tajawal, Segoe UI, sans-serif" : "Segoe UI, Tajawal, sans-serif";
  const dir = lang === "ar" ? "rtl" : "ltr";

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

  const playSend = () => { if (sendAudio) { sendAudio.currentTime = 0; sendAudio.play(); } };
  const playReceive = () => { if (receiveAudio) { receiveAudio.currentTime = 0; receiveAudio.play(); } };

  const handleOpenChat = () => {
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
    setShowAgentButton(false);
    setWelcomeSent(false);
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

  // لا ترسل رسالة ترحيب تلقائيًا من useEffect أبداً!
  // الترحيب يكون فقط من onSelect في LanguageSelectModal

  // إرسال سؤال المستخدم للـ OpenAI إن لم يجد إجابة في الأسئلة الشائعة
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

  // تعديل منطق إرسال الرسائل بحيث لو لم يجد رد في FAQ يرسل للـ OpenAI
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
      setShowAgentButton(false);
    } else {
      const openAIPrompt =
        lang === "ar"
          ? `أجب على هذا السؤال بشكل احترافي باللغة العربية فقط: ${textMsg}.
             إذا وجدت أن العميل يطلب موظف خدمة العملاء أو لا يمكن الرد عليه، أضف جملة واضحة في نهاية الرد: "هل ترغب في التواصل مع موظف خدمة العملاء؟ اضغط الزر بالأسفل."`
          : lang === "en"
          ? `Answer this question professionally in English only: ${textMsg}.
             If you detect the client wants to contact a customer service agent, or the question can't be answered, add this sentence at the end: "Would you like to contact a customer service agent? Click the button below."`
          : `Réponds à cette question professionnellement uniquement en français: ${textMsg}.
             Si tu vois que le client demande un agent du service client ou que tu ne peux pas répondre, ajoute à la fin : "Voulez-vous contacter un agent du service client ? Cliquez sur le bouton ci-dessous."`;

      const res = await fetch("/api/openai-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: openAIPrompt, lang }),
      });
      const data = await res.json();
      await sendMessage("bot", { text: data.text });

      if (
        data.text?.includes("هل ترغب في التواصل مع موظف خدمة العملاء؟") ||
        data.text?.includes("Would you like to contact a customer service agent?") ||
        data.text?.includes("Voulez-vous contacter un agent du service client ?")
      ) {
        setShowAgentButton(true);
      } else {
        setShowAgentButton(false);
      }
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
      setShowAgentButton(false);
    } else {
      try {
        const prompt =
          lang === "ar"
            ? `أجب على هذا السؤال بشكل احترافي باللغة العربية فقط: ${q}.
               إذا وجدت أن العميل يطلب موظف خدمة العملاء أو لا يمكن الرد عليه، أضف جملة واضحة في نهاية الرد: "هل ترغب في التواصل مع موظف خدمة العملاء؟ اضغط الزر بالأسفل."`
            : lang === "en"
            ? `Answer this question professionally in English only: ${q}.
               If you detect the client wants to contact a customer service agent, or the question can't be answered, add this sentence at the end: "Would you like to contact a customer service agent? Click the button below."`
            : `Réponds à cette question professionnellement uniquement en français: ${q}.
               Si tu vois que le client demande un agent du service client ou que tu ne peux pas répondre, ajoute à la fin : "Voulez-vous contacter un agent du service client ? Cliquez sur le bouton ci-dessous."`;
        const res = await fetch("/api/openai-gpt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, lang }),
        });
        const data = await res.json();
        await sendMessage("bot", { text: data.text });
        setNoBotHelpCount(0);

        if (
          data.text?.includes("هل ترغب في التواصل مع موظف خدمة العملاء؟") ||
          data.text?.includes("Would you like to contact a customer service agent?") ||
          data.text?.includes("Voulez-vous contacter un agent du service client ?")
        ) {
          setShowAgentButton(true);
        } else {
          setShowAgentButton(false);
        }
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
        setShowAgentButton(false);
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
    setShowAgentButton(false);
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
      ? "ml-auto self-end"
      : isBot
      ? "self-start"
      : isSystem
      ? "mx-auto"
      : "self-start";
    let color =
      isSystem
        ? "bg-gradient-to-r from-blue-50 to-blue-100 text-emerald-900 border border-blue-300"
        : isBot
        ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900 border border-emerald-400"
        : isSelf
        ? "bg-gradient-to-br from-blue-500 to-emerald-400 text-white"
        : "bg-gradient-to-br from-white to-gray-100 text-gray-900 border border-gray-200";

    return (
      <div className={`${base} ${align} ${color} flex items-start gap-2`} key={msg.id} style={{ fontFamily }}>
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
      ? "chat-header-buttons left-2 flex-row-reverse"
      : "chat-header-buttons left-2 flex-row";

  if (closed) return null;

  return (
    <>
      <style>{`
        .chat-bg-grad {
          background: linear-gradient(120deg,#eafbf6 60%,#e1f7fa 100%);
        }
        button, .cursor-pointer, [role="button"] { cursor: pointer !important; }
        .chat-action-btn {
          transition: background .2s, color .2s, box-shadow .2s;
        }
        .chat-action-btn:hover {
          box-shadow: 0 0 8px #10b98199;
          background: #e0f7fa;
        }
        .chat-header-buttons {
          display: flex;
          gap: 8px;
          position: absolute;
          top: 12px;
          z-index: 11;
        }
        .left-2 { left: 12px }
        .right-2 { right: 12px }
        .flex-row-reverse { flex-direction: row-reverse }
        .flex-row { flex-direction: row }
      `}</style>
      {minimized ? (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-[150px] right-6 bg-gradient-to-br from-emerald-600 to-blue-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-xl z-[1000] animate-bounce chat-action-btn"
          title="فتح المحادثة"
          style={{ fontFamily }}
        >
          <FaComments size={32} />
        </button>
      ) : (
        <div className={`fixed bottom-24 right-4 z-[1000] font-sans`} dir={dir} style={{ direction: dir, fontFamily }}>
          <div
            className="w-[94vw] max-w-[430px] h-[calc(62vh)] min-h-[340px] flex flex-col bg-white rounded-3xl shadow-2xl border border-emerald-600 relative"
            style={{
              maxHeight: "540px",
              boxShadow: "0 8px 32px 0 #10b98122",
              overflow: "visible"
            }}
          >
            <div className="px-4 py-3 border-b border-emerald-600 text-blue-700 font-bold flex items-center gap-1 relative bg-gradient-to-l from-emerald-100 to-white" style={{ fontSize: "1.12rem" }}>
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
                  className="bg-blue-400 hover:bg-blue-500 text-gray-900 rounded-full w-7 h-7 flex items-center justify-center shadow border border-blue-600 chat-action-btn"
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
onSelect={async (chosenLang, chosenCountry, chosenUserName) => {
  setLang(chosenLang);
  setSelectedCountry(chosenCountry);
  setShowLangModal(false);
  setWelcomeSent(true);

  console.log("LANG:", chosenLang, "COUNTRY:", chosenCountry, "USER:", chosenUserName);

  try {
    const res = await fetch("/api/openai-gpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "",
        lang: chosenLang,
        country: chosenCountry,
        userName: chosenUserName,
        isWelcome: true
      }),
    });
    const data = await res.json();
    console.log("WELCOME DATA:", data);
    setMessages([
      {
        id: "welcome-" + Date.now(),
        type: "bot",
        senderName: "Bot",
        createdAt: Date.now(),
        text: data.text || `مرحبًا بك يا ${chosenUserName}!`,
      },
    ]);
  } catch (err) {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        type: "bot",
        senderName: "Bot",
        createdAt: Date.now(),
        text: `مرحبًا بك يا ${chosenUserName}!`,
      },
    ]);
  }
}}
                  />
                </div>
              )}
              {!showLangModal && (Array.isArray(messages) ? messages.map(renderMsgBubble) : null)}
              <div ref={chatEndRef} />
            </div>
            {!showLangModal && (
              <form
                className="border-t border-emerald-600 px-3 py-3 flex items-center gap-2 bg-white"
                onSubmit={handleSend}
                style={{ fontFamily }}
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
                        theme="light"
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
                  className="flex-1 bg-gray-50 rounded-full px-4 py-2 outline-none text-gray-900 shadow border"
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
                  style={{ fontSize: "1rem", fontFamily }}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-br from-emerald-600 to-blue-500 hover:from-emerald-700 hover:to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow chat-action-btn"
                  title={lang === "ar" ? "إرسال" : lang === "en" ? "Send" : "Envoyer"}
                  disabled={uploading || (waitingForAgent && !agentAccepted)}
                  style={{ cursor: "pointer", fontFamily }}
                >
                  <FaPaperPlane />
                </button>
                {(imagePreview || audioBlob) && (
                  <span className="ml-2 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded flex items-center" style={{ fontFamily }}>
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
            {!waitingForAgent && !agentAccepted && !showLangModal && showAgentButton && (
              <div className="flex justify-center p-3">
                <button
                  type="button"
                  onClick={requestAgent}
                  className="bg-gradient-to-br from-yellow-400 to-blue-100 hover:from-yellow-500 hover:to-blue-200 text-gray-900 rounded-full px-4 py-2 flex items-center justify-center font-bold text-sm chat-action-btn shadow border border-yellow-600"
                  style={{ fontFamily }}
                >
                  {lang === "ar"
                    ? "اتواصل مع موظف خدمة العملاء"
                    : lang === "en"
                    ? "Contact Customer Service"
                    : "Contacter le service client"}
                </button>
              </div>
            )}
            {waitingForAgent && !agentAccepted && !showLangModal && (
              <div className="flex justify-center p-3">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 px-4 py-2 rounded-xl text-center font-semibold animate-pulse border border-blue-200 shadow" style={{ fontFamily }}>
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
                    className="bg-gradient-to-br from-emerald-200 to-blue-100 hover:from-emerald-300 hover:to-blue-200 text-blue-900 rounded-full px-4 py-2 text-sm font-semibold shadow chat-action-btn"
                    style={{ fontFamily }}
                  >
                    {f.q[lang] || f.q.en}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}