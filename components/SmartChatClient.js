"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase.client";
import {
  collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, updateDoc
} from "firebase/firestore";
import { FaPaperPlane } from "react-icons/fa";

// الأسئلة الشائعة
const FAQ = [
  { q: "ما هي ساعات العمل", a: "ساعات العمل من 8 صباحاً حتى 5 مساءً من الأحد للخميس." },
  { q: "كيف أستخرج بطاقة", a: "يرجى تعبئة النموذج على المنصة وسيتم التواصل معك خلال 24 ساعة." },
  { q: "ما هي طرق الدفع المتاحة", a: "نوفر الدفع بالبطاقات البنكية والتحويل البنكي." },
  // ... أضف المزيد من الأسئلة حسب الحاجة
];

export default function SmartChatClient({ userId, userName, roomId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [agentAccepted, setAgentAccepted] = useState(false);
  const [noBotHelpCount, setNoBotHelpCount] = useState(0);
  const [selectedQuick, setSelectedQuick] = useState(false);
  const chatEndRef = useRef(null);

  // متابعة الرسائل + حالة الطلب للموظف من الفايربيز
  useEffect(() => {
    if (!roomId) return;
    const msgsQ = query(
      collection(db, "chatRooms", roomId, "messages"),
      orderBy("createdAt")
    );
    const unsubMsgs = onSnapshot(msgsQ, (snap) => {
      setMessages(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    // مراقبة حالة الطلب لموظف
    const roomDoc = doc(db, "chatRooms", roomId);
    const unsubRoom = onSnapshot(roomDoc, (d) => {
      if (d.exists()) {
        setWaitingForAgent(d.data().waitingForAgent || false);
        setAgentAccepted(d.data().agentAccepted || false);
      }
    });

    return () => {
      unsubMsgs();
      unsubRoom();
    };
  }, [roomId]);

  async function sendMessage(msg, type = "text") {
    await addDoc(collection(db, "chatRooms", roomId, "messages"), {
      text: msg,
      senderId: userId,
      senderName: userName,
      createdAt: serverTimestamp(),
      type,
    });
  }

  // الرد الذكي مع عداد المحاولات
  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;

    // أضف رسالة العميل
    await sendMessage(question, "text");

    // لو في انتظار موظف/أو معه موظف، أرسل فقط الرسالة (لا ترد تلقائي)
    if (waitingForAgent || agentAccepted) {
      setInput("");
      return;
    }

    // ابحث عن رد تلقائي
    let found = FAQ.find(f =>
      question.includes(f.q) || f.q.includes(question)
    );

    if (found) {
      await sendMessage(found.a, "bot");
      setNoBotHelpCount(0);
    } else {
      await sendMessage("عذراً لم أجد إجابة لسؤالك. لو ما زلت بحاجة للمساعدة اضغط زر التواصل مع الموظف.", "bot");
      setNoBotHelpCount(count => count + 1);
    }
    setInput("");
  }

  // عند الضغط على سؤال مقترح
  async function handleQuickQuestion(q) {
    setSelectedQuick(true);
    setInput(q);
    await sendMessage(q, "text");
    let found = FAQ.find(f => q.includes(f.q) || f.q.includes(q));
    if (found) {
      await sendMessage(found.a, "bot");
      setNoBotHelpCount(0);
    } else {
      await sendMessage("عذراً لم أجد إجابة لسؤالك. لو ما زلت بحاجة للمساعدة اضغط زر التواصل مع الموظف.", "bot");
      setNoBotHelpCount(count => count + 1);
    }
    setInput("");
  }

  // زر طلب موظف
  async function requestAgent() {
    await updateDoc(doc(db, "chatRooms", roomId), {
      waitingForAgent: true,
      agentAccepted: false,
    });
  }

  return (
    <div className="fixed bottom-28 right-6 z-[1000] w-full max-w-lg h-[520px] flex flex-col bg-[#16222c] rounded-xl shadow-2xl border border-emerald-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-emerald-800 text-emerald-300 font-bold flex items-center gap-2">
        <span>الدردشة الذكية</span>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === userId ? "justify-end" : "justify-start"}`}>
            <div
              className={`rounded-2xl px-4 py-2 max-w-[70%] break-words relative ${
                msg.type === "bot"
                  ? "bg-yellow-200 text-gray-900"
                  : msg.senderId === userId
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              <span>{msg.text}</span>
              <div className="text-[10px] text-gray-400 mt-1">
                {msg.type === "bot" ? "المساعد الذكي" : msg.senderName}
              </div>
            </div>
          </div>
        ))}
        {/* رسالة الانتظار عند طلب موظف */}
        {waitingForAgent && !agentAccepted && (
          <div className="flex justify-center">
            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl text-center font-semibold animate-pulse">
              يرجى الانتظار سوف يتم تحويل الدردشة الى موظف خدمة العملاء للرد عليكم في أقرب وقت...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
        {/* خيارات الأسئلة الشائعة كأزرار */}
        {!waitingForAgent && !agentAccepted && !selectedQuick && (
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {FAQ.map(f => (
              <button
                key={f.q}
                onClick={() => handleQuickQuestion(f.q)}
                className="bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-full px-4 py-2 text-sm font-semibold shadow"
              >
                {f.q}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Input + زر طلب موظف يظهر فقط بعد عدة محاولات فاشلة */}
      <form className="border-t border-emerald-800 p-3 flex items-center gap-2 bg-[#1a2c3a]" onSubmit={handleSend}>
        <input
          type="text"
          className="flex-1 bg-[#22304a] rounded-full px-4 py-2 outline-none text-white"
          placeholder={waitingForAgent && !agentAccepted ? "يرجى الانتظار..." : "اكتب سؤالك..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={waitingForAgent && !agentAccepted}
        />
        <button
          type="submit"
          disabled={waitingForAgent && !agentAccepted}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full w-10 h-10 flex items-center justify-center"
          title="إرسال"
        >
          <FaPaperPlane />
        </button>
        {/* زر طلب موظف يظهر فقط بعد عدة محاولات فاشلة */}
        {!waitingForAgent && !agentAccepted && noBotHelpCount >= 2 && (
          <button
            type="button"
            onClick={requestAgent}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full px-3 py-2 flex items-center justify-center font-bold text-sm ml-2"
            title="اتواصل مع الموظف"
          >
            اتواصل مع الموظف
          </button>
        )}
      </form>
    </div>
  );
}