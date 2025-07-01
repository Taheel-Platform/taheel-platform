import { FaWhatsapp } from "react-icons/fa";

export default function WhatsappButton({ lang = "ar", className = "" }) {
  return (
    <a
      href="https://wa.me/971555555555"
      target="_blank"
      rel="noopener noreferrer"
      className={`whatsapp-float fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl p-2 text-xl flex items-center justify-center transition-all duration-200 border-2 border-white ${className}`}
      title={lang === "ar" ? "تواصل عبر واتساب" : "Contact via WhatsApp"}
      style={{
        boxShadow:
          "0 4px 24px 0 rgba(16,185,129,0.28), 0 1.5px 4px 0 rgba(0,0,0,0.06)",
      }}
      aria-label="WhatsApp"
    >
      <FaWhatsapp />
    </a>
  );
}