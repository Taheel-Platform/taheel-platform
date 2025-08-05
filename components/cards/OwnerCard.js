"use client";
import { useEffect, useState } from "react";
import StyledQRCode from "@/components/StyledQRCode";
import { FaBell, FaCamera, FaSpinner } from "react-icons/fa";
import Image from "next/image";

// Firestore imports
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function OwnerCard({
  companyId,
  lang = "ar",
}) {
  // حالة تحميل البيانات
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  // صورة المالك (كصورة شخصية)
  const [localPhoto, setLocalPhoto] = useState("/profile-user.png");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // جلب بيانات المالك من فايرستور (داخل وثيقة الشركة)
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        const ref = doc(firestore, "users", companyId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setOwner({ ...data });
          setLocalPhoto(data.ownerPhoto || "/profile-user.png");
        } else {
          setOwner(null);
        }
      } catch (e) {
        setOwner(null);
      }
      setLoading(false);
    };
    fetchData();
  }, [companyId]);

  // نصوص
  const t = {
    ar: {
      cardTitle: "بطاقة مالك الشركة",
      cardType: "مالك شركة",
      expired: "⚠️ انتهت صلاحية الإقامة! يرجى التجديد فوراً.",
      expiresToday: "⚠️ تنتهي الإقامة اليوم!",
      expiresIn: (n) => `تنبيه: ستنتهي الإقامة خلال ${n} يوم${n === 1 ? "" : "ًا"}!`,
      expiryDate: "تاريخ انتهاء الإقامة",
      nationality: "الجنسية",
      gender: "الجنس",
      email: "البريد الإلكتروني",
      phone: "رقم الجوال",
      upload: "تعديل صورة المالك",
      edit: "تعديل",
      uploadingPhoto: "جاري رفع الصورة...",
      photoUploaded: "تم رفع الصورة بنجاح",
      photoUploadError: "فشل رفع الصورة",
      notFound: "لم يتم العثور على بيانات المالك",
    },
    en: {
      cardTitle: "Company Owner Card",
      cardType: "Company Owner",
      expired: "⚠️ The residence has expired! Please renew immediately.",
      expiresToday: "⚠️ The residence expires today!",
      expiresIn: (n) => `Alert: The residence will expire in ${n} day${n === 1 ? "" : "s"}!`,
      expiryDate: "Residence Expiry Date",
      nationality: "Nationality",
      gender: "Gender",
      email: "Email",
      phone: "Mobile Number",
      upload: "Edit Owner Photo",
      edit: "Edit",
      uploadingPhoto: "Uploading photo...",
      photoUploaded: "Photo uploaded successfully",
      photoUploadError: "Photo upload failed",
      notFound: "No owner data found",
    },
  }[lang === "en" ? "en" : "ar"];

  // تاريخ الانتهاء (الإقامة)
  const expireDate = owner?.ownerEidExpiry || "2026-06-01";
  const expire = new Date(expireDate);
  const now = new Date();
  const diffDays = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
  const expiring = diffDays <= 30;
  const expired = diffDays < 0;

  // رفع صورة المالك وتحديثها في فايرستور
  const handlePhotoChange = async (e) => {
    if (e.target.files && e.target.files[0] && owner) {
      setUploadingPhoto(true);
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', companyId + "-owner");
      let url = localPhoto;
      try {
        const res = await fetch('/api/upload-to-gcs', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
        url = data.url;
        setLocalPhoto(url);
        await updateDoc(doc(firestore, "users", companyId), { ownerPhoto: url });
        setOwner((prev) => ({ ...prev, ownerPhoto: url }));
        setUploadingPhoto(false);
      } catch (error) {
        setUploadingPhoto(false);
        alert(t.photoUploadError);
      }
    }
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  // لون مختلف وهادئ (بنفسجي-أزرق)
  const main = "#6e8cf4";
  const border = "#b1c6f3";
  const dark = "#4664a7";
  const gradFrom = "#f4f7ff";
  const gradVia = "#dde6fa";
  const gradTo = "#b1c6f3";

  if (loading)
    return <div style={{ textAlign: "center", padding: "1.5em" }}>...جاري تحميل بيانات المالك</div>;
  if (!owner)
    return <div style={{ textAlign: "center", padding: "1.5em", color: "#d11" }}>{t.notFound}</div>;

  return (
    <div
      className="relative w-[370px] max-w-full mx-auto rounded-3xl shadow-2xl border-2 overflow-hidden print:shadow-none"
      style={{
        borderColor: main,
        background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradVia} 60%, ${gradTo} 100%)`,
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
        <div className="absolute top-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-r from-blue-700 to-blue-400 text-white px-3 py-1 rounded-t-3xl text-xs font-bold z-20 animate-pulse">
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
          style={{ borderColor: border }}>
          <Image src="/logo-transparent-large.png" width={56} height={56} alt="Taheel Logo" />
        </div>
      </div>

      {/* عناوين */}
      <div className="flex flex-col items-center justify-center mb-2 relative z-10">
        <span className="font-extrabold text-lg mb-1" style={{ color: main }}>{t.cardTitle}</span>
        <span className="font-extrabold text-base" style={{ color: main }}>{t.cardType}</span>
      </div>

      {/* ديكور جانبي */}
      <div className="absolute left-0 top-0 h-full w-2 rounded-l-3xl"
        style={{ background: `linear-gradient(to bottom, ${main} 0%, ${dark} 100%)`, zIndex: 10 }} />

      {/* صورة وQR */}
      <div className="flex items-center justify-between px-6 pt-0 pb-2 gap-2 relative z-10" style={{ marginTop: "-40px" }}>
        <div className="relative group">
          <Image src={localPhoto} width={90} height={90} alt="صورة المالك" className="rounded-xl border-2" style={{ borderColor: main, backgroundColor: "#f7f7f7" }} />
          {/* زر الكاميرا لتغيير الصورة */}
          <label className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-md border border-blue-400 cursor-pointer group-hover:opacity-100 transition z-10" title={t.edit}>
            {uploadingPhoto ? (
              <FaSpinner className="text-blue-700 animate-spin" size={18} />
            ) : (
              <FaCamera className="text-blue-700" size={18} />
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
              disabled={uploadingPhoto}
            />
          </label>
        </div>
        <div className="flex flex-col items-center flex-1 px-2" />
        <div className="flex flex-col items-center">
          <div className="bg-white p-0 rounded-xl shadow border-2 w-[90px] h-[90px] flex items-center justify-center"
            style={{ borderColor: border }}>
            <StyledQRCode key={owner.ownerEidNumber} value={owner.ownerEidNumber || "NO-EID"} size={82} />
          </div>
          <span className="mt-1 text-[11px] font-mono font-bold tracking-widest" style={{ color: main }}>
            {owner.ownerEidNumber || "NO-EID"}
          </span>
        </div>
      </div>

      {/* بيانات المالك */}
      <div className="flex flex-col items-center justify-center mt-6 mb-2 px-4 relative z-10">
        <span className="font-bold text-lg text-gray-800 text-center w-full truncate" title={owner.ownerFirstName + " " + owner.ownerMiddleName + " " + owner.ownerLastName}>
          {owner.ownerFirstName + " " + owner.ownerMiddleName + " " + owner.ownerLastName}
        </span>
        <span className="text-sm text-gray-600 mt-2 text-center w-full">
          {t.nationality}: <span className="font-bold" style={{ color: main }}>{owner.ownerNationality || "غير محددة"}</span>
        </span>
        <span className="text-sm text-gray-600 mt-2 text-center w-full">
          {t.gender}: <span className="font-bold" style={{ color: main }}>{owner.ownerGender || "غير محدد"}</span>
        </span>
        <span className="text-sm text-gray-600 mt-2 text-center w-full">
          {t.email}: <span className="font-bold" style={{ color: main }}>{owner.ownerEmail || "غير محدد"}</span>
        </span>
        <span className="text-sm text-gray-600 mt-2 text-center w-full">
          {t.phone}: <span className="font-bold" style={{ color: main }}>{owner.ownerPhone || "غير محدد"}</span>
        </span>
      </div>

      {/* تاريخ الانتهاء ورقم الإقامة */}
      <div className="flex items-end justify-between px-4 pb-4 mt-2 relative z-10">
        <div className="flex flex-col items-end ml-2">
          <span className="text-[13px] font-bold text-gray-700">{t.expiryDate}</span>
          <span className="text-[15px] font-extrabold" style={{ color: expiring ? dark : main }}>
            {expireDate}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[12px] text-gray-500 font-mono font-bold tracking-widest transition">
            {owner.ownerEidNumber}
          </span>
        </div>
      </div>
    </div>
  );
}