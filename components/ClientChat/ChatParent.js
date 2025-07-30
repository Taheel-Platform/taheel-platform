import React, { useState } from "react";
import LanguageSelectModal from "./LanguageSelectModal";
// لو عندك كومبوننت للشات: استوردها
import ChatComponent from "./ChatComponent";

// رسالة الترحيب الرسمية حسب اللغة
const taheelWelcomePrompts = {
  ar: (userName) =>
    `مرحبًا بك ${userName} في منصة تأهيل. نحن نسعى دائمًا لتقديم أفضل خدماتنا لكم وضمان راحتكم ورضاكم. نحن هنا لمساعدتكم في تحقيق أهدافكم وتطوير مهاراتكم بشكل فعّال. لا تترددوا في التواصل معنا لأي استفسارات أو مساعدة إضافية. نتمنى لكم تجربة ممتعة ومفيدة معنا.`,
  en: (userName) =>
    `Welcome ${userName} to Taheel platform. We always strive to provide you with the best services and ensure your comfort and satisfaction. We are here to assist you in achieving your goals and developing your skills effectively. Please do not hesitate to contact us for any inquiries or additional assistance. We wish you an enjoyable and beneficial experience with us.`,
  fr: (userName) =>
    `Bienvenue ${userName} sur la plateforme Taheel. Nous nous efforçons toujours de vous offrir les meilleurs services et de garantir votre confort et votre satisfaction. Nous sommes ici pour vous aider à atteindre vos objectifs et à développer vos compétences efficacement. N'hésitez pas à nous contacter pour toute question ou assistance supplémentaire. Nous vous souhaitons une expérience agréable et enrichissante parmi nous.`
};

export default function ChatParent({ userName = "زائر", countries, countriesLang }) {
  const [lang, setLang] = useState(null);
  const [country, setCountry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showModal, setShowModal] = useState(true);

  // دالة عند اختيار اللغة والدولة من المودال
  const handleLanguageSelect = (selectedLang, selectedCountry) => {
    setLang(selectedLang);
    setCountry(selectedCountry);
    setShowModal(false); // اغلق المودال

    // جهز رسالة الترحيب الرسمية
    const welcomeMsg = taheelWelcomePrompts[selectedLang]
      ? taheelWelcomePrompts[selectedLang](userName)
      : taheelWelcomePrompts["ar"](userName);

    // أضفها للمحادثة
    setMessages([
      { role: "assistant", content: welcomeMsg }
    ]);
  };

  // دالة لإرسال رسالة للـ API
  const sendMessageToAPI = async (message) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    try {
      // استدعاء الـ backend أو OpenAI
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: message,
          lang: lang,
          country: country,
          userName: userName
        }),
      });
      const data = await res.json();
      // أضف رد الـ AI للمحادثة
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
          countries={countries}
          countriesLang={countriesLang}
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