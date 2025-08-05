"use client";
import { useEffect, useState } from "react";
import StyledQRCode from "@/components/StyledQRCode";
import { FaBell, FaCamera, FaEdit, FaCloudUploadAlt, FaSpinner } from "react-icons/fa";
import Image from "next/image";

// Firestore imports
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function OwnerCard({
  ownerId,
  companyId,
  lang = "ar",
}) {
  // حالة تحميل البيانات
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  // صورة المالك
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
          // بيانات المالك داخل وثيقة الشركة
          setOwner({
            ownerFirstName: data.ownerFirstName || "",
            ownerMiddleName: data.ownerMiddleName || "",
            ownerLastName: data.ownerLastName || "",
            ownerNameEn: data.ownerNameEn || "",
            ownerBirthDate: data.ownerBirthDate || "",
            ownerNationality: data.ownerNationality || "",
            ownerGender: data.ownerGender || "",
            ownerPassportNumber: data.ownerPassportNumber || "",
            ownerPassportExpiry: data.ownerPassportExpiry || "",
            ownerEidNumber: data.ownerEidNumber || "",
            ownerEidExpiry: data.ownerEidExpiry || "",
            ownerPhoto: data.ownerPhoto || "/profile-user.png",
            ownerEmail: data.ownerEmail || "",
            ownerPhone: data.ownerPhone || "",
            ownerId: data.ownerId || "",
          });
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
      expired: "⚠️ انتهت صلاحية الهوية! يرجى التجديد فوراً.",
      expiresToday: "⚠️ تنتهي الهوية اليوم!",
      expiresIn: (n) => `تنبيه: ستنتهي الهوية خلال ${n} يوم${n === 1 ? "" : "ًا"}!`,
      expiryDate: "تاريخ انتهاء جواز السفر",
      nationality: "الجنسية",
      gender: "الجنس",
      passport: "جواز السفر",
      eid: "الإقامة",
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
      expired: "⚠️ The ID has expired! Please renew immediately.",
      expiresToday: "⚠️ The ID expires today!",
      expiresIn: (n) => `Alert: The ID will expire in ${n} day${n === 1 ? "" : "s"}!`,
      expiryDate: "Passport Expiry Date",
      nationality: "Nationality",
      gender: "Gender",
      passport: "Passport",
      eid: "Residence ID",
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

  // تاريخ الانتهاء (جواز السفر)
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
        // حفظ الرابط الجديد في فايرستور
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
  // لون احترافي - أزرق-بنفسجي متدرج أنيق
  const main = "#5069d6";
  const border = "#3a4a7c";
  const dark = "#2d3568";
  const gradFrom = "#eaf1ff";
  const gradVia = "#dbe3ff";
  const gradTo = "#b6b6ee";

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
        <div className="absolute top-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-r from-indigo-700 to-blue-400 text-white px-3 py-1 rounded-t-3xl text-xs font-bold z-20 animate-pulse">
          <FaBell className="inline mr-1" />
          {expired
            ? t.expired
            : diffDays === 0
              ? t.expiresToday
              : t.expiresIn(diffDays)
          }
        </div>
      )}

      {/* صورة المالك */}
      <div className="w-full flex justify-center items-center mt-5 mb-1 z-10 relative">
        <div className="w-20 h-20 rounded-full bg-white border flex items-center justify-center shadow-sm"
          style={{ borderColor: border }}>
          <Image src={localPhoto} width={76} height={76}
            alt={owner.ownerFirstName + " " + owner.ownerLastName}
            className="rounded-full border border-indigo-200 object-cover"
          />
          {/* زر الكاميرا لتغيير الصورة */}
          <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md border border-indigo-300 cursor-pointer group-hover:opacity-100 transition z-10" title={t.edit}>
            {uploadingPhoto ? (
              <FaSpinner className="text-indigo-600 animate-spin" size={18} />
            ) : (
              <FaCamera className="text-indigo-600" size={18} />
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
      </div>

      {/* عناوين */}
      <div className="flex flex-col items-center justify-center mb-2 relative z-10">
        <span className="font-extrabold text-lg mb-1" style={{ color: main }}>{t.cardTitle}</span>
        <span className="font-extrabold text-base" style={{ color: main }}>{t.cardType}</span>
      </div>

      {/* ديكور جانبي */}
      <div className="absolute left-0 top-0 h-full w-2 rounded-l-3xl"
        style={{ background: `linear-gradient(to bottom, ${main} 0%, ${dark} 100%)`, zIndex: 10 }} />

      {/* QR كود ورقم جواز السفر */}
      <div className="flex items-center justify-between px-6 pt-0 pb-2 gap-2 relative z-10" style={{ marginTop: "-40px" }}>
        <div className="flex flex-col items-center flex-1 px-2" />
        <div className="flex flex-col items-center">
          <div className="bg-white p-0 rounded-xl shadow border-2 w-[90px] h-[90px] flex items-center justify-center"
            style={{ borderColor: border }}>
            <StyledQRCode
              key={owner.ownerPassportNumber}
              value={owner.ownerPassportNumber || "NO-PASS"}
              size={82}
            />
          </div>
          <span className="mt-1 text-[11px] font-mono font-bold tracking-widest" style={{ color: main }}>
            {owner.ownerPassportNumber || "NO-PASS"}
          </span>
        </div>
      </div>

      {/* بيانات المالك */}
      <div className="flex flex-col items-center justify-center mt-4 mb-2 px-4 relative z-10">
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

      {/* تاريخ انتهاء جواز السفر */}
      <div className="flex items-end justify-between px-4 pb-4 mt-2 relative z-10">
        <div className="flex flex-col items-end ml-2">
          <span className="text-[13px] font-bold text-gray-700">{t.expiryDate}</span>
          <span className="text-[15px] font-extrabold" style={{ color: expiring ? dark : main }}>
            {expireDate}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[12px] text-gray-500 font-mono font-bold tracking-widest transition">
            {owner.ownerPassportNumber}
          </span>
        </div>
      </div>
    </div>
  );
}