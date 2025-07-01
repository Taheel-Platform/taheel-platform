import { useState } from "react";
import StyledQRCode from "@/components/StyledQRCode";
import { FaSyncAlt, FaBell, FaCamera, FaEdit, FaCloudUploadAlt } from "react-icons/fa";
import Image from "next/image";
import CompanyCardModal from "./CompanyCardModal";

// Firestore imports
import { firestore } from "@/lib/firebase.client";
import { doc, updateDoc } from "firebase/firestore";

export default function CompanyCardGold({
  company,
  lang = "ar",
}) {
  // بيانات الشركة
  const {
    companyId = "COM-0000-000",
    name = "اسم الشركة",
    emirate = "إمارة غير محددة",
    email = "البريد الإلكتروني غير محدد",
    expireDate = "2026-06-01",
    logo = "/company-logo.png",
    taheelLogo = "/logo-transparent-large.png",
    cardType = "شركة / مؤسسة",
    showExpiryAlert = false,
  } = company || {};

  const [editingId, setEditingId] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState(companyId);

  const t = {
    ar: {
      cardTitle: "بطاقة تأهيل",
      cardType: cardType,
      expired: "⚠️ انتهت صلاحية البطاقة! يرجى التجديد فوراً.",
      expiresToday: "⚠️ تنتهي البطاقة اليوم!",
      expiresIn: (n) => `تنبيه: ستنتهي البطاقة خلال ${n} يوم${n === 1 ? "" : "ًا"}!`,
      expiryDate: "تاريخ انتهاء البطاقة",
      emirate: "الإمارة",
      email: "البريد الإلكتروني",
      editCompanyId: "تعديل رقم الشركة",
      upload: "رفع/فحص مستندات الشركة",
      licenseStatus: "الرخصة التجارية",
      licenseUploaded: "تم رفع الرخصة ✔️",
      licenseNotUploaded: "لم يتم رفع الرخصة",
      edit: "تعديل",
      pickFile: "اختر ملف...",
      idNumber: companyId,
      cancel: "إلغاء",
      save: "حفظ",
    },
    en: {
      cardTitle: "Taheel Card",
      cardType: cardType === "شركة / مؤسسة" ? "Company / Organization" : cardType,
      expired: "⚠️ The card has expired! Please renew immediately.",
      expiresToday: "⚠️ The card expires today!",
      expiresIn: (n) => `Alert: The card will expire in ${n} day${n === 1 ? "" : "s"}!`,
      expiryDate: "Card Expiry Date",
      emirate: "Emirate",
      email: "Email",
      editCompanyId: "Edit Company Number",
      upload: "Upload/Scan Company Documents",
      licenseStatus: "Commercial License",
      licenseUploaded: "License Uploaded ✔️",
      licenseNotUploaded: "License Not Uploaded",
      edit: "Edit",
      pickFile: "Pick a file...",
      idNumber: companyId,
      cancel: "Cancel",
      save: "Save",
    },
  }[lang === "en" ? "en" : "ar"];

  const expire = new Date(expireDate);
  const now = new Date();
  const diffDays = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
  const expiring = showExpiryAlert || diffDays <= 30;
  const expired = diffDays < 0;

  // رفع وتحديث لوجو الشركة في فايرستور
  const handleLogoChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', companyId);

      let url = logo;
      try {
        const res = await fetch('/api/upload-to-gcs', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
        url = data.url;
      } catch (error) {
        alert(lang === "ar" ? "حدث خطأ أثناء رفع الشعار" : "Error uploading logo");
        return;
      }

      // حفظ الرابط الجديد في فايرستور
      try {
        await updateDoc(doc(firestore, "companies", companyId), { logo: url });
      } catch (error) {
        alert(lang === "ar" ? "حدث خطأ أثناء حفظ الشعار" : "Error saving logo in database");
        return;
      }
    }
  };

  // تحديث رقم الشركة في فايرستور
  const handleCompanyIdSave = async () => {
    try {
      await updateDoc(doc(firestore, "companies", companyId), { companyId: newCompanyId });
      setEditingId(false);
    } catch (error) {
      alert(lang === "ar" ? "حدث خطأ أثناء تحديث رقم الشركة" : "Error updating company number");
    }
  };

  // استقبال نتيجة رفع جميع المستندات والرخصة التجارية
  const handleModalSave = (data) => {
    setShowModal(false);
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  const goldMain = "#D4AF37";
  const goldBorder = "#c8b26b";
  const goldDark = "#ad943a";
  const goldGradFrom = "#fffbe8";
  const goldGradVia = "#fcedc3";
  const goldGradTo = "#b8a045";

  return (
    <div
      className="relative w-[370px] max-w-full mx-auto rounded-3xl shadow-2xl border-2 overflow-hidden print:shadow-none"
      style={{
        borderColor: goldMain,
        background: `linear-gradient(135deg, ${goldGradFrom} 0%, ${goldGradVia} 60%, ${goldGradTo} 100%)`,
      }}
      dir={dir}
      lang={lang}
    >
      {/* علامة مائية */}
      <img
        src={taheelLogo}
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

      {/* إشعار */}
      {expiring && (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-r from-yellow-700 to-yellow-400 text-white px-3 py-1 rounded-t-3xl text-xs font-bold z-20 animate-pulse">
          <FaBell className="inline mr-1" />
          {expired
            ? t.expired
            : diffDays === 0
              ? t.expiresToday
              : t.expiresIn(diffDays)
          }
        </div>
      )}

      {/* لوجو */}
      <div className="w-full flex justify-center items-center mt-5 mb-1 z-10 relative">
        <div className="w-16 h-16 rounded-full bg-white border flex items-center justify-center shadow-sm"
          style={{ borderColor: goldBorder }}>
          <Image src={taheelLogo} width={56} height={56} alt="Taheel Logo" />
        </div>
      </div>

      {/* عناوين */}
      <div className="flex flex-col items-center justify-center mb-2 relative z-10">
        <span className="font-extrabold text-lg mb-1" style={{ color: goldMain }}>{t.cardTitle}</span>
        <span className="font-extrabold text-base" style={{ color: goldMain }}>{t.cardType}</span>
      </div>

      {/* ديكور جانبي */}
      <div className="absolute left-0 top-0 h-full w-2 rounded-l-3xl"
        style={{ background: `linear-gradient(to bottom, ${goldMain} 0%, ${goldDark} 100%)`, zIndex: 10 }} />

      {/* صورة وQR */}
      <div className="flex items-center justify-between px-6 pt-0 pb-2 gap-2 relative z-10" style={{ marginTop: "-40px" }}>
        <div className="relative group">
          <Image src={logo} width={90} height={90} alt={name} className="rounded-xl border-2" style={{ borderColor: goldMain, backgroundColor: "#f7f7f7" }} />
          <label className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-md border border-yellow-400 cursor-pointer group-hover:opacity-100 transition z-10" title={t.edit}>
            <FaCamera className="text-yellow-700" size={18} />
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleLogoChange}
            />
          </label>
        </div>
        <div className="flex flex-col items-center flex-1 px-2" />
        <div className="flex flex-col items-center">
          <div className="bg-white p-0 rounded-xl shadow border-2 w-[90px] h-[90px] flex items-center justify-center"
            style={{ borderColor: goldBorder }}>
            <StyledQRCode key={companyId} value={companyId || "NO-ID"} size={82} />
          </div>
          <span className="mt-1 text-[11px] font-mono font-bold tracking-widest" style={{ color: goldMain }}>
            {companyId || "NO-ID"}
          </span>
        </div>
      </div>

      {/* بيانات الشركة */}
      <div className="flex flex-col items-center justify-center mt-6 mb-2 px-4 relative z-10">
        <span className="font-bold text-lg text-gray-800 text-center w-full truncate" title={name}>
          {name}
        </span>
        <span className="text-sm text-gray-600 mt-2 text-center w-full">
          {t.emirate}: <span className="font-bold" style={{ color: goldMain }}>{emirate}</span>
        </span>
        <span className="text-sm text-gray-600 mt-2 text-center w-full">
          {t.email}: <span className="font-bold" style={{ color: goldMain }}>{email}</span>
        </span>
      </div>

      {/* تاريخ الانتهاء ورقم الشركة */}
      <div className="flex items-end justify-between px-4 pb-4 mt-2 relative z-10">
        <div className="flex flex-col items-end ml-2">
          <span className="text-[13px] font-bold text-gray-700">{t.expiryDate}</span>
          <span className="text-[15px] font-extrabold" style={{ color: expiring ? goldDark : goldMain }}>
            {expireDate}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <div className="mt-1 flex items-center gap-2">
            {editingId ? (
              <>
                <input
                  className="border border-yellow-300 rounded px-1 text-xs font-mono w-[110px]"
                  value={newCompanyId}
                  onChange={e => setNewCompanyId(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") handleCompanyIdSave(); if (e.key === "Escape") setEditingId(false); }}
                />
                <button onClick={handleCompanyIdSave} className="text-yellow-700 text-xs font-bold px-1 rounded hover:bg-yellow-50">{t.save}</button>
                <button onClick={() => setEditingId(false)} className="text-red-500 text-xs font-bold px-1 rounded hover:bg-red-50">
                  {t.cancel}
                </button>
              </>
            ) : (
              <>
                <span
                  className={`text-[12px] text-gray-500 font-mono font-bold tracking-widest transition ${expiring ? "cursor-pointer hover:text-yellow-700" : ""}`}
                  title={expiring ? t.editCompanyId : ""}
                  onClick={expiring ? () => setEditingId(true) : undefined}
                  style={expiring ? { cursor: "pointer" } : {}}
                >
                  {companyId}
                </span>
                {expiring && (
                  <FaEdit
                    className="text-yellow-700 ml-1 cursor-pointer"
                    size={13}
                    onClick={() => setEditingId(true)}
                    title={t.editCompanyId}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* زر واحد يفتح المودال الموحد */}
      <div className="flex justify-end items-center px-4 pb-3 relative z-10">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-full"
          style={{
            background: goldMain,
            borderColor: goldDark,
            color: "#fff",
            boxShadow: "0 1px 4px #0002",
            fontWeight: "bold",
            cursor: "pointer"
          }}
          title={t.upload}
        >
          <FaCloudUploadAlt /> {t.upload}
        </button>
      </div>

      {/* المودال */}
      {showModal && (
        <CompanyCardModal
          onSave={handleModalSave}
          onClose={() => setShowModal(false)}
          locale={lang}
          logo={logo}
        />
      )}
    </div>
  );
}