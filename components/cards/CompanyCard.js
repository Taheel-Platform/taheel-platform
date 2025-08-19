"use client";
import { useEffect, useState } from "react";
import StyledQRCode from "@/components/StyledQRCode";
import { FaBell, FaCamera, FaEdit, FaCloudUploadAlt, FaSpinner } from "react-icons/fa";
import Image from "next/image";
import CompanyCardModal from "./CompanyCardModal";

// Firestore
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

export default function CompanyCardGold({ companyId: initialCompanyId, lang = "ar" }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // شعار الشركة
  const [localLogo, setLocalLogo] = useState("/company-logo.png");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // تعديل رقم الشركة
  const [editingId, setEditingId] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState(initialCompanyId);

  // المعرّف الحقيقي لمستند فايرستور (قد يختلف عن companyId في حسابات قديمة)
  const [resolvedDocId, setResolvedDocId] = useState(initialCompanyId || "");

  // جلب بيانات الشركة من فايرستور مع Fallback ذكي
  useEffect(() => {
    if (!initialCompanyId) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        // 1) محاولة مباشرة: users/{initialCompanyId}
        let docId = initialCompanyId;
        let ref = doc(firestore, "users", docId);
        let snap = await getDoc(ref);

        // 2) Fallback بالبحث عن customerId أو companyId أو userId
        if (!snap.exists()) {
          const usersCol = collection(firestore, "users");

          // customerId == initialCompanyId
          let qs = await getDocs(query(usersCol, where("customerId", "==", initialCompanyId), limit(1)));
          if (!qs.empty) {
            const d = qs.docs[0];
            docId = d.id;
            snap = await getDoc(doc(firestore, "users", docId));
          } else {
            // companyId == initialCompanyId
            qs = await getDocs(query(usersCol, where("companyId", "==", initialCompanyId), limit(1)));
            if (!qs.empty) {
              const d = qs.docs[0];
              docId = d.id;
              snap = await getDoc(doc(firestore, "users", docId));
            } else {
              // userId == initialCompanyId
              qs = await getDocs(query(usersCol, where("userId", "==", initialCompanyId), limit(1)));
              if (!qs.empty) {
                const d = qs.docs[0];
                docId = d.id;
                snap = await getDoc(doc(firestore, "users", docId));
              }
            }
          }
        }

        if (!cancelled) {
          if (snap.exists()) {
            const data = snap.data() || {};
            const effectiveCompanyId =
              data.companyId || data.customerId || data.userId || initialCompanyId;

            setResolvedDocId(snap.id);
            setCompany({ ...data, companyId: effectiveCompanyId, customerId: data.customerId || snap.id });
            setLocalLogo(data.logo || "/company-logo.png");
            setNewCompanyId(effectiveCompanyId);
          } else {
            setCompany(null);
          }
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setCompany(null);
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
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

  // تقدير تاريخ الانتهاء بشكل آمن
  const derivedExpiry =
    company?.companyLicenseExpiry ||
    company?.license?.extracted?.expiryDate ||
    company?.documents?.license?.extracted?.expiryDate ||
    null;

  let diffDays = null;
  if (derivedExpiry) {
    const expire = new Date(derivedExpiry);
    const now = new Date();
    if (!isNaN(expire.getTime())) {
      diffDays = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
    }
  }
  const expiring = typeof diffDays === "number" && diffDays <= 30;
  const expired = typeof diffDays === "number" && diffDays < 0;

  const licenseUploaded = Boolean(
    company?.license?.success ||
    company?.documents?.license?.success
  );

  // رفع/تحديث الشعار
  const handleLogoChange = async (e) => {
    if (!company || !resolvedDocId) return;
    if (!(e.target.files && e.target.files[0])) return;

    setUploadingLogo(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    // نمرر معرف الشركة (Customer/Company Id) للتمييز
    formData.append("sessionId", company.companyId || company.customerId || resolvedDocId);

    try {
      const res = await fetch("/api/upload-to-gcs", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");

      const url = data.url;
      setLocalLogo(url);

      // حفظ الرابط الجديد
      await updateDoc(doc(firestore, "users", resolvedDocId), { logo: url });
      setCompany((prev) => ({ ...prev, logo: url }));
    } catch (error) {
      alert(t.logoUploadError);
    } finally {
      setUploadingLogo(false);
    }
  };

  // حفظ تعديل رقم الشركة (يُحدث الحقل داخل المستند الصحيح)
  const handleCompanyIdSave = async () => {
    if (!company || !resolvedDocId) return;
    try {
      await updateDoc(doc(firestore, "users", resolvedDocId), { companyId: newCompanyId });
      setCompany((prev) => ({ ...prev, companyId: newCompanyId }));
      setEditingId(false);
    } catch (error) {
      alert(lang === "ar" ? "حدث خطأ أثناء تحديث رقم الشركة" : "Error updating company number");
    }
  };

  const handleModalSave = () => setShowModal(false);

  const dir = lang === "ar" ? "rtl" : "ltr";
  const goldMain = "#D4AF37";
  const goldBorder = "#c8b26b";
  const goldDark = "#ad943a";
  const goldGradFrom = "#fffbe8";
  const goldGradVia = "#fcedc3";
  const goldGradTo = "#b8a045";

  if (loading) return <div style={{ textAlign: "center", padding: "1.5em" }}>...جاري تحميل بيانات الشركة</div>;
  if (!company) return <div style={{ textAlign: "center", padding: "1.5em", color: "#d11" }}>{t.notFound}</div>;

  const qrValue = company.companyId || company.customerId || initialCompanyId || "NO-ID";
  const displayExpiry = derivedExpiry || (lang === "ar" ? "غير متوفر" : "N/A");

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
          userSelect: "none",
        }}
      />

      {/* شريط تنبيه */}
      {typeof diffDays === "number" && diffDays <= 30 && (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-r from-yellow-700 to-yellow-400 text-white px-3 py-1 rounded-t-3xl text-xs font-bold z-20 animate-pulse">
          <FaBell className="inline mr-1" />
          {expired ? t.expired : diffDays === 0 ? t.expiresToday : t.expiresIn(diffDays)}
        </div>
      )}

      {/* اللوجو الثابت */}
      <div className="w-full flex justify-center items-center mt-5 mb-1 z-10 relative">
        <div className="w-16 h-16 rounded-full bg-white border flex items-center justify-center shadow-sm" style={{ borderColor: goldBorder }}>
          <Image src="/logo-transparent-large.png" width={56} height={56} alt="Taheel Logo" />
        </div>
      </div>

      {/* العناوين */}
      <div className="flex flex-col items-center justify-center mb-2 relative z-10">
        <span className="font-extrabold text-lg mb-1" style={{ color: goldMain }}>{t.cardTitle}</span>
        <span className="font-extrabold text-base" style={{ color: goldMain }}>{t.cardType}</span>
      </div>

      {/* ديكور جانبي */}
      <div className="absolute left-0 top-0 h-full w-2 rounded-l-3xl" style={{ background: `linear-gradient(to bottom, ${goldMain} 0%, ${goldDark} 100%)`, zIndex: 10 }} />

      {/* صورة + QR */}
      <div className="flex items-center justify-between px-6 pt-0 pb-2 gap-2 relative z-10" style={{ marginTop: "-40px" }}>
        <div className="relative group">
          <Image
            src={localLogo}
            width={90}
            height={90}
            alt={company.companyNameAr || company.companyNameEn || company.name || ""}
            className="rounded-xl border-2"
            style={{ borderColor: goldMain, backgroundColor: "#f7f7f7" }}
          />
          {/* زر تغيير الشعار */}
          <label className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-md border border-yellow-400 cursor-pointer group-hover:opacity-100 transition z-10" title={t.edit}>
            {uploadingLogo ? <FaSpinner className="text-yellow-700 animate-spin" size={18} /> : <FaCamera className="text-yellow-700" size={18} />}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoChange} disabled={uploadingLogo} />
          </label>
        </div>

        <div className="flex flex-col items-center flex-1 px-2" />

        <div className="flex flex-col items-center">
          <div className="bg-white p-0 rounded-xl shadow border-2 w-[90px] h-[90px] flex items-center justify-center" style={{ borderColor: goldBorder }}>
            <StyledQRCode key={qrValue} value={qrValue} size={82} />
          </div>
          <span className="mt-1 text-[11px] font-mono font-bold tracking-widest" style={{ color: goldMain }}>
            {qrValue}
          </span>
        </div>
      </div>

      {/* بيانات الشركة */}
      <div className="flex flex-col items-center justify-center mt-6 mb-2 px-4 relative z-10">
        <span className="font-bold text-lg text-gray-800 text-center w-full truncate" title={company.companyNameAr || company.companyNameEn || company.name}>
          {company.companyNameAr || company.companyNameEn || company.name}
        </span>
        <span className="text-sm text-gray-600 mt-2 text-center w-full">
          {t.emirate}: <span className="font-bold" style={{ color: goldMain }}>{company.emirate || company.city || (lang === "ar" ? "غير محددة" : "Unknown")}</span>
        </span>
        <span className="text-sm text-gray-600 mt-2 text-center w-full">
          {t.email}: <span className="font-bold" style={{ color: goldMain }}>{company.email || (lang === "ar" ? "غير محدد" : "Unknown")}</span>
        </span>
      </div>

      {/* تاريخ الانتهاء ورقم الشركة + حالة الرخصة */}
      <div className="flex items-end justify-between px-4 pb-4 mt-2 relative z-10">
        <div className="flex flex-col items-end ml-2">
          <span className="text-[13px] font-bold text-gray-700">{t.expiryDate}</span>
          <span className="text-[15px] font-extrabold" style={{ color: expiring ? goldDark : goldMain }}>
            {displayExpiry}
          </span>
          <span className="mt-1 text-[11px]" style={{ color: licenseUploaded ? "#16a34a" : "#9ca3af" }}>
            {licenseUploaded ? t.licenseUploaded : t.licenseNotUploaded}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className="mt-1 flex items-center gap-2">
            {editingId ? (
              <>
                <input
                    className="border border-yellow-300 rounded px-1 text-xs font-mono w-[120px]"
                    value={newCompanyId}
                    onChange={(e) => setNewCompanyId(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCompanyIdSave();
                      if (e.key === "Escape") setEditingId(false);
                    }}
                  />
                <button onClick={handleCompanyIdSave} className="text-yellow-700 text-xs font-bold px-1 rounded hover:bg-yellow-50">
                  {t.save}
                </button>
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

      {/* زر المودال */}
      <div className="flex justify-end items-center px-4 pb-3 relative z-10">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-full"
          style={{ background: goldMain, borderColor: goldDark, color: "#fff", boxShadow: "0 1px 4px #0002", fontWeight: "bold", cursor: "pointer" }}
          title={t.upload}
        >
          <FaCloudUploadAlt /> {t.upload}
        </button>
      </div>

      {showModal && (
        <CompanyCardModal onSave={handleModalSave} onClose={() => setShowModal(false)} locale={lang} logo={localLogo} />
      )}
    </div>
  );
}