"use client";
import { useEffect, useRef, useState } from "react";
import {
  getDatabase,
  ref as dbRef,
  push,
  onValue,
  update,
  get,
  set,
  remove,
} from "firebase/database";
import {
  FaPaperPlane,
  FaSmile,
} from "react-icons/fa";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

export default function ChatWidgetClient({ clientId, clientName }) {
  const db = getDatabase();

  // بيانات حالة الشات
  const [chatRoom, setChatRoom] = useState(null); // بيانات غرفة الشات
  const [messages, setMessages] = useState([]);   // الرسائل
  const [input, setInput] = useState("");         // النص
  const [showEmoji, setShowEmoji] = useState(false);
  const [chatClosed, setChatClosed] = useState(false);

  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // البحث أو إنشاء غرفة الشات لهذا العميل (مرة واحدة فقط)
  useEffect(() => {
    const chatsRef = dbRef(db, "chats");
    // البحث عن شات مفتوح بنفس clientId
    const unsub = onValue(chatsRef, (snap) => {
      let found = null;
      snap.forEach((room) => {
        const c = { ...room.val(), id: room.key };
        if (c.clientId === clientId && c.status === "open") found = c;
      });
      setChatRoom(found);
      setChatClosed(false);
    });
    return () => unsub();
  }, [clientId]);

  // مراقبة الرسائل
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

  // إرسال رسالة نصية
  const sendMessage = async () => {
    if (!chatRoom || !input.trim() || chatClosed) return;
    await push(dbRef(db, `chats/${chatRoom.id}/messages`), {
      senderId: clientId,
      senderName: clientName || "عميل",
      senderType: "client",
      text: input,
      type: "text",
      createdAt: Date.now(),
    });
    setInput("");
  };

  // بدء شات جديد (أول رسالة)
  const startChat = async () => {
    if (!input.trim()) return;
    // إنشاء غرفة جديدة
    const chatData = {
      clientId,
      clientName: clientName || "عميل",
      status: "open",
      waitingForAgent: true,
      createdAt: Date.now(),
    };
    const roomRef = push(dbRef(db, "chats"), chatData);
    await set(dbRef(db, `chats/${roomRef.key}/messages/first`), {
      senderId: clientId,
      senderName: clientName || "عميل",
      senderType: "client",
      text: input,
      type: "text",
      createdAt: Date.now(),
    });
    setInput("");
  };

  // غلق الشات من العميل
  const handleCloseChat = async () => {
    if (!chatRoom) return;
    await push(dbRef(db, `chats/${chatRoom.id}/messages`), {
      text: "تم اغلاق المحادثة من طرف العميل",
      type: "system",
      createdAt: Date.now(),
    });
    await update(dbRef(db, `chats/${chatRoom.id}`), { status: "closed_by_client" });
    setChatClosed(true);
  };

  // إدراج إيموجي
  const handleSelectEmoji = (emoji) => {
    setInput((prev) => prev + emoji.native);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // عرض الرسائل
  function renderMsgBubble(msg) {
    let bubbleClass =
      "rounded-2xl px-4 py-3 mb-2 shadow transition-all max-w-[78%] whitespace-pre-line break-words";
    let self = msg.senderType === "client";
    if (msg.type === "system") {
      bubbleClass += " bg-yellow-50 text-blue-800 border border-blue-200 mx-auto";
    } else if (self) {
      bubbleClass += " bg-gradient-to-br from-green-400 to-green-500 text-white ml-auto self-end";
    } else {
      bubbleClass += " bg-white text-blue-900 border border-blue-200 self-start";
    }
    return (
      <div className={bubbleClass} key={msg.id}>
        {["text", "system"].includes(msg.type) && <span>{msg.text}</span>}
        <div className="text-[10px] text-blue-400 mt-1 text-left ltr:text-left rtl:text-right">
          {msg.type !== "system" ? msg.senderName : "النظام"}
          {" · "}
          {msg.createdAt
            ? new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
            : ""}
        </div>
      </div>
    );
  }

  // منطق الواجهة
  // 1- لو لا يوجد شات بعد: عرض واجهة بدء الشات
  // 2- لو يوجد شات && waitingForAgent: عرض شاشة الانتظار
  // 3- لو يوجد شات && تم القبول: عرض الشات
  // 4- لو الشات مغلق: عرض تنبيه الإغلاق

  return (
    <div
      className="h-full w-full flex flex-col rounded-2xl shadow-lg border border-green-900"
      style={{
        minHeight: "400px",
        maxWidth: 400,
        background:
          "linear-gradient(120deg, #eaffea 60%, #e0ffe7 100%)",
      }}
    >
      <style>{`
        .client-btn:hover, .client-btn:focus { background: #e6f4fa; cursor: pointer; }
        .client-close:hover, .client-close:focus { background: #ef4444; color: white; cursor: pointer; }
        button, .cursor-pointer, [role="button"] { cursor: pointer !important; }
      `}</style>
      <div className="flex items-center justify-between px-4 py-2 border-b border-green-800 bg-gradient-to-l from-green-100 to-white rounded-t-2xl">
        <span className="text-lg font-bold text-green-700 tracking-wide">
          خدمة الدعم الفني
        </span>
        {chatRoom && !chatClosed && (
          <button
            className="client-close bg-red-100 text-red-700 px-3 py-1 rounded-full shadow text-sm font-bold border border-red-200 transition"
            onClick={handleCloseChat}
          >
            إنهاء
          </button>
        )}
      </div>
      {/* لا يوجد شات بعد */}
      {!chatRoom && (
        <form
          className="flex-1 flex flex-col items-center justify-center gap-2 p-8"
          onSubmit={e => {
            e.preventDefault();
            startChat();
          }}
        >
          <div className="mb-2 text-green-700 font-bold">ابدأ محادثة جديدة</div>
          <input
            type="text"
            className="border rounded-full px-4 py-2 w-full max-w-xs outline-none"
            placeholder="اكتب رسالتك الأولى..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" className="client-btn bg-green-600 text-white px-5 py-2 rounded-full mt-2">
            إرسال
          </button>
        </form>
      )}
      {/* شاشة الانتظار */}
      {chatRoom && chatRoom.waitingForAgent && !chatClosed && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <div className="animate-pulse text-green-800 font-bold text-xl mb-3">
            جاري الانتظار لربطك بأحد الموظفين...
          </div>
          <div className="text-green-500 text-sm">سيتم فتح الدردشة تلقائيًا عند قبول موظف لطلبك.</div>
          <button
            className="client-close bg-red-100 text-red-700 px-3 py-1 rounded-full shadow text-sm font-bold border border-red-200 transition mt-3"
            onClick={handleCloseChat}
          >
            إلغاء الطلب
          </button>
        </div>
      )}
      {/* الشات الفعلي */}
      {chatRoom && !chatRoom.waitingForAgent && (
        <div className="flex-1 flex flex-col">
          {/* الرسائل */}
          <div className="flex-1 px-5 py-4 overflow-y-auto flex flex-col-reverse" style={{ direction: "rtl" }}>
            <div ref={chatEndRef} />
            {chatClosed ? (
              <div className="rounded-2xl px-4 py-3 mb-2 shadow max-w-[78%] mx-auto bg-yellow-50 border border-yellow-300 text-green-800 text-center font-bold">
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
                      locale="ar"
                    />
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-green-50 rounded-full px-4 py-2 outline-none text-green-900 shadow border"
                placeholder="اكتب رسالة..."
                value={input}
                onChange={e => setInput(e.target.value)}
                style={{ fontSize: "1rem" }}
                disabled={chatClosed}
              />
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow"
                title="إرسال"
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