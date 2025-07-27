"use client";
import { useEffect, useRef, useState } from "react";
import {
  getDatabase,
  ref as dbRef,
  set,
  push,
  onValue,
} from "firebase/database";
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
import { FAQ_AR, FAQ_EN } from "./faqData";

// إعداد الصوت
const sendSound = typeof window !== "undefined" ? new Audio("/sounds/send.mp3") : null;
const receiveSound = typeof window !== "undefined" ? new Audio("/sounds/receive.mp3") : null;

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// دالة الترجمة
async function translateText(text, targetLang) {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLang }),
  });
  const data = await res.json();
  return data.translatedText;
}

export default function ChatWidgetFull({
  userId,
  userName,
  initialRoomId,
  onClose,
}) {
  // مراحل الشات: اختيار اللغة > FAQ > شات
  const [step, setStep] = useState("language");
  const [lang, setLang] = useState("");
  const [faqList, setFaqList] = useState([]);
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
  const [chatClosed, setChatClosed] = useState(false);

  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [agentAccepted, setAgentAccepted] = useState(false);

  // محاولات الأسئلة الخاطئة
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const maxWrongAttempts = 3;

  const chatEndRef = useRef(null);
  const db = getDatabase();

  // لحساب عدد الرسائل السابقة
  const prevMsgCount = useRef(0);

  // تحديد لغة الموظف (ثابت أو من إعدادات الموظف)
  const agentLang = "ar"; // يمكن تغييرها حسب احتياجك

  // fallback في حالة عدم وجود بيانات مستخدم
  const safeUserId = userId || "guest";
  const safeUserName = userName || "زائر";

  // اختيار اللغة تلقائيًا من المتصفح عند أول فتح
  useEffect(() => {
    if (!lang && typeof window !== "undefined") {
      const browserLang = navigator.language?.startsWith("ar") ? "ar" : "en";
      setLang(browserLang);
      setFaqList(browserLang === "ar" ? FAQ_AR : FAQ_EN);
      setStep("faq");
    }
  }, [lang]);

  // اختيار اللغة يدويًا من زر أو حقل إدخال
  const handleLangSelect = (l) => {
    setLang(l);
    setFaqList(l === "ar" ? FAQ_AR : FAQ_EN);
    setStep("faq");
  };

  // دالة للتحقق هل السؤال موجود في الأسئلة الجاهزة
  function getFaqAnswer(userQuestion) {
    const list = lang === "ar" ? FAQ_AR : FAQ_EN;
    const found = list.find(f => f.q.trim().toLowerCase() === userQuestion.trim().toLowerCase());
    return found ? found.a : null;
  }

  // إرسال السؤال من العميل في مرحلة FAQ
  const handleAskFaq = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const answer = getFaqAnswer(input);
    if (answer) {
      // سؤال موجود: أظهر الإجابة
      await sendMessage("text", { text: input });
      await sendMessage("bot", { text: answer });
      setInput("");
      setWrongAttempts(0);
      setStep("chat");
    } else {
      // سؤال غير موجود
      await sendMessage("text", { text: input });
      await sendMessage("bot", { text: lang === "ar" ? "عذرًا لم أجد إجابة لهذا السؤال! جرب سؤال آخر." : "Sorry, I couldn't find an answer for that!" });
      setWrongAttempts(prev => prev + 1);
      setInput("");
    }
  };

  // عرض زر التواصل مع الموظف إذا تجاوز العميل عدد المحاولات
  const showContactAgentButton = wrongAttempts >= maxWrongAttempts;

  // عند الضغط عليه يبدأ مرحلة التواصل مع الموظف
  const handleContactAgent = () => {
    setStep("chat");
    setWaitingForAgent(true);
    sendMessage("system", { text: lang === "ar" ? "العميل يحتاج التواصل مع موظف." : "Customer needs to contact an agent." });
  };

  // بدء محادثة من سؤال FAQ جاهز
  const handleFaqSelect = async (q, a) => {
    setStep("chat");
    await sendMessage("text", { text: q });
    await sendMessage("bot", { text: a });
  };

  // بدء شات بدون سؤال
  const handleStartChatDirectly = () => setStep("chat");

  // Firebase: تحضير غرفة الدردشة
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
    if (!roomId || !safeUserId || !safeUserName) return;
    set(dbRef(db, `chats/${roomId}`), {
      clientId: safeUserId,
      clientName: safeUserName,
      createdAt: Date.now(),
      status: "open",
      clientLang: lang,
      agentLang: agentLang,
    });
  }, [db, roomId, safeUserId, safeUserName, lang, agentLang]);

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

      // صوت الاستقبال عند وصول رسالة جديدة من غير المستخدم
      if (msgs.length > prevMsgCount.current) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.senderId !== safeUserId) {
          if (receiveSound) {
            receiveSound.currentTime = 0;
            receiveSound.play();
          }
        }
      }
      prevMsgCount.current = msgs.length;
    });
  }, [db, roomId, safeUserId]);

  useEffect(() => {
    if (!roomId) return;
    const chatRef = dbRef(db, `chats/${roomId}`);
    const unsub = onValue(chatRef, (snap) => {
      const val = snap.val();
      setWaitingForAgent(!!val?.waitingForAgent);
      setAgentAccepted(!!val?.agentAccepted);
      setChatClosed(val?.status === "closed");
    });
    return () => unsub();
  }, [db, roomId]);

  // إرسال رسالة مع ترجمة إذا كانت للموظف
  const sendMessage = async (type = "text", content = {}) => {
    if (type === "image" || type === "audio") setUploading(true);

    let msgText = content.text || "";
    let translatedMsg = msgText;

    // لو العميل يتواصل مع الموظف، ترجم للغة الموظف
    if (waitingForAgent && type === "text" && lang !== agentLang) {
      translatedMsg = await translateText(msgText, agentLang);
    }

    const msg = {
      senderId: type === "bot" ? "taheel-ai" : safeUserId,
      senderName: type === "bot" ? (lang === "ar" ? "تأهيل AI" : "Taheel AI") : safeUserName,
      type,
      createdAt: Date.now(),
      text: msgText,
      translatedText: translatedMsg,
      clientLang: lang,
      agentLang: agentLang,
      ...content,
    };

    await push(dbRef(db, `chats/${roomId}/messages`), msg);
    if (type === "image" || type === "audio") setUploading(false);

    // تشغيل صوت الإرسال عند إرسال الرسالة
    if (sendSound) {
      sendSound.currentTime = 0;
      sendSound.play();
    }
  };

  // إرسال رسالة من صندوق الكتابة
  const handleSend = async (e) => {
    e.preventDefault();
    if (chatClosed || (uploading && (imagePreview || audioBlob)) || (waitingForAgent && !agentAccepted)) return;

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
    setInput("");
  };

  // رفع صورة
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // تسجيل صوتي
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

  // اختيار ايموجي
  const handleSelectEmoji = (emoji) => {
    setInput((prev) => prev + emoji.native);
    setShowEmoji(false);
  };

  // شكل الرسالة (يظهر للعميل بلغته)
  function renderMsgBubble(msg) {
    const isSelf = msg.senderId === safeUserId;
    const isBot = msg.senderId === "taheel-ai";
    const displayText = msg.text;

    const base =
      "rounded-2xl px-4 py-3 mb-2 shadow transition-all max-w-[78%] whitespace-pre-line break-words";
    const align = isSelf
      ? "ml-auto self-end"
      : isBot
      ? "self-start"
      : "self-start";
    const color =
      isBot
        ? "bg-gradient-to-r from-yellow-50 via-yellow-100 to-emerald-100 text-emerald-900 border border-yellow-300"
        : isSelf
        ? "bg-gradient-to-br from-emerald-500 to-emerald-400 text-white"
        : "bg-gradient-to-r from-white via-emerald-50 to-white text-gray-900 border border-gray-200";
    return (
      <div className={`${base} ${align} ${color} flex gap-2 items-center`} key={msg.id}>
        {isBot && (
          <img
            src="/taheel-bot.png"
            alt="Taheel Bot"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "2px solid #10b981",
              background: "#fff",
              objectFit: "cover",
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          {(msg.type === "text" || msg.type === "bot") && <span>{displayText}</span>}
          {msg.type === "image" && (
            <img src={msg.imageBase64} alt="img" width={160} height={160} className="max-w-[160px] max-h-[160px] rounded-lg border mt-1" />
          )}
          {msg.type === "audio" && (
            <audio controls src={msg.audioBase64} className="mt-1" />
          )}
          <div className="text-[10px] text-gray-400 mt-1 text-left ltr:text-left rtl:text-right">
            {isBot
              ? (lang === "ar" ? "تأهيل AI" : "Taheel AI")
              : msg.senderName}
            {" · "}
            {msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString(
                  lang === "ar" ? "ar-EG" : "en-US",
                  { hour: "2-digit", minute: "2-digit" }
                )
              : ""}
          </div>
        </div>
      </div>
    );
  }

  // واجهة اختيار اللغة - يظهر تلقائي من المتصفح ويمكن للعميل اختيار أو كتابة لغته
  const LanguageStep = (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <span
        className="font-semibold text-base mb-2"
        style={{
          color: lang === "ar" ? "#10b981" : "#2563eb",
          background: "#f6fff6",
          padding: "8px 20px",
          borderRadius: "14px",
          fontSize: "1.25rem",
          fontWeight: "bold",
          border: `2px solid ${lang === "ar" ? "#10b981" : "#2563eb"}`,
          boxShadow: "0 2px 8px rgba(16,185,129,0.08)",
        }}
      >
        {lang === "ar" ? "اختر اللغة المفضلة" : "Choose your preferred language"}
      </span>
      <div className="flex gap-2">
        <button
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-2 font-bold shadow"
          onClick={() => handleLangSelect("ar")}
        >
          العربية
        </button>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 font-bold shadow"
          onClick={() => handleLangSelect("en")}
        >
          English
        </button>
      </div>
      <input
        type="text"
        className="border rounded-full px-4 py-2 w-full max-w-xs outline-none mt-2"
        placeholder={lang === "ar" ? "اكتب اللغة مثل ar أو en" : "Type your language e.g. ar or en"}
        onChange={e => setLang(e.target.value.trim().toLowerCase())}
        value={lang}
      />
      <button
        className="bg-gray-500 hover:bg-gray-700 text-white rounded-full px-6 py-2 font-bold shadow mt-2"
        onClick={() => {
          if (lang === "ar" || lang === "en") {
            setFaqList(lang === "ar" ? FAQ_AR : FAQ_EN);
            setStep("faq");
          }
        }}
      >
        {lang === "ar" ? "تأكيد اللغة" : "Confirm Language"}
      </button>
    </div>
  );

  // واجهة الأسئلة ومحاولة الإجابة + زر التواصل مع الموظف بعد محاولات خاطئة
  const FaqStep = (
    <div className="flex flex-col items-center gap-3">
      <span className="font-semibold text-base mb-2">
        {lang === "ar" ? "اكتب سؤالك أو اختر من القائمة" : "Type your question or choose from the list"}
      </span>
      <form onSubmit={handleAskFaq} className="w-full flex flex-col items-center gap-2">
        <input
          type="text"
          className="border rounded-full px-4 py-2 w-full max-w-xs outline-none"
          placeholder={lang === "ar" ? "اكتب سؤالك هنا..." : "Type your question here..."}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-2 font-bold shadow"
        >
          {lang === "ar" ? "اسأل" : "Ask"}
        </button>
      </form>
      {faqList.map(f => (
        <button
          key={f.q}
          onClick={() => handleFaqSelect(f.q, f.a)}
          className="bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-full px-4 py-2 text-sm font-semibold shadow w-full"
        >
          {f.q}
        </button>
      ))}
      <button
        className="bg-white border border-emerald-400 text-emerald-700 rounded-full px-4 py-2 text-sm font-semibold shadow w-full mt-2"
        onClick={handleStartChatDirectly}
      >
        {lang === "ar" ? "بدء المحادثة مباشرة" : "Start chat directly"}
      </button>
      {showContactAgentButton && (
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 font-bold shadow mt-2"
          onClick={handleContactAgent}
        >
          {lang === "ar" ? "التواصل مع موظف" : "Contact Support Agent"}
        </button>
      )}
    </div>
  );

  // زر الفتح العائم
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-[150px] right-6 bg-emerald-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-xl z-[1000] animate-bounce"
        title="فتح المحادثة"
      >
        <FaComments size={32} />
      </button>
    );
  }

  return (
    <>
      <style>{`
        .chat-bg-grad {
          background: linear-gradient(125deg,#e8fff7 0%,#f6f8ff 100%);
        }
        button, .cursor-pointer, [role="button"] { cursor: pointer !important; }
      `}</style>
      <div className="fixed bottom-24 right-4 z-[1000]">
        <div
          className="w-[92vw] max-w-[370px] h-[calc(60vh)] min-h-[250px] flex flex-col rounded-3xl shadow-2xl border border-emerald-400 relative overflow-hidden"
          style={{
            maxHeight: "480px",
            background: "linear-gradient(135deg, #f2fafb 85%, #dbeafe 100%)",
            boxShadow: "0 10px 32px 0 rgba(16,185,129,0.16)",
            border: "none",
          }}
        >
          {/* رأس الشات وزر الغلق والمينمايز */}
          <div className="px-4 py-3 border-b border-emerald-300 text-emerald-800 font-bold flex items-center gap-1 relative bg-gradient-to-l from-emerald-50 to-white">
            <span className="text-lg">
              {lang === "ar"
                ? "الدردشة الذكية"
                : lang === "en"
                ? "Smart Chat"
                : "الدردشة"}
            </span>
            {/* زر مينمايز */}
            <button
              onClick={() => setMinimized(true)}
              className="absolute left-10 top-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full w-7 h-7 flex items-center justify-center shadow border border-yellow-600"
              style={{ zIndex: 11, fontWeight: 700 }}
              title={lang === "ar" ? "تصغير المحادثة" : "Minimize"}
            >
              <FaWindowMinimize size={15} />
            </button>
            {/* زر غلق */}
            <button
              onClick={() => { onClose && onClose(); setStep("language"); setLang(""); setMinimized(true); }}
              className="absolute left-2 top-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow border border-red-200"
              title={lang === "ar" ? "غلق المحادثة" : "Close"}
              style={{ zIndex: 10, fontWeight: 700 }}
            >
              <FaTimes />
            </button>
          </div>
          {/* مراحل الشات */}
          <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col chat-bg-grad">
            {/* اختيار اللغة تلقائي أو يدوي أو إدخال حقل */}
            {step === "language" && LanguageStep}
            {/* صفحة الأسئلة ومحاولات الإجابة وزر التواصل مع الموظف */}
            {step === "faq" && FaqStep}
            {/* شات عادي */}
            {step === "chat" && (
              <>
                {messages.map(renderMsgBubble)}
                <div ref={chatEndRef} />
              </>
            )}
          </div>
          {/* صندوق الكتابة */}
          {step === "chat" && !chatClosed && (
            <form
              className="border-t border-emerald-200 px-3 py-3 flex items-center gap-2 bg-white"
              onSubmit={handleSend}
            >
              <div className="relative">
                <button
                  type="button"
                  className="text-yellow-400 hover:text-yellow-600"
                  title="إضافة إيموجي"
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
                      locale={lang === "ar" ? "ar" : "en"}
                    />
                  </div>
                )}
              </div>
              <label className="cursor-pointer text-emerald-400 hover:text-emerald-600">
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
                className={`text-emerald-400 hover:text-emerald-600 ${recording ? "animate-pulse text-red-600" : ""}`}
                title={recording ? "جارٍ التسجيل..." : lang === "ar" ? "تسجيل صوتي" : "Voice record"}
                disabled={uploading}
              >
                <FaMicrophone size={22} />
              </button>
              <input
                type="text"
                className="flex-1 bg-gray-50 rounded-full px-4 py-2 outline-none text-gray-900 shadow border"
                placeholder={
                  waitingForAgent && !agentAccepted
                    ? (lang === "ar" ? "يرجى الانتظار..." : "Please wait...")
                    : (lang === "ar" ? "اكتب رسالتك أو سؤالك..." : "Type your message or question...")
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow"
                title={lang === "ar" ? "إرسال" : "Send"}
                disabled={uploading || (waitingForAgent && !agentAccepted)}
                style={{ cursor: "pointer" }}
              >
                <FaPaperPlane />
              </button>
              {(imagePreview || audioBlob) && (
                <span className="ml-2 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded flex items-center">
                  {imagePreview && <>صورة جاهزة للإرسال</>}
                  {audioBlob && <>صوت جاهز للإرسال</>}
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setAudioBlob(null); }}
                    className="ml-1 text-red-600 font-bold"
                  >×</button>
                </span>
              )}
            </form>
          )}
          {/* تنبيه انتظار الموظف */}
          {step === "chat" && waitingForAgent && !agentAccepted && (
            <div className="flex justify-center p-3">
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl text-center font-semibold animate-pulse">
                {lang === "ar"
                  ? "يرجى الانتظار سيتم تحويل الدردشة لموظف خدمة العملاء للرد عليك في أقرب وقت..."
                  : "Please wait, your chat will be transferred to a support agent soon..."}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}