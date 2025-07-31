import React, { useState } from "react";
import ChatWidgetFull from "./ChatWidgetFull";
import LanguageSelectModal from "./LanguageSelectModal";

export default function ChatParent() {
  // إدارة حالة اللغة والدولة ومدى ظهور المودال
  const [showLangModal, setShowLangModal] = useState(true);
  const [lang, setLang] = useState("");
  const [country, setCountry] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // دائماً Array

  // دالة استقبال اللغة والدولة من المودال
  const handleLanguageSelect = async (selectedLang, selectedCountry) => {
    setLang(selectedLang);
    setCountry(selectedCountry);
    setShowLangModal(false);

    // بناء prompt للترحيب
    const welcomePrompt =
      selectedLang === "ar"
        ? `اكتب رسالة ترحيب ودية واحترافية للعميل الجديد في منصة تأهيل.`
        : selectedLang === "en"
        ? `Write a professional and friendly welcome message for a new user in Taheel platform.`
        : `Welcome to Taheel platform!`;

    // طلب الترحيب من API
    try {
      const res = await fetch("/api/openai-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: welcomePrompt,
          lang: selectedLang,
          country: selectedCountry,
          isWelcome: true,
        }),
      });
      const data = await res.json();
      setMessages([
        {
          id: "welcome-" + Date.now(),
          type: "bot",
          senderName: "Bot",
          createdAt: Date.now(),
          text: data?.text || "مرحبًا بك!",
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

  // دالة إرسال الرسائل من العميل
  const handleSendMsg = async (msg) => {
    if (!msg || !lang) return;
    // أضف رسالة العميل
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
    setInput(""); // تفريغ المدخل

    try {
      const res = await fetch("/api/openai-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: msg, lang, country }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          type: "bot",
          senderName: "Bot",
          createdAt: Date.now(),
          text: data?.text || "...",
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

  // دالة إرسال الرسالة من الفورم
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
          messages={messages || []} // حماية إضافية حتى لو حدث خطأ
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