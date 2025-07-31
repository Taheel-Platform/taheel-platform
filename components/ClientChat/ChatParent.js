import React, { useState } from "react";
import ChatWidgetFull from "./ChatWidgetFull";
import LanguageSelectModal from "./LanguageSelectModal";

export default function ChatParent() {
  const [showLangModal, setShowLangModal] = useState(true);
  const [lang, setLang] = useState("");
  const [country, setCountry] = useState("");
  const [messages, setMessages] = useState([]);

  // عند اختيار اللغة والدولة
  const handleLanguageSelect = async (selectedLang, selectedCountry) => {
    setLang(selectedLang);
    setCountry(selectedCountry);
    setShowLangModal(false);

    // اطلب رسالة ترحيب من الذكاء الصناعي
    const welcomePrompt =
      selectedLang === "ar"
        ? `اكتب رسالة ترحيب ودية واحترافية للعميل الجديد في منصة تأهيل.`
        : selectedLang === "en"
        ? `Write a professional and friendly welcome message for a new user in Taheel platform.`
        : `Welcome to Taheel platform!`;

    // جرب طلب API وهمي أو OpenAI هنا
    const res = await fetch("/api/openai-gpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: welcomePrompt, lang: selectedLang, country: selectedCountry, isWelcome: true }),
    });
    const data = await res.json();
    setMessages([
      {
        id: "welcome",
        type: "bot",
        senderName: "Bot",
        createdAt: Date.now(),
        text: data.text || "مرحبًا بك!",
      },
    ]);
  };

  // عند إرسال رسالة من العميل
  const handleSendMsg = async (msg) => {
    setMessages((prev) => [
      ...prev,
      { id: "user-" + Date.now(), type: "text", senderName: "User", createdAt: Date.now(), text: msg },
    ]);

    // هنا ترسل الرسالة للذكاء الصناعي وتنتظر الرد
    const res = await fetch("/api/openai-gpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: msg,
        lang,
        country,
      }),
    });
    const data = await res.json();
    setMessages((prev) => [
      ...prev,
      { id: "bot-" + Date.now(), type: "bot", senderName: "Bot", createdAt: Date.now(), text: data.text || "..." },
    ]);
  };

  return (
    <>
      {showLangModal ? (
        <LanguageSelectModal
          userName="زائر"
          countries={{ SA: "السعودية", EG: "مصر" }}
          countriesLang={{ SA: "ar", EG: "ar" }}
          onSelect={handleLanguageSelect}
        />
      ) : (
        <ChatWidgetFull
          messages={messages}
          lang={lang}
          country={country}
          input=""
          setInput={() => {}}
          handleSend={(e) => {
            e.preventDefault();
            const msg = e.target.elements.chatinput.value;
            if (msg) handleSendMsg(msg);
          }}
          // باقي props الوهمية
        />
      )}
    </>
  );
}