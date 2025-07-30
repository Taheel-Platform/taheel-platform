import React, { useState } from "react";
import LanguageSelectModal from "./LanguageSelectModal";
import ChatComponent from "./ChatComponent";
import countriesLangArr from "src/lib/countriesLang.js";

// تجهيز بيانات البلدان واللغات للمودال
const countriesLabels = {};
const countriesLangMap = {};
countriesLangArr.forEach((c) => {
  countriesLabels[c.code] = `${c.flag} ${c.name}`;
  countriesLangMap[c.code] = c.lang;
});

export default function ChatParent({ userName = "زائر" }) {
  const [lang, setLang] = useState(null);       // لغة المستخدم المختارة
  const [country, setCountry] = useState(null); // دولة المستخدم المختارة
  const [messages, setMessages] = useState([]); // رسائل الشات
  const [showModal, setShowModal] = useState(true); // هل يظهر المودال؟

  // عند اختيار اللغة والدولة من المودال
  const handleLanguageSelect = async (selectedLang, selectedCountry) => {
    setLang(selectedLang);
    setCountry(selectedCountry);
    setShowModal(false);

    // جلب رسالة الترحيب من الـ backend (OpenAI) بالمعطيات الصحيحة
    try {
      // حدد البرومبت حسب اللغة المختارة
      let welcomePrompt;
      if (selectedLang === "ar") {
        welcomePrompt = `اكتب رسالة ترحيب احترافية وودية للعميل الجديد باسم "${userName}" في منصة تأهيل ورد بالعربية.`;
      } else if (selectedLang === "en") {
        welcomePrompt = `Write a friendly and professional welcome message for a new user named "${userName}" on Taheel platform. Respond in English.`;
      } else if (selectedLang === "fr") {
        welcomePrompt = `Rédige un message de bienvenue professionnel et convivial pour un nouvel utilisateur nommé "${userName}" sur la plateforme Taheel. Réponds en français.`;
      } else {
        welcomePrompt = `Write a professional and friendly welcome message for a new user named "${userName}" on Taheel platform. Respond ONLY in language code: ${selectedLang}.`;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: welcomePrompt,
          lang: selectedLang,
          country: selectedCountry,
          userName,
          isWelcome: true,
        }),
      });
      const data = await res.json();

      // أضف رسالة الترحيب فقط بعد اختيار اللغة والدولة
      setMessages([
        { role: "assistant", content: data.text }
      ]);
    } catch (err) {
      setMessages([
        { role: "assistant", content: "حدث خطأ أثناء إنشاء رسالة الترحيب." }
      ]);
    }
  };

  // إرسال رسالة المستخدم للـ backend (OpenAI)
  const sendMessageToAPI = async (message) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: message,
          lang: lang,
          country: country,
          userName,
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
          countries={countriesLabels}
          countriesLang={countriesLangMap}
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