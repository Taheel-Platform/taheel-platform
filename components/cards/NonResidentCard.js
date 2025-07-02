import { Suspense } from "react";
import { useState } from "react";
import StyledQRCode from "@/components/StyledQRCode";
import { FaBell, FaCamera, FaEdit, FaCloudUploadAlt } from "react-icons/fa";
import Image from "next/image";
import UpgradeModal from "./UpgradeModal";
import { ResidentCard } from "./ResidentCard";
import { firestore } from "@/lib/firebase.client";
import { doc, updateDoc } from "firebase/firestore";


function NonResidentCard({
  client,
  lang = "ar",
}) {
  // بيانات الغير مقيم
  const {
    clientId = "NR-0000-000",
    name = "الاسم بالكامل",
    nationality = "غير سعودي",
    birthDate = "1990-01-01",
    expireDate = "2026-06-01",
    avatar = "/default-avatar.png",
    logo = "/logo-transparent-large.png",
    cardType = "غير مقيم",
    idNumber = "",
    showExpiryAlert = false,
  } = client || {};

  // ---- حالات التحويل ----
  const [isResident, setIsResident] = useState(false);
  const [residentExpiry, setResidentExpiry] = useState(""); // تاريخ انتهاء الاقامة الجديد لو ترقى
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // باقي حالاتك
  const [editingDoc, setEditingDoc] = useState(false);
  const [newDoc, setNewDoc] = useState(idNumber || "");

  // ====== نصوص ثنائية اللغة ======
  const t = {
    ar: {
      cardTitle: "بطاقة تأهيل",
      cardType: cardType,
      frozen: "❄️ البطاقة مجمدة بسبب انتهاء جواز السفر منذ أكثر من شهر",
      expired: "⚠️ انتهت صلاحية الوثيقة! يرجى التجديد فوراً.",
      expiresToday: "⚠️ تنتهي الوثيقة اليوم!",
      expiresIn: (n) => `تنبيه: ستنتهي الوثيقة خلال ${n} يوم${n === 1 ? "" : "ًا"}!`,
      expiryDate: "تاريخ انتهاء البطاقة",
      nationality: "الجنسية",
      birthDate: "تاريخ الميلاد",
      editDoc: "تعديل رقم الوثيقة",
      uploadOrUpgrade: "رفع جواز جديد / ترقية لمقيم",
      edit: "تعديل",
      pickFile: "اختر ملف...",
      docNumber: idNumber,
      cancel: "إلغاء",
      save: "حفظ",
    },
    en: {
      cardTitle: "Taheel Card",
      cardType: "Non-Resident",
      frozen: "❄️ Card is frozen due to expired passport for over a month",
      expired: "⚠️ The document has expired! Please renew immediately.",
      expiresToday: "⚠️ The document expires today!",
      expiresIn: (n) => `Alert: The document will expire in ${n} day${n === 1 ? "" : "s"}!`,
      expiryDate: "Card Expiry Date",
      nationality: "Nationality",
      birthDate: "Birth Date",
      editDoc: "Edit Document Number",
      uploadOrUpgrade: "Upload New Passport / Upgrade to Resident",
      edit: "Edit",
      pickFile: "Pick a file...",
      docNumber: idNumber,
      cancel: "Cancel",
      save: "Save",
    },
  }[lang === "en" ? "en" : "ar"];
  // ==============================

  // حساب الفرق بالأيام
  const expire = new Date(expireDate);
  const now = new Date();
  const diffDays = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
  const daysSinceExpiry = Math.ceil((now - expire) / (1000 * 60 * 60 * 24));
  const expiring = showExpiryAlert || diffDays <= 30;
  const expired = diffDays < 0;
  const frozen = daysSinceExpiry > 30;

  // تغيير الصورة
  const handleAvatarChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      // 1. ارفع الصورة لجوجل ستوريج (API خاص بك)
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', clientId);

      let url = avatar;
      try {
        const res = await fetch('/api/upload-to-gcs', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
        url = data.url;
      } catch (error) {
        alert(lang === "ar" ? "حدث خطأ أثناء رفع الصورة" : "Error uploading photo");
        return;
      }

      // 2. حفظ الرابط في Firestore
      try {
        await updateDoc(doc(firestore, "nonresidents", clientId), { avatar: url });
      } catch (error) {
        alert(lang === "ar" ? "حدث خطأ أثناء حفظ الصورة" : "Error saving photo in database");
        return;
      }
    }
  };

  // حفظ رقم الوثيقة
  const handleDocumentSave = async () => {
    try {
      await updateDoc(doc(firestore, "nonresidents", clientId), { idNumber: newDoc });
      setEditingDoc(false);
    } catch (error) {
      alert(lang === "ar" ? "حدث خطأ أثناء تحديث رقم الوثيقة" : "Error updating document number");
    }
  };

  // --- ترقية أو رفع جواز جديد ---
  const handleUpgradeModalSave = (data) => {
    // data = { type: "passport", passport } أو { type: "resident", eidFront, eidBack }
    if (data?.type === "resident") {
      setResidentExpiry(data.eidExpiry || "");
      setIsResident(true);
    }
    // يمكنك هنا أيضًا معالجة حالة رفع جواز جديد (تجديد الجواز) لو أردت
    setShowUpgradeModal(false);
  };

  // اتجاه الصفحة (rtl أو ltr)
  const dir = lang === "ar" ? "rtl" : "ltr";

  // لو ترقى للكارت المقيم
  if (isResident) {
    return <ResidentCard
      client={{
        ...client,
        cardType: "مقيم",
        eidExpiry: residentExpiry || expireDate, // تاريخ الإقامة الجديدة
        resident: true,
      }}
      lang={lang}
    />;
  }

  // ألوان مميزة (بنفسجي ودرجات الرصاصي)
  const mainColor = "#6D3EFF";
  const gradFrom = "#f3f1fb";
  const gradVia = "#e2e3f6";
  const gradTo = "#c6c7d6";
  const accentColor = "#402080";

  return (
    <div
      className={`relative w-[370px] max-w-full mx-auto rounded-3xl shadow-2xl border-2 overflow-hidden print:shadow-none ${frozen ? "opacity-70 grayscale" : ""}`}
      style={{
        borderColor: mainColor,
        background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradVia} 60%, ${gradTo} 100%)`,
      }}
      dir={dir}
      lang={lang}
    >
      {/* علامة مائية وسط الكارت (شفافة) */}
      <img
        src={logo}
        alt="Taheel Logo Watermark"
        className="absolute left-1/2 top-1/2 pointer-events-none select-none"
        style={{
          width: 220,
          height: 220,
          opacity: 0.09,
          transform: "translate(-50%,-50%)",
          zIndex: 0,
          userSelect: "none"
        }}
      />
      {/* تجميد الكارت لو جواز السفر منتهي من أكتر من شهر */}
      {frozen ? (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-r from-gray-500 to-blue-400 text-white px-3 py-1 rounded-t-3xl text-xs font-bold z-20">
          {t.frozen}
        </div>
      ) : expiring && (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-r from-purple-700 to-purple-400 text-white px-3 py-1 rounded-t-3xl text-xs font-bold z-20 animate-pulse">
          <FaBell className="inline mr-1" />
          {expired
            ? t.expired
            : diffDays === 0
              ? t.expiresToday
              : t.expiresIn(diffDays)
          }
        </div>
      )}

      {/* صورة وQR */}
      <div className="w-full flex justify-center items-center mt-5 mb-1 z-10 relative">
        <div className="w-16 h-16 rounded-full bg-white border flex items-center justify-center shadow-sm"
          style={{ borderColor: gradTo }}>
          <Image src={logo} width={56} height={56} alt="logo" />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center mb-2 relative z-10">
        <span className="font-extrabold text-lg mb-1" style={{ color: mainColor }}>{t.cardTitle}</span>
        <span className="font-extrabold text-base" style={{ color: mainColor }}>{t.cardType}</span>
      </div>
      <div className="absolute left-0 top-0 h-full w-2 rounded-l-3xl"
        style={{ background: `linear-gradient(to bottom, ${mainColor} 0%, ${accentColor} 100%)`, zIndex: 10 }} />

      <div className="flex items-center justify-between px-6 pt-0 pb-2 gap-2 relative z-10" style={{ marginTop: "-40px" }}>
        <div className="relative group">
          <Image src={avatar} width={90} height={90} alt={name} className="rounded-xl border-2" style={{ borderColor: mainColor, backgroundColor: "#f5fafd" }} />
          <label className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-md border border-purple-300 cursor-pointer group-hover:opacity-100 transition z-10" title={t.edit}>
            <FaCamera className="text-purple-700" size={18} />
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </label>
          {idNumber && (
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-purple-700 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow">{t.docNumber}</span>
          )}
        </div>
        <div className="flex flex-col items-center flex-1 px-2" />
        <div className="flex flex-col items-center">
          <div className="bg-white p-0 rounded-xl shadow border-2" style={{ borderColor: gradTo, width: 90, height: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <StyledQRCode value={clientId} logo={logo} size={82} />
          </div>
          <span className="mt-1 text-[11px] text-gray-500 font-mono font-bold tracking-widest">{clientId}</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mt-6 mb-2 px-4 relative z-10">
        <span className="font-bold text-lg text-gray-800 text-center w-full truncate" title={name}>
          {name}
        </span>
        <span className="text-sm text-gray-500 mt-2 text-center w-full">
          {t.nationality}: <span className="font-bold" style={{ color: mainColor }}>{nationality}</span>
        </span>
        <span className="text-sm text-gray-500 mt-2 text-center w-full">
          {t.birthDate}: <span className="font-bold">{birthDate}</span>
        </span>
      </div>

      <div className="flex items-end justify-between px-4 pb-4 mt-2 relative z-10">
        <div className="flex flex-col items-end ml-2">
          <span className="text-[13px] font-bold text-gray-700">{t.expiryDate}</span>
          <span className={`text-[15px] font-extrabold`} style={{ color: expiring ? "#a21caf" : mainColor }}>{expireDate}</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="mt-1 flex items-center gap-2">
            {editingDoc ? (
              <>
                <input
                  className="border border-purple-300 rounded px-1 text-xs font-mono w-[110px]"
                  value={newDoc}
                  onChange={e => setNewDoc(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") handleDocumentSave(); if (e.key === "Escape") setEditingDoc(false); }}
                />
                <button
                  className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 sm:py-2.5 rounded-full font-bold shadow transition bg-[#6D3EFF] hover:bg-[#402080] text-white border border-[#402080] cursor-pointer"
                  onClick={handleDocumentSave}
                >
                  {t.save}
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 sm:py-2.5 rounded-full font-bold shadow transition bg-gray-200 hover:bg-gray-300 text-gray-700 border cursor-pointer"
                  onClick={() => setEditingDoc(false)}
                >
                  {t.cancel}
                </button>
              </>
            ) : (
              <>
                <span
                  className={`text-[12px] text-gray-500 font-mono font-bold tracking-widest transition ${expiring ? "cursor-pointer hover:text-purple-700" : ""}`}
                  title={expiring ? t.editDoc : ""}
                  onClick={expiring ? () => setEditingDoc(true) : undefined}
                  style={expiring ? { cursor: "pointer" } : {}}
                >
                  {clientId}
                </span>
                {expiring && (
                  <FaEdit
                    className="text-purple-700 ml-1 cursor-pointer"
                    size={13}
                    onClick={() => setEditingDoc(true)}
                    title={t.editDoc}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* زر واحد فقط للترقية أو تجديد جواز السفر */}
      <div className="flex justify-end items-center px-4 pb-3 relative z-10">
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-full"
          style={{
            background: mainColor,
            borderColor: accentColor,
            color: "#fff",
            boxShadow: "0 1px 4px #0002",
            fontWeight: "bold",
            cursor: "pointer"
          }}
          title={t.uploadOrUpgrade}
        >
          <FaCloudUploadAlt /> {t.uploadOrUpgrade}
        </button>
      </div>

      {/* المودال الموحد للترقية أو رفع جواز جديد */}
      {showUpgradeModal && (
        <UpgradeModal
          lang={lang}
          onClose={() => setShowUpgradeModal(false)}
          onSave={handleUpgradeModalSave}
        />
      )}
    </div>
  );
}

function MyComponent(props) {
  return (
    <Suspense fallback={null}>
      <MyComponentInner {...props} />
    </Suspense>
  );
}

export { NonResidentCard, MyComponent };