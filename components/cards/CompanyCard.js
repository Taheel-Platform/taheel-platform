"use client";
import { useEffect, useState } from "react";
import StyledQRCode from "@/components/StyledQRCode";
import { FaBell, FaCamera, FaEdit, FaCloudUploadAlt, FaSpinner } from "react-icons/fa";
import Image from "next/image";
import CompanyCardModal from "./CompanyCardModal";

// Firestore imports
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function CompanyCardGold({
  companyId: initialCompanyId,
  lang = "ar",
}) {
  // حالة تحميل البيانات
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // شعار الشركة (لوجو)
  const [localLogo, setLocalLogo] = useState("/company-logo.png");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [editingId, setEditingId] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState(initialCompanyId);

  // جلب بيانات الشركة من فايرستور
  useEffect(() => {
    if (!initialCompanyId) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        const ref = doc(firestore, "users", initialCompanyId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setCompany({
            ...data,
            companyId: initialCompanyId,
          });
          setLocalLogo(data.logo || "/company-logo.png");
          setNewCompanyId(initialCompanyId);
        } else {
          setCompany(null);
        }
      } catch (e) {
        setCompany(null);
      }
      setLoading(false);
    };
    fetchData();
  }, [initialCompanyId]);

  // نصوص
  const t = {
    ar: {
      cardTitle: "بطاقة تأهيل",
      cardType: company?.accountType === "company" ? "شركة / مؤسسة" : (company?.accountType || "نوع غير محدد"),
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
      idNumber: company?.companyId || "",
      cancel: "إلغاء",
      save: "حفظ",
      uploadingLogo: "جاري رفع الشعار...",
      logoUploaded: "تم رفع الشعار بنجاح",
      logoUploadError: "فشل رفع الشعار",
      notFound: "لم يتم العثور على بيانات هذه الشركة",
    },
    en: {
      cardTitle: "Taheel Card",
      cardType: company?.accountType === "company" ? "Company / Organization" : (company?.accountType || "Unknown Type"),
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
      idNumber: company?.companyId || "",
      cancel: "Cancel",
      save: "Save",
      uploadingLogo: "Uploading logo...",
      logoUploaded: "Logo uploaded successfully",
      logoUploadError: "Logo upload failed",
      notFound: "No company data found",
    },
  }[lang === "en" ? "en" : "ar"];

  // تاريخ الانتهاء
  const expireDate = company?.companyRegistrationDate || "2026-06-01";
  const expire = new Date(expireDate);
  const now = new Date();
  const diffDays = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
  const expiring = diffDays <= 30;
  const expired = diffDays < 0;

  // رفع وتحديث لوجو الشركة في فايرستور
  const handleLogoChange = async (e) => {
    if (e.target.files && e.target.files[0] && company) {
      setUploadingLogo(true);
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', company.companyId);

      let url = localLogo;
      try {
        const res = await fetch('/api/upload-to-gcs', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
        url = data.url;
        setLocalLogo(url);
        // حفظ الرابط الجديد في فايرستور
        await updateDoc(doc(firestore, "users", company.companyId), { logo: url });
        setCompany((prev) => ({ ...prev, logo: url }));
        setUploadingLogo(false);
      } catch (error) {
        setUploadingLogo(false);
        alert(lang === "ar" ? t.logoUploadError : t.logoUploadError);
      }
    }
  };

  // تحديث رقم الشركة في فايرستور (نادراً ما يحتاجه المستخدم)
  const handleCompanyIdSave = async () => {
    if (!company) return;
    try {
      await updateDoc(doc(firestore, "users", company.companyId), { companyId: newCompanyId });
      setCompany((prev) => ({ ...prev, companyId: newCompanyId }));
      setEditingId(false);
    } catch (error) {
      alert(lang === "ar" ? "حدث خطأ أثناء تحديث رقم الشركة" : "Error updating company number");
    }
  };

  // استقبال نتيجة رفع جميع المستندات والرخصة التجارية
  const handleModalSave = (data) => {
    setShowModal(false);
    // يمكن التحديث لو أردت جلب الداتا من جديد بعد الحفظ
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  const goldMain = "#D4AF37";
  const goldBorder = "#c8b26b";
  const goldDark = "#ad943a";
  const goldGradFrom = "#fffbe8";
  const goldGradVia = "#fcedc3";
  const goldGradTo = "#b8a045";

  if (loading) return <div style={{textAlign:"center",padding:"1.5em"}}>...جاري تحميل بيانات الشركة</div>;
  if (!company) return <div style={{textAlign:"center",padding:"1.5em",color:"#d11"}}>{t.notFound}</div>;

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
        src="/logo-transparent-large.png"
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

      {/* اللوجو الثابت */}
      <div className="w-full flex justify-center items-center mt-5 mb-1 z-10 relative">
        <div className="w-16 h-16 rounded-full bg-white border flex items-center justify-center shadow-sm"
          style={{ borderColor: goldBorder }}>
          <Image src="/logo-transparent-large.png" width={56} height={56} alt="Taheel Logo" />
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
          <Image src={localLogo} width={90} height={90} alt={company.companyNameAr || company.companyNameEn || company.name || ""} className="rounded-xl border-2" style={{ borderColor: goldMain, backgroundColor: "#f7f7f7" }} />
          {/* زر الكاميرا لتغيير الشعار */}
          <label className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-md border border-yellow-400 cursor-pointer group-hover:opacity-100 transition z-10" title={t.edit}>
            {uploadingLogo ? (
              <FaSpinner className="text-yellow-700 animate-spin" size={18} />
            ) : (
              <FaCamera className="text-yellow-700" size={18} />
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleLogoChange}
              disabled={uploadingLogo}
            />
          </label>
        </div>
        <div className="flex flex-col items-center flex-1 px-2" />
        <div className="flex flex-col items-center">
          <div className="bg-white p-0 rounded-xl shadow border-2 w-[90px] h-[90px] flex items-center justify-center"
            style={{ borderColor: goldBorder }}>
            <StyledQRCode key={company.companyId} value={company.companyId || "NO-ID"} size={82} />
          </div>
          <span className="mt-1 text-[11px] font-mono font-bold tracking-widest" style={{ color: goldMain }}>
            {company.companyId || "NO-ID"}
          </span>
        </div>
      </div>

      {/* بيانات الشركة */}
      <div className="flex flex-col items-center justify-center mt-6 mb-2 px-4 relative z-10">
        <span className="font-bold text-lg text-gray-800 text-center w-full truncate" title={company.companyNameAr || company.companyNameEn || company.name}>
          {company.companyNameAr || company.companyNameEn || company.name}
        </span>
        <span className="text-sm text-gray-600 mt-2 text-center w-full">
          {t.emirate}: <span className="font-bold" style={{ color: goldMain }}>{company.city || "غير محددة"}</span>
        </span>
        <span className="text-sm text-gray-600 mt-2 text-center w-full">
          {t.email}: <span className="font-bold" style={{ color: goldMain }}>{company.email || "غير محدد"}</span>
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
                  {company.companyId}
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
          logo={localLogo}
        />
      )}
    </div>
  );
}