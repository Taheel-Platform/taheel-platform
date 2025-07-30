import React, { useState } from "react";
import LanguageSelectModal from "./LanguageSelectModal";
import ChatComponent from "./ChatComponent";

// ملف الدول (code, name, lang, flag)
import countriesLangArr from "src/lib/countriesLang.js";

// تجهيز كائنات للمودال: labels & langMap
const countriesLabels = {};
const countriesLangMap = {};
countriesLangArr.forEach(c => {
  countriesLabels[c.code] = `${c.flag} ${c.name}`;
  countriesLangMap[c.code] = c.lang;
});

// رسائل الترحيب الرسمية حسب اللغة
const taheelWelcomePrompts = {
  ar: (userName) =>
    `مرحبًا بك ${userName} في منصة تأهيل. نحن نسعى دائمًا لتقديم أفضل خدماتنا لكم وضمان راحتكم ورضاكم. نحن هنا لمساعدتكم في تحقيق أهدافكم وتطوير مهاراتكم بشكل فعّال. لا تترددوا في التواصل معنا لأي استفسارات أو مساعدة إضافية. نتمنى لكم تجربة ممتعة ومفيدة معنا.`,
  en: (userName) =>
    `Welcome ${userName} to Taheel platform. We always strive to provide you with the best services and ensure your comfort and satisfaction. We are here to assist you in achieving your goals and developing your skills effectively. Please do not hesitate to contact us for any inquiries or additional assistance. We wish you an enjoyable and beneficial experience with us.`,
  fr: (userName) =>
    `Bienvenue ${userName} sur la plateforme Taheel. Nous nous efforçons toujours de vous offrir les meilleurs services et de garantir votre confort et votre satisfaction. Nous sommes ici pour vous aider à atteindre vos objectifs et à développer vos compétences efficacement. N'hésitez pas à nous contacter pour toute question ou assistance supplémentaire. Nous vous souhaitons une expérience agréable et enrichissante parmi nous.`
};

export default function ChatParent({ userName = "زائر" }) {
  const [lang, setLang] = useState(null);
  const [country, setCountry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showModal, setShowModal] = useState(true);

  // عند اختيار اللغة والدولة من المودال
  const handleLanguageSelect = (selectedLang, selectedCountry) => {
    setLang(selectedLang);
    setCountry(selectedCountry);
    setShowModal(false);

    // رسالة الترحيب حسب اللغة المختارة
    const welcomeMsg = taheelWelcomePrompts[selectedLang]
      ? taheelWelcomePrompts[selectedLang](userName)
      : taheelWelcomePrompts["ar"](userName);

    setMessages([
      { role: "assistant", content: welcomeMsg }
    ]);
  };

  // إرسال رسالة للـ backend/OpenAI
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