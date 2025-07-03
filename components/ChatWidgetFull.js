"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
} from "react-icons/fa";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

const FAQ = [
  { q: "ما هي ساعات العمل", a: "ساعات العمل من 8 صباحاً حتى 5 مساءً من الأحد للخميس." },
  { q: "كيف أستخرج بطاقة", a: "يرجى تعبئة النموذج على المنصة وسيتم التواصل معك خلال 24 ساعة." },
  { q: "ما هي طرق الدفع المتاحة", a: "نوفر الدفع بالبطاقات البنكية والتحويل البنكي." },
];

// Helper to always return a stable roomId (from props, localStorage, or new)
function getInitialRoomId(initialRoomId) {
  if (initialRoomId) return initialRoomId;
  const saved = window.localStorage.getItem("chatRoomId");
  if (saved) return saved;
  const newId = "RES-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
  window.localStorage.setItem("chatRoomId", newId);
  return newId;
}

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
  lang = "ar",
}) {
  const db = getDatabase();
  const [roomId] = useState(() => getInitialRoomId(initialRoomId));
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

  // ذكاء
  const [noBotHelpCount, setNoBotHelpCount] = useState(0);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [agentAccepted, setAgentAccepted] = useState(false);

  const chatEndRef = useRef(null);

  // إنشاء غرفة الشات إذا لم توجد
  useEffect(() => {
    set(dbRef(db, `chats/${roomId}`), {
      clientId: userId,
      clientName: userName,
      createdAt: Date.now(),
      status: "open",
    });
  }, [db, roomId, userId, userName]);

  // مراقبة الرسائل (مع ترتيب الرسائل حسب الوقت)
  useEffect(() => {
  const msgsRef = dbRef(db, `chats/${roomId}/messages`);
  return onValue(msgsRef, (snap) => {
    const msgs = [];
    snap.forEach((child) => {
      const val = child.val();
      if (!val || typeof val !== "object") return;

      msgs.push({
        id: child.key,
        createdAt: val.createdAt || Date.now(), // ✨ ضمان وجود createdAt
        ...val,
      });
    });

    // ترتيب آمن
    msgs.sort((a, b) => a.createdAt - b.createdAt);
    setMessages(msgs);

    setTimeout(() => {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }, 100);
  });
}, [db, roomId]);


  // مراقبة حالة الغرفة (انتظار موظف/قبول موظف)
  useEffect(() => {
    const chatRef = dbRef(db, `chats/${roomId}`);
    const unsub = onValue(chatRef, (snap) => {
      const val = snap.val();
      setWaitingForAgent(!!val?.waitingForAgent);
      setAgentAccepted(!!val?.agentAccepted);
      setChatClosed(val?.status === "closed");
    });
    return () => unsub();
  }, [db, roomId]);

  // إرسال رسالة أو مرفق base64 (صورة/صوت)
  const sendMessage = async (type = "text", content = {}) => {
    if (type === "image" || type === "audio") setUploading(true);
    const msg = {
      senderId: userId,
      senderName: userName,
      type,
      createdAt: Date.now(),
      ...content,
    };
    await push(dbRef(db, `chats/${roomId}/messages`), msg);
    if (type === "image" || type === "audio") setUploading(false);
  };

  // إرسال الرد الذكي أو الإنساني
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

    if (!waitingForAgent && !agentAccepted) {
      await sendMessage("text", { text: textMsg });
      let found = FAQ.find(f => textMsg.includes(f.q) || f.q.includes(textMsg));
      if (found) {
        await sendMessage("bot", { text: found.a });
        setNoBotHelpCount(0);
      } else {
        setNoBotHelpCount(c => c + 1);
        await sendMessage("bot", { text: "عذراً لم أجد إجابة لسؤالك. اضغط زر التواصل مع الموظف ليتم خدمتك مباشرة." });
      }
    } else {
      await sendMessage("text", { text: textMsg });
    }
    setInput("");
  };

  // الرد على زر FAQ - الإرسال الفوري
  const handleQuickFAQ = async (q) => {
    setInput("");
    await sendMessage("text", { text: q });
    let found = FAQ.find(f => q.includes(f.q) || f.q.includes(q));
    if (found) {
      await sendMessage("bot", { text: found.a });
      setNoBotHelpCount(0);
    } else {
      setNoBotHelpCount(c => c + 1);
      await sendMessage("bot", { text: "عذراً لم أجد إجابة لسؤالك. اضغط زر التواصل مع الموظف ليتم خدمتك مباشرة." });
    }
  };

  // زر التواصل مع الموظف
  const requestAgent = async () => {
    await update(dbRef(db, `chats/${roomId}`), {
      waitingForAgent: true,
      agentAccepted: false,
      assignedTo: null,
    });
    setNoBotHelpCount(0);
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

  // تسجيل صوتى
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

  // إيموجى
  const handleSelectEmoji = (emoji) => {
    setInput((prev) => prev + emoji.native);
    setShowEmoji(false);
  };

  // رسائل الفقاعة
  function renderMsgBubble(msg) {
    let isSelf = msg.senderId === userId;
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
        ? "bg-yellow-50 text-emerald-900 border border-yellow-300"
        : isBot
        ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
        : isSelf
        ? "bg-gradient-to-br from-emerald-500 to-emerald-400 text-white"
        : "bg-white text-gray-900 border border-gray-200";
    return (
      <div className={`${base} ${align} ${color}`} key={msg.id}>
        {msg.type === "text" && <span>{msg.text}</span>}
        {msg.type === "bot" && <span>{msg.text}</span>}
        {msg.type === "image" && (
          <Image src={msg.imageBase64} alt="img" width={160} height={160} className="max-w-[160px] max-h-[160px] rounded-lg border mt-1" />
        )}
        {msg.type === "audio" && (
          <audio controls src={msg.audioBase64} className="mt-1" />
        )}
        <div className="text-[10px] text-gray-400 mt-1 text-left ltr:text-left rtl:text-right">
          {isBot
            ? "المساعد الذكي"
            : isSystem
            ? "النظام"
            : msg.senderName}
          {" · "}
          {msg.createdAt
            ? new Date(msg.createdAt).toLocaleTimeString(
                "ar-EG",
                { hour: "2-digit", minute: "2-digit" }
              )
            : ""}
        </div>
      </div>
    );
  }

  // واجهة المستخدم
  return (
    <>
      <style>{`
        .chat-bg-grad { background: linear-gradient(120deg,#fafcff 60%,#f1f9fa 100%); }
        button, .cursor-pointer, [role="button"] { cursor: pointer !important; }
      `}</style>
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="fixed bottom-[150px] right-6 bg-emerald-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-xl z-[1000] animate-bounce"
          title="فتح المحادثة"
        >
          <FaComments size={32} />
        </button>
      ) : (
        <div className="fixed bottom-24 right-4 z-[1000]">
          <div className="w-[94vw] max-w-[430px] h-[calc(62vh)] min-h-[340px] flex flex-col bg-white rounded-2xl shadow-2xl border border-emerald-900 relative overflow-hidden" style={{ maxHeight: "540px" }}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-emerald-800 text-emerald-700 font-bold flex items-center gap-1 relative bg-gradient-to-l from-emerald-100 to-white">
              <span className="text-lg">الدردشة الذكية</span>
              <button
                onClick={() => setMinimized(true)}
                className="absolute left-2 top-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full w-7 h-7 flex items-center justify-center shadow border border-yellow-600"
                title="تصغير المحادثة"
                style={{ zIndex: 10, fontWeight: 700 }}
              >
                <span style={{ fontWeight: 900, fontSize: 18 }}>–</span>
              </button>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col chat-bg-grad">
              {messages.map(renderMsgBubble)}
              <div ref={chatEndRef} />
            </div>
            {/* Input */}
            {!chatClosed && (
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
                        locale="ar"
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
                  title={recording ? "جارٍ التسجيل..." : "تسجيل صوتي"}
                  disabled={uploading}
                >
                  <FaMicrophone size={22} />
                </button>
                <input
                  type="text"
                  className="flex-1 bg-gray-50 rounded-full px-4 py-2 outline-none text-gray-900 shadow border"
                  placeholder={
                    waitingForAgent && !agentAccepted
                      ? "يرجى الانتظار..."
                      : "اكتب رسالتك أو سؤالك..."
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
                  title="إرسال"
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

            {/* رسالة انتظار عند طلب موظف */}
            {waitingForAgent && !agentAccepted && (
              <div className="flex justify-center p-3">
                <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl text-center font-semibold animate-pulse">
                  يرجى الانتظار سيتم تحويل الدردشة لموظف خدمة العملاء للرد عليك في أقرب وقت...
                </div>
              </div>
            )}

            {/* خيارات الأسئلة السريعة (FAQ) فقط لو لم يدخل العميل أي رسالة */}
            {messages.length === 0 && !waitingForAgent && !agentAccepted && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {FAQ.map(f => (
                  <button
                    key={f.q}
                    onClick={() => handleQuickFAQ(f.q)}
                    className="bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-full px-4 py-2 text-sm font-semibold shadow"
                  >
                    {f.q}
                  </button>
                ))}
              </div>
            )}

            {/* زر طلب موظف بعد محاولات فاشلة */}
            {!waitingForAgent && !agentAccepted && noBotHelpCount >= 2 && (
              <div className="flex justify-center p-3">
                <button
                  type="button"
                  onClick={requestAgent}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full px-4 py-2 flex items-center justify-center font-bold text-sm"
                  title="اتواصل مع الموظف"
                >
                  اتواصل مع الموظف
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}