import {
  FaPaperPlane,
  FaMicrophone,
  FaImage,
  FaSmile,
  FaComments,
  FaTimes,
  FaWindowMinimize,
} from "react-icons/fa";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

export default function ChatWidgetFull({
  messages,
  lang,
  country,
  input,
  setInput,
  uploading,
  imagePreview,
  handleFileChange,
  audioBlob,
  handleRecord,
  recording,
  showEmoji,
  setShowEmoji,
  handleSelectEmoji,
  minimized,
  setMinimized,
  closed,
  setClosed,
  waitingForAgent,
  agentAccepted,
  handleSend,
  handleQuickFAQ,
  noBotHelpCount,
  requestAgent,
  closeChat,
  dir,
  headerButtonsStyle,
  faqData,
  chatEndRef,
}) {
  // renderMsgBubble كما هو بدون تغيير إلا لو تريد تعقيم اسم المرسل
  function renderMsgBubble(msg) {
    let isSelf = msg.senderId === "guest"; // غيّر حسب ما تريد
    let isBot = msg.type === "bot";
    let isSystem = msg.type === "system";
    let base =
      "rounded-2xl px-4 py-3 mb-2 shadow transition-all max-w-[78%] whitespace-pre-line break-words";
    let align = isSelf
      ? lang === "ar" ? "mr-auto self-end" : "ml-auto self-end"
      : isBot
      ? "self-start"
      : isSystem
      ? "mx-auto"
      : "self-start";
    let color =
      isSystem
        ? "bg-gradient-to-r from-yellow-50 to-yellow-100 text-emerald-900 border border-yellow-300"
        : isBot
        ? "bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-900 border border-emerald-400"
        : isSelf
        ? "bg-gradient-to-br from-emerald-500 to-cyan-500 text-white"
        : "bg-gradient-to-br from-white to-gray-100 text-gray-900 border border-gray-200";
    return (
      <div className={`${base} ${align} ${color} flex items-start gap-2`} key={msg.id}>
        {isBot && (
          <img
            src="/taheel-bot.png"
            alt="Bot"
            width={36}
            height={36}
            className="rounded-full border border-emerald-400 shadow-sm mt-1"
            style={{ minWidth: 36, minHeight: 36, objectFit: "cover", background: "#fff" }}
          />
        )}
        <div className="flex-1">
          {msg.type === "text" && <span>{msg.text}</span>}
          {msg.type === "bot" && <span>{msg.text}</span>}
          {msg.type === "image" && (
            <img
              src={msg.imageBase64}
              alt="img"
              width={160}
              height={160}
              className="max-w-[160px] max-h-[160px] rounded-lg border mt-1"
            />
          )}
          {msg.type === "audio" && (
            <audio controls src={msg.audioBase64} className="mt-1" />
          )}
          <div className="text-[10px] text-gray-400 mt-1 text-left ltr:text-left rtl:text-right">
            {isBot
              ? lang === "ar"
                ? "المساعد الذكي"
                : lang === "en"
                ? "Smart Assistant"
                : "Assistant"
              : isSystem
              ? lang === "ar"
                ? "النظام"
                : lang === "en"
                ? "System"
                : "Système"
              : msg.senderName}
            {" · "}
            {msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString(
                  lang === "ar"
                    ? "ar-EG"
                    : lang === "en"
                    ? "en-US"
                    : "fr-FR",
                  { hour: "2-digit", minute: "2-digit" }
                )
              : ""}
          </div>
        </div>
      </div>
    );
  }

  if (closed) return null;

  return (
    <>
      <style>{`
        .chat-bg-grad { background: linear-gradient(120deg, #183d3d 60%, #1a2236 100%); }
        button, .cursor-pointer, [role="button"] { cursor: pointer !important; }
        .chat-action-btn {
          transition: background .2s, color .2s, box-shadow .2s;
        }
        .chat-action-btn:hover {
          box-shadow: 0 0 8px #14b8a6;
          background: #e0f7fa;
        }
      `}</style>
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="fixed bottom-[150px] right-6 bg-gradient-to-br from-emerald-600 to-cyan-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-xl z-[1000] animate-bounce chat-action-btn"
          title={lang === "ar" ? "فتح المحادثة" : lang === "en" ? "Open Chat" : "Ouvrir le chat"}
        >
          <FaComments size={32} />
        </button>
      ) : (
        <div className="fixed bottom-24 right-4 z-[1000] font-sans" dir={dir} style={{ direction: dir }}>
          <div className="w-[94vw] max-w-[430px] h-[calc(62vh)] min-h-[340px] flex flex-col bg-[#222a36] rounded-2xl shadow-2xl border border-emerald-900 relative overflow-hidden" style={{ maxHeight: "540px" }}>
            <div className="px-4 py-3 border-b border-emerald-800 text-emerald-200 font-bold flex items-center gap-1 relative bg-gradient-to-l from-cyan-900 to-emerald-900">
              <span className="text-lg">
                {lang === "ar"
                  ? "الدردشة الذكية"
                  : lang === "en"
                  ? "Smart Chat"
                  : "Chat intelligente"}
              </span>
              <div style={headerButtonsStyle}>
                <button
                  onClick={() => setMinimized(true)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full w-7 h-7 flex items-center justify-center shadow border border-yellow-600 chat-action-btn"
                  title={lang === "ar" ? "تصغير المحادثة" : lang === "en" ? "Minimize" : "Minimiser"}
                  style={{ fontWeight: 700 }}
                >
                  <FaWindowMinimize style={{ fontWeight: 900, fontSize: 18 }} />
                </button>
                <button
                  onClick={closeChat}
                  className="bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow border border-red-600 chat-action-btn"
                  title={lang === "ar" ? "إغلاق المحادثة" : lang === "en" ? "Close chat" : "Fermer"}
                  style={{ fontWeight: 700 }}
                >
                  <FaTimes style={{ fontWeight: 900, fontSize: 18 }} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col chat-bg-grad">
              {messages.map(renderMsgBubble)}
              <div ref={chatEndRef} />
            </div>

            <form
              className="border-t border-emerald-800 px-3 py-3 flex items-center gap-2 bg-[#222a36]"
              onSubmit={handleSend}
              dir={dir}
              style={{ direction: dir }}
            >
              <div className="relative">
                <button
                  type="button"
                  className="text-yellow-400 hover:text-yellow-600 chat-action-btn"
                  title={lang === "ar" ? "إضافة إيموجي" : lang === "en" ? "Add Emoji" : "Ajouter Emoji"}
                  onClick={() => setShowEmoji((v) => !v)}
                  tabIndex={-1}
                >
                  <FaSmile size={22} />
                </button>
                {showEmoji && (
                  <div className="fixed bottom-28 right-8 z-[9999]">
                    <Picker
                      data={emojiData}
                      onEmojiSelect={handleSelectEmoji}
                      theme="dark"
                      locale={lang}
                    />
                  </div>
                )}
              </div>
              <label className="cursor-pointer text-emerald-400 hover:text-emerald-600 chat-action-btn">
                <FaImage size={22} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
              <button
                type="button"
                onClick={handleRecord}
                className={`text-emerald-400 hover:text-emerald-600 chat-action-btn ${recording ? "animate-pulse text-red-600" : ""}`}
                title={
                  recording
                    ? lang === "ar"
                      ? "جارٍ التسجيل..."
                      : lang === "en"
                      ? "Recording..."
                      : "Enregistrement..."
                    : lang === "ar"
                    ? "تسجيل صوتي"
                    : lang === "en"
                    ? "Record audio"
                    : "Enregistrer audio"
                }
                disabled={uploading}
              >
                <FaMicrophone size={22} />
              </button>
              <input
                type="text"
                className="flex-1 bg-[#1a2236] rounded-full px-4 py-2 outline-none text-white shadow border border-emerald-700"
                placeholder={
                  waitingForAgent && !agentAccepted
                    ? lang === "ar"
                      ? "يرجى الانتظار..."
                      : lang === "en"
                      ? "Please wait..."
                      : "Veuillez patienter..."
                    : lang === "ar"
                    ? "اكتب رسالتك أو سؤالك..."
                    : lang === "en"
                    ? "Type your message or question..."
                    : "Tapez votre message ou question..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={
                  uploading ||
                  recording ||
                  (waitingForAgent && !agentAccepted)
                }
                style={{ fontSize: "1rem" }}
              />
              <button
                type="submit"
                className="bg-gradient-to-br from-emerald-600 to-cyan-500 hover:from-emerald-700 hover:to-cyan-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow chat-action-btn"
                title={lang === "ar" ? "إرسال" : lang === "en" ? "Send" : "Envoyer"}
                disabled={uploading || (waitingForAgent && !agentAccepted)}
                style={{ cursor: "pointer" }}
              >
                <FaPaperPlane />
              </button>
              {(imagePreview || audioBlob) && (
                <span className="ml-2 text-xs text-emerald-700 bg-cyan-50 px-2 py-1 rounded flex items-center">
                  {imagePreview && <>صورة جاهزة للإرسال</>}
                  {audioBlob && <>صوت جاهز للإرسال</>}
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setAudioBlob(null);
                    }}
                    className="ml-1 text-red-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
            </form>
            {waitingForAgent && !agentAccepted && (
              <div className="flex justify-center p-3">
                <div className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 px-4 py-2 rounded-xl text-center font-semibold animate-pulse border border-orange-300 shadow">
                  {lang === "ar"
                    ? "يرجى الانتظار سيتم تحويل الدردشة لموظف خدمة العملاء للرد عليك في أقرب وقت..."
                    : lang === "en"
                    ? "Please wait, your chat will be transferred to a customer service agent soon..."
                    : "Veuillez patienter, votre chat sera transféré à un agent du service client sous peu..."}
                </div>
              </div>
            )}
            {!waitingForAgent && !agentAccepted && messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {faqData.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickFAQ(f.q[lang] || f.q.en)}
                    className="bg-gradient-to-br from-emerald-200 to-cyan-100 hover:from-emerald-300 hover:to-cyan-200 text-emerald-900 rounded-full px-4 py-2 text-sm font-semibold shadow chat-action-btn"
                    style={lang === "ar" ? { direction: "rtl", textAlign: "right" } : { direction: "ltr", textAlign: "left" }}
                  >
                    {f.q[lang] || f.q.en}
                  </button>
                ))}
              </div>
            )}
            {!waitingForAgent && !agentAccepted && noBotHelpCount >= 2 && (
              <div className="flex justify-center p-3">
                <button
                  type="button"
                  onClick={requestAgent}
                  className="bg-gradient-to-br from-yellow-400 to-yellow-200 hover:from-yellow-500 hover:to-yellow-300 text-gray-900 rounded-full px-4 py-2 flex items-center justify-center font-bold text-sm chat-action-btn shadow border border-yellow-600"
                  title={lang === "ar" ? "اتواصل مع الموظف" : lang === "en" ? "Contact Agent" : "Contacter un agent"}
                >
                  {lang === "ar"
                    ? "اتواصل مع موظف خدمة العملاء"
                    : lang === "en"
                    ? "Contact Customer Service"
                    : "Contacter le service client"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}