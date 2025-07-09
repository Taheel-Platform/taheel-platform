"use client";
import { useEffect, useRef, useState } from "react";
import {
  getDatabase,
  ref as dbRef,
  push,
  onValue,
  update,
  remove,
  get,
} from "firebase/database";
import {
  FaPaperPlane,
  FaMicrophone,
  FaPaperclip,
  FaImage,
  FaSmile,
} from "react-icons/fa";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

// تحويل Blob (الصوت) إلى base64
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// جلب الشاتات المعينة أو المنتظرة (مراقبة حيّة)
function listenEmployeeChats(userId, setChats, setSelectedChat) {
  const db = getDatabase();
  const chatsRef = dbRef(db, "chats");
  return onValue(chatsRef, (snap) => {
    const list = [];
    snap.forEach((room) => {
      const c = { ...room.val(), id: room.key };
      if (
        c.status === "open" &&
        (c.assignedTo === userId ||
          (c.waitingForAgent && !c.assignedTo))
      ) {
        list.push(c);
      }
    });
    // ترتيب تنازلي حسب createdAt
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setChats(list);
  });
}

// حذف غرفة الشات ورسائلها بالكامل
async function deleteChatRoomAndMessages(roomId) {
  const db = getDatabase();
  try {
    await remove(dbRef(db, `chats/${roomId}/messages`));
    await remove(dbRef(db, `chats/${roomId}`));
  } catch {}
}

export default function EmployeeMessenger({ userId, lang }) {
  const db = getDatabase();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [clientInfo, setClientInfo] = useState(null);
  const [chatClosed, setChatClosed] = useState(false);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // غلق الـ Emoji picker عند الضغط خارجها
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmoji]);

  // مراقبة الشاتات
  useEffect(() => {
    if (!userId) return;
    const unsub = listenEmployeeChats(userId, setChats, setSelectedChat);
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [userId]);

  // مراقبة الرسائل وحالة الشات الحالي
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setClientInfo(null);
      setChatClosed(false);
      return;
    }
    (async () => {
      if (selectedChat.clientId) {
        const userSnap = await get(dbRef(db, "users/" + selectedChat.clientId));
        setClientInfo(userSnap.exists() ? userSnap.val() : null);
      }
    })();

    const msgsRef = dbRef(db, `chats/${selectedChat.id}/messages`);
    const unsubMsgs = onValue(msgsRef, (snap) => {
      const msgs = [];
      snap.forEach((d) => {
        msgs.push({ ...d.val(), id: d.key });
      });
      msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(msgs);
      const closedMsg = msgs.find(
        (msg) =>
          msg.type === "system" &&
          (msg.text === "تم اغلاق المحادثة من طرف العميل" ||
            msg.text === "تم اغلاق المحادثة من طرف الموظف")
      );
      setChatClosed(!!closedMsg);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    });

    const chatRef = dbRef(db, `chats/${selectedChat.id}`);
    const unsubChat = onValue(chatRef, async (d) => {
      const room = d.val();
      if (!room) return;
      const status = room.status;
      if (status === "closed_by_client" || status === "closed_by_employee") {
        const msgsSnap = await get(dbRef(db, `chats/${selectedChat.id}/messages`));
        let closedMsg = false;
        msgsSnap.forEach((m) => {
          const data = m.val();
          if (
            data.type === "system" &&
            (data.text === "تم اغلاق المحادثة من طرف العميل" ||
              data.text === "تم اغلاق المحادثة من طرف الموظف")
          ) {
            closedMsg = true;
          }
        });
        if (!closedMsg) {
          await push(dbRef(db, `chats/${selectedChat.id}/messages`), {
            text:
              status === "closed_by_client"
                ? "تم اغلاق المحادثة من طرف العميل"
                : "تم اغلاق المحادثة من طرف الموظف",
            type: "system",
            createdAt: Date.now(),
          });
        }
        setChatClosed(true);
        setTimeout(async () => {
          await deleteChatRoomAndMessages(selectedChat.id);
          setSelectedChat(null);
          setClientInfo(null);
          setChatClosed(false);
        }, 2000);
      }
    });

    return () => {
      unsubMsgs();
      unsubChat();
    };
    // eslint-disable-next-line
  }, [selectedChat]);

  // إرسال رسالة أو مرفق كـ base64 (صورة/صوت)
  const sendMessage = async (type = "text", content = {}) => {
    if (!selectedChat) return;
    setUploading(true);
    let data = {
      senderId: userId || "unknown",
      senderName: "موظف",
      senderType: "employee",
      createdAt: Date.now(),
      type,
      ...content,
    };
    await push(dbRef(db, `chats/${selectedChat.id}/messages`), data);
    setInput("");
    setImagePreview(null);
    setAudioBlob(null);
    setUploading(false);
  };

  // رفع صورة (Base64)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // تسجيل صوتي (Base64)
  const handleRecord = async () => {
    if (!recording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      let chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } else {
      mediaRecorder?.stop();
      setRecording(false);
    }
  };

  // إرسال الرسالة عند الضغط على زر الإرسال
  async function handleSend(e) {
    e.preventDefault();
    if (chatClosed || uploading || (!input && !imagePreview && !audioBlob)) return;
    if (imagePreview) {
      await sendMessage("image", { imageBase64: imagePreview });
      setImagePreview(null);
      return;
    }
    if (audioBlob) {
      const audioBase64 = await blobToBase64(audioBlob);
      await sendMessage("audio", { audioBase64 });
      setAudioBlob(null);
      return;
    }
    if (input.trim()) {
      await sendMessage("text", { text: input });
      setInput("");
    }
  }

  // استلام الشات (لو منتظر)
  async function handleAcceptChat(chatId) {
    if (!userId) {
      alert("حدث خطأ: معرف الموظف غير متوفر! يرجى إعادة تحميل الصفحة أو التواصل مع الدعم.");
      console.error("userId is undefined/null in handleAcceptChat");
      return;
    }
    await update(dbRef(db, `chats/${chatId}`), {
      waitingForAgent: false,
      assignedTo: userId,
      agentAccepted: true,
      agentName: "موظف",
    });
  }

  // إنهاء الشات (من الموظف)
  async function handleCloseChat() {
    if (!selectedChat) return;
    await push(dbRef(db, `chats/${selectedChat.id}/messages`), {
      text: "تم اغلاق المحادثة من طرف الموظف",
      type: "system",
      createdAt: Date.now(),
    });
    await update(dbRef(db, `chats/${selectedChat.id}`), { status: "closed_by_employee" });
    setSelectedChat(null);
    setClientInfo(null);
    setChatClosed(false);
  }

  const handleSelectEmoji = (emoji) => {
    setInput((prev) => prev + emoji.native);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  function renderMsgBubble(msg) {
  let bubbleClass = "rounded-2xl px-4 py-3 mb-2 shadow transition-all max-w-[78%] whitespace-pre-line break-words";
  let self = msg.senderId === userId;
  if (msg.type === "system") {
    bubbleClass += " bg-yellow-50 text-blue-800 border border-blue-200 mx-auto";
  } else if (self) {
    bubbleClass += " bg-gradient-to-br from-blue-500 to-blue-400 text-white ml-auto self-end";
  } else {
    bubbleClass += " bg-white text-blue-900 border border-blue-200 self-start";
  }
  return (
    <div className={bubbleClass} key={msg.id}>
      {/* نص */}
      {["text", "system"].includes(msg.type) && <span>{msg.text}</span>}

      {/* صورة */}
      {msg.type === "image" && (
        <a
          href={msg.imageBase64}
          download={`image_${msg.id}.jpg`}
          target="_blank"
          rel="noopener noreferrer"
          title="تحميل الصورة"
          style={{ display: "inline-block", marginTop: 4 }}
        >
          <img
            src={msg.imageBase64}
            alt="img"
            className="max-w-[160px] max-h-[160px] rounded-lg border mt-1"
            style={{ cursor: "pointer" }}
          />
        </a>
      )}

      {/* صوت */}
      {msg.type === "audio" && (
        <div>
          <audio controls src={msg.audioBase64} className="mt-1" />
          <a
            href={msg.audioBase64}
            download={`voice_${msg.id}.webm`}
            className="text-blue-500 underline text-xs ml-2"
            style={{ display: "inline-block", marginTop: 4 }}
            title="تحميل الصوت"
          >
            تحميل الصوت
          </a>
        </div>
      )}

      {/* ملف أو مستند عام */}
      {msg.type === "file" && (
        <div className="mt-2">
          <a
            href={msg.fileBase64 || msg.fileUrl}
            download={msg.fileName || `file_${msg.id}`}
            className="text-blue-600 underline font-bold"
            target="_blank"
            rel="noopener noreferrer"
            title="تحميل الملف"
          >
            <FaPaperclip className="inline mr-1" />
            {msg.fileName || "تحميل الملف"}
          </a>
        </div>
      )}

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

  // لا ترسم إلا إذا كان userId موجود (حماية إضافية)
  if (!userId) {
    return (
      <div className="text-center py-8 text-blue-500">
        لا يمكن تحميل المحادثات: معرف الموظف غير متوفر.
      </div>
    );
  }

  return (
    <div
      className="h-full w-full flex flex-col rounded-2xl shadow-lg border border-blue-900"
      style={{
        minHeight: "540px",
        maxHeight: "calc(100vh - 40px)",
        background: "linear-gradient(120deg, #e5f1ff 60%, #e0e7ff 100%)"
      }}
    >
      <style>{`
        .emp-btn:hover, .emp-btn:focus { background: #e6f4fa; cursor: pointer; }
        .emp-action:hover, .emp-action:focus { background: #d1fae5; cursor: pointer; }
        .emp-send:hover, .emp-send:focus { background: #2563eb; color: white; cursor: pointer; }
        .emp-accept:hover, .emp-accept:focus { background: #3b82f6; cursor: pointer; }
        .emp-close:hover, .emp-close:focus { background: #ef4444; color: white; cursor: pointer; }
        .emp-bubble:hover { filter: brightness(0.98); }
        button, .cursor-pointer, [role="button"] { cursor: pointer !important; }
      `}</style>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-blue-800 bg-gradient-to-l from-blue-100 to-white rounded-t-2xl">
        <span className="text-lg font-bold text-blue-700 tracking-wide">محادثات العملاء</span>
        <button
          onClick={() => setMinimized((v) => !v)}
          className="emp-btn bg-white text-blue-700 px-3 py-1 rounded-lg border border-gray-200 shadow-sm transition"
          style={{ fontWeight: 900, fontSize: 18 }}
        >
          {minimized ? "▲" : "▼"}
        </button>
      </div>
      {!minimized && (
        <div className="flex-1 flex overflow-hidden" style={{ minHeight: "440px" }}>
          {/* القائمة الجانبية */}
          <div className="w-64 border-r border-blue-800 bg-[#f0f7ff] p-3 overflow-y-auto">
            <div className="font-bold text-blue-700 text-base mb-4">قائمة المحادثات</div>
            {chats.length === 0 && <div className="text-blue-300 text-sm">لا يوجد شاتات.</div>}
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`p-2 rounded-xl cursor-pointer mb-3 border transition-all emp-btn
                  ${selectedChat?.id === chat.id
                    ? "bg-[#e0e7ff] border-[#60a5fa]"
                    : chat.waitingForAgent
                    ? "bg-[#e0f2fe] border-[#93c5fd]"
                    : "hover:bg-[#e3e6fc] border-transparent"
                  }`}
                onClick={() => setSelectedChat(chat)}
                style={{ minHeight: 62 }}
              >
                <div className="font-bold text-blue-800">{chat.clientId}</div>
                <div className="text-xs text-blue-400 truncate">
                  {chat.lastMessage?.text
                    ? chat.lastMessage.text
                    : "بدون رسائل"}
                </div>
                {chat.waitingForAgent && (
                  <button
                    className="mt-2 emp-accept bg-blue-400 text-white px-3 py-1 rounded-full text-xs shadow transition border border-blue-400"
                    style={{ cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); handleAcceptChat(chat.id); }}
                  >
                    استلام الشات
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* الشات */}
          <div className="flex-1 flex flex-col relative">
            {!selectedChat && (
              <div className="flex-1 flex items-center justify-center text-blue-300 text-xl font-semibold">
                اختر محادثة من القائمة
              </div>
            )}
            {selectedChat && (
              <>
                <div className="border-b px-6 py-3 flex items-center justify-between bg-blue-50">
                  <div>
                    <span className="font-bold text-lg text-blue-700">{clientInfo?.name || selectedChat.clientId}</span>
                    {clientInfo && (
                      <span className="ml-2 text-xs text-blue-400">({clientInfo.type || "عميل"})</span>
                    )}
                  </div>
                  <button
                    className="emp-close bg-red-100 text-red-700 px-4 py-2 rounded-full shadow text-sm font-bold border border-red-200 transition"
                    onClick={handleCloseChat}
                    style={{ cursor: "pointer" }}
                  >
                    إنهاء الشات
                  </button>
                </div>
                <div className="flex-1 px-5 py-4 overflow-y-auto flex flex-col-reverse chat-bg-grad" style={{ direction: "rtl" }}>
                  <div ref={chatEndRef} />
                  {chatClosed ? (
                    <div className="rounded-2xl px-4 py-3 mb-2 shadow max-w-[78%] mx-auto bg-yellow-50 border border-yellow-300 text-blue-800 text-center font-bold">
                      تم اغلاق المحادثة من طرف العميل أو الموظف
                    </div>
                  ) : (
                    messages.slice().reverse().map(renderMsgBubble)
                  )}
                </div>
                {!chatClosed && (
                  <form onSubmit={handleSend} className="p-3 border-t flex items-center gap-2 bg-white">
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
                    <label className="cursor-pointer text-blue-400 hover:text-blue-600">
                      <FaPaperclip size={22} />
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        title="إرفاق ملف أو مستند أو صورة"
                        disabled={uploading}
                      />
                    </label>
                    <label className="cursor-pointer text-blue-400 hover:text-blue-600">
                      <FaImage size={22} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        title="إرفاق صورة"
                        disabled={uploading}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRecord}
                      className={`text-blue-400 hover:text-blue-600 ${recording ? "animate-pulse text-red-600" : ""}`}
                      title={recording ? "جارٍ التسجيل..." : "تسجيل صوتي"}
                      disabled={uploading}
                    >
                      <FaMicrophone size={22} />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      className="flex-1 bg-blue-50 rounded-full px-4 py-2 outline-none text-blue-900 shadow border"
                      placeholder="اكتب رسالة..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={recording || uploading}
                      style={{ fontSize: "1rem" }}
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow"
                      title="إرسال"
                      disabled={uploading}
                    >
                      <FaPaperPlane />
                    </button>
                    {(imagePreview || audioBlob) && (
                      <span className="ml-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded flex items-center">
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}