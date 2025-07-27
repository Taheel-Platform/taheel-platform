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
import {
  FaPaperPlane,
  FaMicrophone,
  FaImage,
  FaSmile,
  FaComments,
  FaTimes,
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

  const chatEndRef = useRef(null);
  const db = getDatabase();

  // لحساب عدد الرسائل السابقة
  const prevMsgCount = useRef(0);

  // fallback في حالة عدم وجود بيانات مستخدم
  const safeUserId = userId || "guest";
  const safeUserName = userName || "زائر";

  // اختيار اللغة
  const handleLangSelect = (l) => {
    setLang(l);
    setFaqList(l === "ar" ? FAQ_AR : FAQ_EN);
    setStep("faq");
  };

  // بدء محادثة من سؤال FAQ
  const handleFaqSelect = async (q, a) => {
    setStep("chat");
    // أضف السؤال والرد كرسالة في الدردشة
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
    });
  }, [db, roomId, safeUserId, safeUserName]);

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

  // إرسال رسالة
  const sendMessage = async (type = "text", content = {}) => {
    if (type === "image" || type === "audio") setUploading(true);
    const msg = {
      senderId: type === "bot" ? "taheel-ai" : safeUserId,
      senderName: type === "bot" ? (lang === "ar" ? "تأهيل AI" : "Taheel AI") : safeUserName,
      type,
      createdAt: Date.now(),
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

    // هنا ممكن دمج الذكاء الصناعي لاحقاً
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

  // شكل الرسالة
  function renderMsgBubble(msg) {
    const isSelf = msg.senderId === safeUserId;
    const isBot = msg.senderId === "taheel-ai";
    const base =
      "rounded-2xl px-4 py-3 mb-2 shadow transition-all max-w-[78%] whitespace-pre-line break-words";
    const align = isSelf
      ? "ml-auto self-end"
      : isBot
      ? "self-start"
      : "self-start";
    const color =
      isBot
        ? "bg-yellow-50 text-emerald-900 border border-yellow-300"
        : isSelf
        ? "bg-gradient-to-br from-emerald-500 to-emerald-400 text-white"
        : "bg-white text-gray-900 border border-gray-200";
    return (
      <div className={`${base} ${align} ${color} flex gap-2 items-center`} key={msg.id}>
        {/* لوجو بوت لو الرد من تأهيل AI */}
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
          {msg.type === "text" && <span>{msg.text}</span>}
          {msg.type === "bot" && <span>{msg.text}</span>}
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
        .chat-bg-grad { background: linear-gradient(120deg,#fafcff 60%,#f1f9fa 100%); }
        button, .cursor-pointer, [role="button"] { cursor: pointer !important; }
      `}</style>
      <div className="fixed bottom-24 right-4 z-[1000]">
        <div className="w-[92vw] max-w-[350px] h-[calc(56vh)] min-h-[240px] flex flex-col bg-white rounded-2xl shadow-2xl border border-emerald-900 relative overflow-hidden" style={{ maxHeight: "460px" }}>
          {/* رأس الشات وزر الغلق العائم */}
          <div className="px-4 py-3 border-b border-emerald-800 text-emerald-700 font-bold flex items-center gap-1 relative bg-gradient-to-l from-emerald-100 to-white">
            <span className="text-lg">
              {lang === "ar" ? "الدردشة الذكية" : lang === "en" ? "Smart Chat" : "الدردشة"}
            </span>
            {/* زر غلق */}
            <button
              onClick={() => { setMinimized(true); onClose && onClose(); }}
              className="absolute left-2 top-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow border border-red-200"
              title="غلق المحادثة"
              style={{ zIndex: 10, fontWeight: 700 }}
            >
              <FaTimes />
            </button>
          </div>
          {/* مراحل الشات */}
          <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col chat-bg-grad">
            {/* اختيار اللغة */}
            {step === "language" && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <span className="font-semibold text-base mb-2">اختر اللغة المفضلة</span>
                <button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-2 font-bold shadow"
                  onClick={() => handleLangSelect("ar")}
                >العربية</button>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 font-bold shadow"
                  onClick={() => handleLangSelect("en")}
                >English</button>
              </div>
            )}
            {/* صفحة الأسئلة حسب اللغة */}
            {step === "faq" && (
              <div className="flex flex-col items-center gap-3">
                <span className="font-semibold text-base mb-2">
                  {lang === "ar" ? "اختر سؤال أو ابدأ المحادثة مباشرة" : "Choose a question or start chat"}
                </span>
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
              </div>
            )}
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
              className="border-t border-emerald-800 px-3 py-3 flex items-center gap-2 bg-white"
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