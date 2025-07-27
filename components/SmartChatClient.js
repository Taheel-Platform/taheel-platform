"use client";
import { useEffect, useRef, useState } from "react";
import {
  getDatabase,
  ref as dbRef,
  push,
  onValue,
  update,
} from "firebase/database";
import { FaPaperPlane, FaSmile } from "react-icons/fa";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

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

export default function ChatWidgetAgent({ agentId, agentName, agentLang = "ar" }) {
  const db = getDatabase();

  // قائمة عملاء الانتظار (الغرف)
  const [waitingRooms, setWaitingRooms] = useState([]);
  // الغرفة المختارة/شات الموظف الحالي
  const [chatRoom, setChatRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [chatClosed, setChatClosed] = useState(false);

  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // جلب قائمة العملاء المنتظرين
  useEffect(() => {
    const chatsRef = dbRef(db, "chats");
    const unsub = onValue(chatsRef, (snap) => {
      const waiting = [];
      snap.forEach((room) => {
        const c = { ...room.val(), id: room.key };
        // العملاء المنتظرين فقط (لم يتم قبولهم من موظف بعد)
        if (c.status === "open" && c.waitingForAgent && !c.agentId) waiting.push(c);
      });
      setWaitingRooms(waiting);
    });
    return () => unsub();
  }, []);

  // جلب رسائل الغرفة المختارة
  useEffect(() => {
    if (!chatRoom) {
      setMessages([]);
      setChatClosed(false);
      return;
    }
    const msgsRef = dbRef(db, `chats/${chatRoom.id}/messages`);
    const unsubMsgs = onValue(msgsRef, (snap) => {
      const msgs = [];
      snap.forEach((d) => {
        msgs.push({ ...d.val(), id: d.key });
      });
      msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(msgs);
      // تحقق من الإغلاق
      const closedMsg = msgs.find(
        (msg) =>
          msg.type === "system" &&
          (msg.text === "تم اغلاق المحادثة من طرف العميل" ||
            msg.text === "تم اغلاق المحادثة من طرف الموظف")
      );
      setChatClosed(!!closedMsg);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    });
    return () => unsubMsgs();
  }, [chatRoom]);

  // غلق الـ Emoji Picker عند الضغط خارجها
  useEffect(() => {
    if (!showEmoji) return;
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmoji]);

  // قبول المحادثة (تعيين الموظف للغرفة)
  const handleAcceptChat = async (room) => {
    await update(dbRef(db, `chats/${room.id}`), {
      waitingForAgent: false,
      agentId,
      agentName,
      agentLang,
      acceptedAt: Date.now(),
    });
    setChatRoom({ ...room, waitingForAgent: false, agentId, agentName, agentLang });
    setWaitingRooms(waitingRooms.filter(r => r.id !== room.id)); // إزالة الغرفة من قائمة الانتظار
  };

  // إرسال رسالة للعميل مع ترجمة تلقائية
  const sendMessage = async () => {
    if (!chatRoom || !input.trim() || chatClosed) return;

    const clientLang = chatRoom.clientLang || "ar";
    let translatedMsg = input;

    if (agentLang !== clientLang) {
      translatedMsg = await translateText(input, clientLang);
    }

    await push(dbRef(db, `chats/${chatRoom.id}/messages`), {
      senderId: agentId,
      senderName: agentName || "موظف",
      senderType: "agent",
      text: input,
      translatedText: translatedMsg,
      type: "text",
      createdAt: Date.now(),
      agentLang,
      clientLang,
    });
    setInput("");
  };

  // غلق الشات من الموظف
  const handleCloseChat = async () => {
    if (!chatRoom) return;
    await push(dbRef(db, `chats/${chatRoom.id}/messages`), {
      text: "تم اغلاق المحادثة من طرف الموظف",
      type: "system",
      createdAt: Date.now(),
    });
    await update(dbRef(db, `chats/${chatRoom.id}`), { status: "closed_by_agent" });
    setChatClosed(true);
    setChatRoom(null); // يرجع لقائمة العملاء بعد الإغلاق
  };

  // إدراج إيموجي
  const handleSelectEmoji = (emoji) => {
    setInput((prev) => prev + emoji.native);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // عرض الرسائل حسب لغة الموظف
  function renderMsgBubble(msg) {
    let bubbleClass =
      "rounded-2xl px-4 py-3 mb-2 shadow transition-all max-w-[78%] whitespace-pre-line break-words";
    let self = msg.senderType === "agent";
    let showTranslation = false;
    let displayText = msg.text;

    if (!self && msg.translatedText && msg.agentLang === agentLang) {
      showTranslation = true;
      displayText = msg.translatedText;
    }

    if (msg.type === "system") {
      bubbleClass += " bg-yellow-50 text-blue-800 border border-blue-200 mx-auto";
    } else if (self) {
      bubbleClass += " bg-gradient-to-br from-blue-400 to-blue-600 text-white ml-auto self-end";
    } else {
      bubbleClass += " bg-white text-blue-900 border border-blue-200 self-start";
    }

    return (
      <div className={bubbleClass} key={msg.id}>
        {["text", "system"].includes(msg.type) && (
          <span>
            {displayText}
            {showTranslation && (
              <span className="block text-xs text-gray-400 mt-1">
                (ترجمة تلقائية)
              </span>
            )}
          </span>
        )}
        <div className="text-[10px] text-blue-400 mt-1 text-left ltr:text-left rtl:text-right">
          {msg.type !== "system" ? msg.senderName : "النظام"}
          {" · "}
          {msg.createdAt
            ? new Date(msg.createdAt).toLocaleTimeString(
                agentLang === "ar" ? "ar-EG" : "en-US",
                { hour: "2-digit", minute: "2-digit" }
              )
            : ""}
        </div>
      </div>
    );
  }

  // واجهة اختيار اللغة للموظف
  const [showLangSelect, setShowLangSelect] = useState(false);

  return (
    <div
      className="h-full w-full flex flex-col rounded-2xl shadow-lg border border-blue-900"
      style={{
        minHeight: "400px",
        maxWidth: 480,
        background: "linear-gradient(120deg, #eaf6ff 60%, #e0eaff 100%)",
      }}
    >
      <style>{`
        .agent-btn:hover, .agent-btn:focus { background: #e6f4fa; cursor: pointer; }
        .agent-close:hover, .agent-close:focus { background: #ef4444; color: white; cursor: pointer; }
        button, .cursor-pointer, [role="button"] { cursor: pointer !important; }
      `}</style>
      <div className="flex items-center justify-between px-4 py-2 border-b border-blue-800 bg-gradient-to-l from-blue-100 to-white rounded-t-2xl">
        <span className="text-lg font-bold text-blue-700 tracking-wide">
          لوحة الموظف - الدعم الفني
        </span>
        <div className="flex gap-2 items-center">
          {chatRoom && !chatClosed && (
            <button
              className="agent-close bg-red-100 text-red-700 px-3 py-1 rounded-full shadow text-sm font-bold border border-red-200 transition"
              onClick={handleCloseChat}
            >
              إنهاء
            </button>
          )}
          {/* اختيار اللغة */}
          <button
            className="agent-btn bg-blue-100 border border-blue-300 text-blue-700 px-3 py-1 rounded-full shadow text-sm font-bold transition"
            onClick={() => setShowLangSelect((v) => !v)}
          >
            {agentLang === "ar" ? "العربية" : "English"}
          </button>
          {showLangSelect && (
            <div className="absolute left-6 top-12 bg-white border border-blue-300 rounded-xl shadow-lg z-50 p-3 flex gap-2">
              <button
                className={`agent-btn px-3 py-2 rounded font-bold ${
                  agentLang === "ar" ? "bg-blue-200 text-blue-700" : ""
                }`}
                onClick={() => {
                  setShowLangSelect(false);
                  window.location.reload();
                }}
              >
                العربية
              </button>
              <button
                className={`agent-btn px-3 py-2 rounded font-bold ${
                  agentLang === "en" ? "bg-blue-200 text-blue-700" : ""
                }`}
                onClick={() => {
                  setShowLangSelect(false);
                  window.location.reload();
                }}
              >
                English
              </button>
            </div>
          )}
        </div>
      </div>
      {/* بيانات العميل */}
      {chatRoom && (
        <div className="px-4 py-2 border-b bg-blue-50 text-blue-800 flex gap-4 items-center text-sm">
          <span>العميل: <b>{chatRoom.clientName}</b></span>
          <span>اللغة: <b>{chatRoom.clientLang === "ar" ? "العربية" : "English"}</b></span>
        </div>
      )}
      {/* قائمة العملاء المنتظرين */}
      {!chatRoom && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="mb-2 text-blue-700 font-bold">قائمة العملاء في الانتظار</div>
          {waitingRooms.length === 0 && <div className="text-blue-600">لا يوجد عملاء في الانتظار حاليًا.</div>}
          {waitingRooms.map(room => (
            <div key={room.id} className="w-full flex justify-between items-center bg-blue-50 border rounded-xl mb-2 px-4 py-2">
              <div>
                <div><b>{room.clientName}</b></div>
                <div className="text-xs text-blue-400">اللغة: {room.clientLang === "ar" ? "العربية" : "English"}</div>
              </div>
              <button
                className="agent-btn bg-blue-600 text-white px-5 py-2 rounded-full"
                onClick={() => handleAcceptChat(room)}
              >
                قبول المحادثة
              </button>
            </div>
          ))}
        </div>
      )}
      {/* الشات الفعلي */}
      {chatRoom && !chatRoom.waitingForAgent && (
        <div className="flex-1 flex flex-col">
          {/* الرسائل */}
          <div className="flex-1 px-5 py-4 overflow-y-auto flex flex-col-reverse" style={{ direction: agentLang === "ar" ? "rtl" : "ltr" }}>
            <div ref={chatEndRef} />
            {chatClosed ? (
              <div className="rounded-2xl px-4 py-3 mb-2 shadow max-w-[78%] mx-auto bg-yellow-50 border border-yellow-300 text-blue-800 text-center font-bold">
                تم اغلاق المحادثة من طرف العميل أو الموظف
              </div>
            ) : (
              messages.slice().reverse().map(renderMsgBubble)
            )}
          </div>
          {/* إدخال رسالة */}
          {!chatClosed && (
            <form
              onSubmit={e => {
                e.preventDefault();
                sendMessage();
              }}
              className="p-3 border-t flex items-center gap-2 bg-white"
            >
              <div className="relative">
                <button
                  type="button"
                  className="text-yellow-400 hover:text-yellow-600"
                  title="إضافة إيموجي"
                  onClick={() => setShowEmoji(v => !v)}
                  tabIndex={-1}
                >
                  <FaSmile size={22} />
                </button>
                {showEmoji && (
                  <div
                    className="fixed bottom-28 right-8 z-[9999]"
                    ref={emojiPickerRef}
                  >
                    <Picker
                      data={emojiData}
                      onEmojiSelect={handleSelectEmoji}
                      theme="light"
                      locale={agentLang}
                    />
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-blue-50 rounded-full px-4 py-2 outline-none text-blue-900 shadow border"
                placeholder={agentLang === "ar" ? "اكتب رسالة..." : "Type a message..."}
                value={input}
                onChange={e => setInput(e.target.value)}
                style={{ fontSize: "1rem" }}
                disabled={chatClosed}
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow"
                title={agentLang === "ar" ? "إرسال" : "Send"}
                disabled={chatClosed}
              >
                <FaPaperPlane />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}