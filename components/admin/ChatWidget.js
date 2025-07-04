"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  collection, query, orderBy, addDoc, serverTimestamp, onSnapshot, setDoc, doc, getDoc
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  FaPaperPlane, FaMicrophone, FaPaperclip, FaImage, FaFileAlt, FaTimes, FaSmile,
  FaCircle, FaUsers, FaWindowMaximize, FaWindowMinimize
} from "react-icons/fa";
import { firestore as db, storage } from "@/lib/firebase.client";
import EmojiPicker from "emoji-picker-react";

const notificationSend = typeof window !== "undefined" ? new Audio("/notification-send.mp3") : null;
const notificationReceive = typeof window !== "undefined" ? new Audio("/notification-receive.mp3") : null;

const DEFAULT_AVATAR = "/default-avatar.png";
const GROUP_AVATAR = "/chat-group.png";

function getSafeAvatar(avatar) {
  // لا تقبل empty string أو null أو undefined
  if (!avatar || typeof avatar !== "string" || avatar.trim() === "") return DEFAULT_AVATAR;
  return avatar;
}

function fixUser(user) {
  return {
    ...user,
    name: user?.name || "موظف",
    avatar: getSafeAvatar(user?.avatar),
    id: user?.id,
  };
}

export default function ChatWidget({ userId, userName, userAvatar }) {
  // --- UI State
  const [users, setUsers] = useState([]);
  const [online, setOnline] = useState({});
  const [selectedChat, setSelectedChat] = useState("main-room");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Notifications
  const [unread, setUnread] = useState({});
  // Window controls
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);

  // جلب الموظفين وحالة الأونلاين
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), snap => {
      const arr = snap.docs
        .map(doc => fixUser({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== userId && (
          u.role === "employee" || u.role === "admin" || u.role === "manager"
        ));
      setUsers(arr);
      let onlineMap = {};
      arr.forEach(u => { onlineMap[u.id] = !!u.online; });
      setOnline(onlineMap);
    });
    return unsub;
  }, [userId]);

  // جلب الرسائل (حسب الشات الحالي) + صوت الاستقبال
  useEffect(() => {
    let roomId;
    if (selectedChat === "main-room") {
      roomId = "main-room";
    } else {
      const members = [userId, selectedChat].sort();
      roomId = members.join("_");
    }
    const q = query(collection(db, "chatRooms", roomId, "messages"), orderBy("createdAt"));
    let prevMsgs = [];
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (prevMsgs.length && msgs.length > prevMsgs.length) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.senderId !== userId && notificationReceive) {
          notificationReceive.currentTime = 0;
          notificationReceive.play();
        }
      }
      prevMsgs = msgs;
      setMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      setUnread(u => ({ ...u, [selectedChat]: false }));
    });
    return unsub;
  }, [selectedChat, userId]);

  // راقب كل الشاتات الخاصة لو فيه رسالة جديدة (notifications)
  useEffect(() => {
    const unsubs = [];
    users.forEach(u => {
      const members = [userId, u.id].sort();
      const roomId = members.join("_");
      const q = query(collection(db, "chatRooms", roomId, "messages"), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(q, snap => {
        if (!snap.empty) {
          const lastMsg = snap.docs[0].data();
          if (
            lastMsg.senderId !== userId &&
            selectedChat !== u.id &&
            (!lastMsg.readBy || !lastMsg.readBy?.includes(userId))
          ) {
            setUnread(prev => ({ ...prev, [u.id]: true }));
            if (notificationReceive) {
              notificationReceive.currentTime = 0;
              notificationReceive.play();
            }
          }
        }
      });
      unsubs.push(unsub);
    });
    // الشات العام
    const qMain = query(collection(db, "chatRooms", "main-room", "messages"), orderBy("createdAt", "desc"));
    const unsubMain = onSnapshot(qMain, snap => {
      if (!snap.empty) {
        const lastMsg = snap.docs[0].data();
        if (
          lastMsg.senderId !== userId &&
          selectedChat !== "main-room" &&
          (!lastMsg.readBy || !lastMsg.readBy?.includes(userId))
        ) {
          setUnread(prev => ({ ...prev, ["main-room"]: true }));
          if (notificationReceive) {
            notificationReceive.currentTime = 0;
            notificationReceive.play();
          }
        }
      }
    });
    unsubs.push(unsubMain);

    return () => unsubs.forEach((unsub) => unsub());
  }, [users, userId, selectedChat]);

  // إرسال رسالة مع صوت إرسال
  const sendMessage = useCallback(async (
    msg = null,
    imageFile = null,
    fileDoc = null,
    audioBlob = null,
    type = "text"
  ) => {
    let roomId, targetId;
    if (selectedChat === "main-room") {
      roomId = "main-room";
      targetId = "main-room";
    } else {
      const members = [userId, selectedChat].sort();
      roomId = members.join("_");
      targetId = selectedChat;
      const roomRef = doc(db, "chatRooms", roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        const otherUser = users.find(u => u.id === selectedChat);
        await setDoc(roomRef, {
          members,
          membersInfo: [
            { id: userId, name: userName || "موظف", avatar: getSafeAvatar(userAvatar) },
            { id: otherUser.id, name: otherUser.name, avatar: getSafeAvatar(otherUser.avatar) }
          ],
          type: "private",
          createdAt: serverTimestamp(),
        });
      }
    }
    let data = {
      text: msg || "",
      senderId: userId,
      senderName: userName || "موظف",
      senderAvatar: getSafeAvatar(userAvatar),
      createdAt: serverTimestamp(),
      type,
      readBy: [userId],
    };
    if (imageFile) {
      const imageRef = storageRef(storage, `chats/${roomId}/images/${Date.now()}-${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const url = await getDownloadURL(imageRef);
      data = { ...data, type: "image", imageUrl: url };
    }
    if (fileDoc) {
      const fileRef = storageRef(storage, `chats/${roomId}/files/${Date.now()}-${fileDoc.name}`);
      await uploadBytes(fileRef, fileDoc);
      const url = await getDownloadURL(fileRef);
      data = { ...data, type: "file", fileUrl: url, fileName: fileDoc.name };
    }
    if (audioBlob) {
      const audioRef = storageRef(storage, `chats/${roomId}/audio/${Date.now()}.webm`);
      await uploadBytes(audioRef, audioBlob);
      const url = await getDownloadURL(audioRef);
      data = { ...data, type: "audio", audioUrl: url };
    }
    await addDoc(collection(db, "chatRooms", roomId, "messages"), data);
    setInput(""); setFile(null); setImage(null); setAudio(null);
    setUnread((u) => ({ ...u, [targetId]: false }));

    if (notificationSend) {
      notificationSend.currentTime = 0;
      notificationSend.play();
    }
  }, [selectedChat, userId, users, userName, userAvatar]);

  // فايل أو صورة
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type.startsWith("image")) setImage(f);
    else setFile(f);
    e.target.value = "";
  };

  // فويس نوت
  const handleRecord = async () => {
    if (!recording) {
      if (navigator.mediaDevices && window.MediaRecorder) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new window.MediaRecorder(stream);
        let chunks = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          setAudio(blob);
          sendMessage(null, null, null, blob, "audio");
          setRecording(false);
          stream.getTracks().forEach((track) => track.stop());
        };
        recorder.start();
        setMediaRecorder(recorder);
        setRecording(true);
      }
    } else {
      mediaRecorder?.stop();
      setRecording(false);
    }
  };

  useEffect(() => { if (image) sendMessage(null, image, null, null, "image"); }, [image, sendMessage]);
  useEffect(() => { if (file) sendMessage(null, null, file, null, "file"); }, [file, sendMessage]);

  const handleSelectChat = (id) => {
    setSelectedChat(id);
    setUnread((u) => ({ ...u, [id]: false }));
  };

  // --- معلومات الشات الحالي
  let chatTitle = "غرفة الموظفين العامة";
  let chatAvatar = GROUP_AVATAR;
  if (selectedChat !== "main-room") {
    const u = users.find(u => u.id === selectedChat);
    if (u) {
      chatTitle = u.name;
      chatAvatar = getSafeAvatar(u.avatar);
    }
  }

  const chatWidth = maximized ? "98vw" : 650;
  const chatHeight = maximized ? "90vh" : 540;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-8 right-8 bg-emerald-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-xl z-[1200]"
        title="فتح المحادثة"
        style={{ cursor: "pointer" }}
      >
        <FaUsers size={32} />
      </button>
    );
  }

  return (
    <div className="fixed z-[1100] flex rounded-2xl shadow-2xl overflow-hidden bg-white"
         style={{ width: chatWidth, height: chatHeight, minHeight: 320, maxWidth: "98vw", maxHeight: "90vh", bottom: 8, right: 8 }}>
      {/* القائمة الجانبية */}
      <aside className="bg-gradient-to-b from-emerald-800 via-emerald-900 to-blue-900 w-56 flex flex-col border-l border-emerald-900 p-0">
        <div className="flex items-center gap-2 py-4 px-3 border-b border-emerald-900">
          <FaUsers className="text-emerald-400" />
          <span className="text-white font-bold">الدردشات</span>
        </div>
        <ul className="flex-1 overflow-y-auto py-2">
          {/* الشات العام */}
          <li
            className={`flex items-center gap-3 px-4 py-2 rounded cursor-pointer transition ${selectedChat === "main-room" ? "bg-emerald-700/60" : "hover:bg-emerald-700/40"}`}
            style={{ cursor: "pointer" }}
            onClick={() => handleSelectChat("main-room")}
            title="الشات العام"
          >
            <Image src={GROUP_AVATAR} alt="الشات العام" width={32} height={32} className="w-8 h-8 rounded-full border-2 border-white bg-white object-cover" />
            <span className="text-white font-bold">الشات العام</span>
            {unread["main-room"] && (
              <span className="ml-auto inline-block w-3 h-3 rounded-full bg-red-500 border-2 border-white animate-pulse"></span>
            )}
          </li>
          {/* قائمة الموظفين */}
          {users.map((u) => (
            <li
              key={u.id}
              className={`flex items-center gap-3 px-4 py-2 rounded cursor-pointer transition ${selectedChat === u.id ? "bg-emerald-700/60" : "hover:bg-emerald-700/40"}`}
              style={{ cursor: "pointer" }}
              onClick={() => handleSelectChat(u.id)}
              title={`محادثة مع ${u.name}`}
            >
              <Image src={getSafeAvatar(u.avatar)} alt={u.name} width={32} height={32} className="w-8 h-8 rounded-full border-2 border-white bg-white object-cover" />
              <span className="text-white font-semibold">{u.name}</span>
              <FaCircle className={online[u.id] ? "text-green-400" : "text-gray-400"} size={11} />
              {unread[u.id] && (
                <span className="ml-auto inline-block w-3 h-3 rounded-full bg-red-500 border-2 border-white animate-pulse"></span>
              )}
            </li>
          ))}
        </ul>
      </aside>
      {/* منطقة المحادثة */}
      <div className="flex-1 flex flex-col bg-[#16222c]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-800 bg-gradient-to-l from-emerald-900 to-blue-900">
          <div className="flex items-center gap-2">
            <Image src={getSafeAvatar(chatAvatar)} alt={chatTitle} width={32} height={32} className="w-8 h-8 rounded-full border-2 border-white bg-white object-cover" />
            <span className="text-emerald-200 font-bold text-base">{chatTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMaximized(v => !v)}
                    className="text-white mx-1 cursor-pointer"
                    title={maximized ? "تصغير" : "تكبير"}
                    style={{ cursor: "pointer" }}>
              {maximized ? <FaWindowMinimize /> : <FaWindowMaximize />}
            </button>
            <button onClick={() => setMinimized(true)}
                    className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full w-7 h-7 flex items-center justify-center shadow border border-yellow-600 cursor-pointer"
                    title="تصغير المحادثة" style={{ cursor: "pointer" }}>
              <span style={{ fontWeight: 900, fontSize: 18 }}>–</span>
            </button>
            <button onClick={() => setMinimized(true)}
                    className="bg-red-500 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow border border-red-800 cursor-pointer"
                    title="إغلاق المحادثة" style={{ cursor: "pointer" }}>
              <FaTimes />
            </button>
          </div>
        </div>
        {/* الرسائل */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === userId ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-2xl px-4 py-2 max-w-[70%] break-words relative ${msg.senderId === userId ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-900"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Image src={getSafeAvatar(msg.senderAvatar)} alt={msg.senderName || "موظف"} width={28} height={28} className="w-7 h-7 rounded-full bg-white object-cover" />
                  <span className="text-xs font-bold">{msg.senderName || "موظف"}</span>
                </div>
                {msg.type === "text" ? <span>{msg.text}</span> : null}
                {msg.type === "image" && (<a href={msg.imageUrl} target="_blank" rel="noopener noreferrer"><Image src={msg.imageUrl} alt="img" width={120} height={120} className="max-w-[120px] max-h-[120px] rounded-lg border mt-1" /></a>)}
                {msg.type === "file" && (<a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-800 underline mt-1"><FaFileAlt /> <span>{msg.fileName || "ملف مرفق"}</span></a>)}
                {msg.type === "audio" && (<audio controls src={msg.audioUrl} className="mt-1" />)}
                <div className="text-[10px] text-gray-400 mt-1 text-left">{msg.senderName || "موظف"}</div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {/* الإدخال */}
        <form className="border-t border-emerald-800 p-3 flex items-center gap-2 relative bg-[#22304a]"
          onSubmit={async (e) => { e.preventDefault(); if (!input.trim()) return; await sendMessage(input.trim()); setInput(""); }}>
          <div className="relative">
            <button type="button" className="text-yellow-300 hover:text-yellow-500 cursor-pointer" style={{ cursor: "pointer" }} title="إضافة إيموجي" onClick={() => setShowEmoji((v) => !v)} tabIndex={-1}><FaSmile size={22} /></button>
            {showEmoji && (
              <div className="fixed bottom-28 right-8 z-[9999]">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setInput((prev) => prev + emojiData.emoji);
                    setShowEmoji(false);
                    inputRef.current?.focus();
                  }}
                  theme="dark"
                  locale="ar"
                />
              </div>
            )}
          </div>
          <label className="cursor-pointer text-emerald-400 hover:text-emerald-600"><FaPaperclip size={22} /><input type="file" className="hidden" onChange={handleFileChange} title="إرفاق ملف" /></label>
          <label className="cursor-pointer text-emerald-400 hover:text-emerald-600"><FaImage size={22} /><input type="file" accept="image/*" className="hidden" onChange={handleFileChange} title="إرفاق صورة" /></label>
          <button type="button" onClick={handleRecord} className={`text-emerald-400 hover:text-emerald-600 cursor-pointer ${recording ? "animate-pulse text-red-600" : ""}`} style={{ cursor: "pointer" }} title={recording ? "جارٍ التسجيل..." : "تسجيل صوتي"}><FaMicrophone size={22} /></button>
          <input ref={inputRef} type="text" className="flex-1 bg-[#22304a] rounded-full px-4 py-2 outline-none text-white" placeholder="اكتب رسالة..." value={input} onChange={(e) => setInput(e.target.value)} />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full w-10 h-10 flex items-center justify-center cursor-pointer" style={{ cursor: "pointer" }} title="إرسال"><FaPaperPlane /></button>
        </form>
      </div>
    </div>
  );
}