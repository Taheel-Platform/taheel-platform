import React, { useState } from "react";
import LanguageSelectModal from "./LanguageSelectModal";
import ChatComponent from "./ChatComponent";
import countriesLangArr from "src/lib/countriesLang.js";

// تجهيز كائنات للمودال: labels & langMap
const countriesLabels = {};
const countriesLangMap = {};
countriesLangArr.forEach(c => {
  countriesLabels[c.code] = `${c.flag} ${c.name}`;
  countriesLangMap[c.code] = c.lang;
});

export default function ChatParent({ userName = "زائر" }) {
  const [lang, setLang] = useState(null);
  const [country, setCountry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showModal, setShowModal] = useState(true);

  // عند اختيار اللغة والدولة من المودال
const handleLanguageSelect = async (selectedLang, selectedCountry) => {
  setLang(selectedLang);
  setCountry(selectedCountry);
  setShowModal(false);

  // اطلب من backend رسالة ترحيب تلقائية من OpenAI
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `اكتب رسالة ترحيب احترافية وودية للعميل الجديد باسم "${userName}" في منصة تأهيل، ورد باللغة المناسبة للبلد المختار.`, // prompt عام لو عربي، يمكنك جعله إنجليزي أو فرنسي حسب اللغة المختارة
        lang: selectedLang,
        country: selectedCountry,
        userName: userName,
        isWelcome: true
      }),
    });
    const data = await res.json();
    setMessages([
      { role: "assistant", content: data.text }
    ]);
  } catch (err) {
    setMessages([
      { role: "assistant", content: "حدث خطأ أثناء إنشاء رسالة الترحيب." }
    ]);
  }
};

  // إرسال رسالة للـ backend/OpenAI (دردشات المستخدم العادية)
  const sendMessageToAPI = async (message) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: message,
          lang: lang,   // اللغة المختارة من المودال
          country: country, // كود الدولة المختارة
          userName: userName
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "حدث خطأ أثناء الاتصال بالخدمة." }]);
    }
  };

  return (
    <div>
      {showModal && (
        <LanguageSelectModal
          userName={userName}
          countries={countriesLabels}      // تظهر الأسماء مع الأعلام في القوائم
          countriesLang={countriesLangMap} // تربط كل دولة بلغتها
          onSelect={handleLanguageSelect}
        />
      )}
      {!showModal && (
        <ChatComponent
          messages={messages}
          lang={lang}
          country={country}
          onSendMessage={sendMessageToAPI}
        />
      )}
    </div>
  );
}