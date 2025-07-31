import React, { useState } from "react";
import ChatWidgetFull from "./ChatWidgetFull";
import LanguageSelectModal from "./LanguageSelectModal";

export default function ChatParent() {
  const [showLangModal, setShowLangModal] = useState(true);
  const [lang, setLang] = useState("");
  const [country, setCountry] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  // استقبال اختيار اللغة والدولة
  const handleLanguageSelect = async (selectedLang, selectedCountry) => {
    setLang(selectedLang);
    setCountry(selectedCountry);
    setShowLangModal(false);

    // طلب رسالة ترحيب من API
    const welcomePrompt =
      selectedLang === "ar"
        ? `اكتب رسالة ترحيب ودية واحترافية للعميل الجديد في منصة تأهيل.`
        : selectedLang === "en"
        ? `Write a professional and friendly welcome message for a new user in Taheel platform.`
        : `Welcome to Taheel platform!`;

    try {
      const res = await fetch("/api/openai-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: welcomePrompt, lang: selectedLang, country: selectedCountry, isWelcome: true }),
      });
      const data = await res.json();
      setMessages([
        {
          id: "welcome-" + Date.now(),
          type: "bot",
          senderName: "Bot",
          createdAt: Date.now(),
          text: data.text || "مرحبًا بك!",
        },
      ]);
    } catch (err) {
      setMessages([
        {
          id: "welcome-" + Date.now(),
          type: "bot",
          senderName: "Bot",
          createdAt: Date.now(),
          text: "مرحبًا بك!",
        },
      ]);
    }
  };

  // إرسال رسالة من العميل
  const handleSendMsg = async (msg) => {
    if (!msg || !lang) return;
    // أضف رسالة العميل أولاً
    setMessages((prev) => [
      ...prev,
      {
        id: "user-" + Date.now(),
        type: "text",
        senderName: "User",
        createdAt: Date.now(),
        text: msg,
      },
    ]);
    setInput(""); // إعادة تعيين الإدخال بعد إرسال الرسالة

    try {
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
        {
          id: "bot-" + Date.now(),
          type: "bot",
          senderName: "Bot",
          createdAt: Date.now(),
          text: data.text || "...",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          type: "bot",
          senderName: "Bot",
          createdAt: Date.now(),
          text: "حدث خطأ في الرد، حاول مرة أخرى.",
        },
      ]);
    }
  };

  // إرسال الرسالة من الفورم
  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim()) {
      handleSendMsg(input.trim());
    }
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
          input={input}
          setInput={setInput}
          handleSend={handleSend}
        />
      )}
    </>
  );
}