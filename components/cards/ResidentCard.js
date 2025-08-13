"use client";
import { useState, useEffect } from "react";
import StyledQRCode from "@/components/StyledQRCode";
import { FaBell, FaCamera, FaCloudUploadAlt, FaSpinner } from "react-icons/fa";
import Image from "next/image";
import EditModal from "./EditModal";
// Firestore imports
import { firestore } from "@/lib/firebase.client";
import { doc, updateDoc } from "firebase/firestore";

function getFullName(client, lang = "ar") {
  if (!client) return "";
  if (lang === "ar") {
    return [client.firstName, client.middleName, client.lastName]
      .filter(Boolean).join(" ");
  }
  if (client.nameEn) return client.nameEn;
  return [client.firstName, client.middleName, client.lastName]
    .filter(Boolean).join(" ");
}

function ResidentCard({
  client = {},
  lang = "ar",
}) {
  const {
    userId,
    name,
    nationality,
    eidExpiry,
    profilePic,
    qrClientCardUrl,
    type,
    idNumber,
    showExpiryAlert,
    firstName,
    middleName,
    lastName,
    nameEn,
    customerId,
  } = client;

  // حالة الصورة المحلية
  const [localProfilePic, setLocalProfilePic] = useState(profilePic || "/default-avatar.png");
  const [loadingPic, setLoadingPic] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // مراقبة وصول بيانات العميل وحقل الصورة
  useEffect(() => {
    // لو تغيرت صورة العميل في الداتا الخارجية يتم تحديث الحالة المحلية
    if (profilePic && profilePic !== localProfilePic) {
      setLocalProfilePic(profilePic);
    }
  }, [profilePic, client]);

  const APP_LOGO = "/logo-transparent-large.png";

  const t = {
    ar: {
      cardTitle: "بطاقة تأهيل",
      cardType: !type ? "" : type === "resident" ? "مقيم" : type,
      expired: "⚠️ انتهت صلاحية الإقامة! يرجى التجديد فوراً.",
      expiresToday: "⚠️ تنتهي الإقامة اليوم!",
      expiresIn: (n) => `تنبيه: ستنتهي الإقامة خلال ${n} يوم${n === 1 ? "" : "ًا"}!`,
      expiryDate: "تاريخ انتهاء الإقامة",
      nationality: "الجنسية",
      birthDate: "تاريخ الميلاد",
      frozen: "❄️ البطاقة مجمدة بسبب انتهاء الإقامة منذ أكثر من شهر",
      update: "تحديث البيانات",
      uploadProfile: loadingPic ? "جاري رفع الصورة..." : "تغيير الصورة",
      uploadProfileDone: "تم رفع الصورة بنجاح",
      uploadProfileError: "حدث خطأ أثناء رفع الصورة",
      uploadDoc: "رفع/فحص مستند",
      customerId: "رقم العميل",
    },
    en: {
      cardTitle: "Taheel Card",
      cardType: !type ? "" : type === "resident" ? "Resident" : type,
      expired: "⚠️ The residency has expired! Please renew immediately.",
      expiresToday: "⚠️ The residency expires today!",
      expiresIn: (n) => `Alert: Residency will expire in ${n} day${n === 1 ? "" : "s"}!`,
      expiryDate: "Residency Expiry Date",
      nationality: "Nationality",
      birthDate: "Birth Date",
      frozen: "❄️ Card is frozen due to residency expiration for more than a month",
      update: "Update Data",
      uploadProfile: loadingPic ? "Uploading..." : "Change Photo",
      uploadProfileDone: "Photo uploaded successfully",
      uploadProfileError: "Error uploading photo",
      uploadDoc: "Upload/Scan Document",
      customerId: "Customer ID",
    },
  }[lang === "en" ? "en" : "ar"];

  // منطق انتهاء الإقامة
  let diffDays = null, daysSinceExpiry = null, expiring = false, expired = false, frozen = false;
  if (eidExpiry) {
    const expire = new Date(eidExpiry);
    const now = new Date();
    diffDays = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
    daysSinceExpiry = Math.ceil((now - expire) / (1000 * 60 * 60 * 24));
    expiring = showExpiryAlert || diffDays <= 30;
    expired = diffDays < 0;
    frozen = daysSinceExpiry > 30;
  }

  // رفع صورة البروفايل
  const handleAvatarChange = async (e) => {
    if (e.target.files && e.target.files[0] && userId) {
      setLoadingPic(true);
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', userId);

      try {
        const res = await fetch('/api/upload-to-gcs', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');

        // تعيين الصورة الجديدة فوراً (الحالة المحلية فقط)
        setLocalProfilePic(data.url);

        // تحديث الرابط في فايربيز
        await updateDoc(doc(firestore, "users", userId), { profilePic: data.url });

        setLoadingPic(false);
        alert(t.uploadProfileDone);
      } catch (err) {
        setLoadingPic(false);
        alert(t.uploadProfileError);
        console.error("Error uploading avatar:", err);
      }
    }
  };

  // عند تحديث المستندات
  const handleAttachmentSave = () => {
    setShowModal(false);
  };

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div
      className={`relative w-[370px] max-w-full mx-auto rounded-3xl shadow-2xl border-2 overflow-hidden print:border-emerald-800 print:shadow-none
        ${frozen ? "opacity-70 grayscale" : "border-emerald-600 bg-gradient-to-tr from-[#f7fafc] via-[#e9f9f6] to-[#b8f7ed]"}`}
      dir={dir}
      lang={lang}
    >
      {/* علامة مائية وسط الكارت */}
      {qrClientCardUrl && (
        <img
          src={qrClientCardUrl}
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
      )}

      {/* إشعار انتهاء الإقامة أو تجميد البطاقة */}
      {frozen ? (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-r from-gray-500 to-blue-400 text-white px-3 py-1 rounded-t-3xl text-xs font-bold z-20">
          {t.frozen}
        </div>
      ) : expiring ? (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-white px-3 py-1 rounded-t-3xl text-xs font-bold z-20 animate-pulse">
          <FaBell className="inline mr-1" />
          {expired
            ? t.expired
            : diffDays === 0
              ? t.expiresToday
              : t.expiresIn(diffDays)
          }
        </div>
      ) : null}

      {/* اللوجو الثابت */}
      <div className="w-full flex justify-center items-center mt-5 mb-1 z-10 relative">
        <div className="w-16 h-16 rounded-full bg-white border border-emerald-200 flex items-center justify-center shadow-sm">
          <Image src={APP_LOGO} width={56} height={56} alt="logo" />
        </div>
      </div>

      {/* العنوانين */}
      <div className="flex flex-col items-center justify-center mb-2 relative z-10">
        <span className="text-emerald-700 font-extrabold text-lg mb-1">{t.cardTitle}</span>
        <span className="text-emerald-700 font-extrabold text-base">{t.cardType}</span>
      </div>

      {/* الخط الجانبي الزخرفي */}
      <div className="absolute left-0 top-0 h-full w-2 rounded-l-3xl bg-gradient-to-b from-emerald-400 to-emerald-700 z-10" />

      {/* صورة وQR */}
      <div className="flex items-center justify-between px-6 pt-0 pb-2 gap-2 relative z-10" style={{ marginTop: "-40px" }}>
        {/* الصورة */}
        <div className="relative group">
          {/* علامة تحميل أثناء رفع الصورة */}
          {loadingPic && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl z-20">
              <FaSpinner className="animate-spin h-8 w-8 text-emerald-700" />
            </div>
          )}
          <Image
            src={localProfilePic || "/default-avatar.png"}
            width={90}
            height={90}
            alt={name || "avatar"}
            className="rounded-xl border-2 border-emerald-700 bg-gray-200 object-cover"
            onLoad={() => console.log("Profile image loaded:", localProfilePic)}
            onError={() => console.log("Profile image failed to load:", localProfilePic)}
          />
          {/* زر الكاميرا لتغيير الصورة */}
          <label className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-md border border-emerald-300 cursor-pointer group-hover:opacity-100 transition z-10" title={t.uploadProfile}>
            <FaCamera className="text-emerald-700" size={18} />
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
              disabled={loadingPic}
            />
          </label>
        </div>
        <div className="flex flex-col items-center flex-1 px-2" />
        {/* QR */}
        <div className="flex flex-col items-center">
          <div className="bg-white p-0 rounded-xl shadow border-2 border-emerald-100 w-[90px] h-[90px] flex items-center justify-center">
            {client.customerId ? (
              <StyledQRCode value={client.customerId} logo={APP_LOGO} size={82} />
            ) : (
              <div className="text-gray-300 text-6xl">-</div>
            )}
          </div>
          <span className="mt-1 text-[11px] text-gray-500 font-mono font-bold tracking-widest">
            {client.customerId || "-"}
          </span>
        </div>
      </div>

      {/* بيانات العميل */}
      <div className="flex flex-col items-center justify-center mt-6 mb-2 px-4 relative z-10">
        <span className="font-bold text-lg text-gray-800 text-center w-full truncate" title={getFullName(client, lang)}>
          {getFullName(client, lang) || "-"}
        </span>
        <span className="text-sm text-gray-500 mt-2 text-center w-full">
          {t.customerId}: <span className="font-bold text-emerald-800">{customerId || client.customerId || "-"}</span>
        </span>
        <span className="text-sm text-gray-500 mt-2 text-center w-full">
          {t.nationality}: <span className="font-bold text-emerald-800">{nationality || client.nationality || "-"}</span>
        </span>
        <span className="text-sm text-gray-500 mt-2 text-center w-full">
          {t.birthDate}: <span className="font-bold">{client.birthDate || client.birthdate || "-"}</span>
        </span>
      </div>

      {/* تاريخ انتهاء الإقامة */}
      <div className="flex items-end justify-between px-4 pb-4 mt-2 relative z-10">
        <div className="flex flex-col items-end ml-2">
          <span className="text-[13px] font-bold text-gray-700">{t.expiryDate}</span>
          <span className={`text-[15px] font-extrabold ${expiring ? "text-orange-600" : "text-emerald-700"}`}>
            {eidExpiry || client.eidExpiry || "-"}
          </span>
        </div>
      </div>

      {/* زر رفع/فحص مستند (يفتح المودال فقط) */}
      <div className="flex justify-end items-center px-4 pb-3 relative z-10">
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full
            ${frozen ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-500 hover:bg-emerald-600 cursor-pointer"} text-white shadow border border-emerald-700 transition font-bold`}
          title={t.uploadDoc}
          disabled={frozen}
        >
          <FaCloudUploadAlt /> {t.uploadDoc}
        </button>
      </div>

      {/* المودال للمستندات فقط */}
      {showModal && (
        <EditModal
          onSave={handleAttachmentSave}
          onClose={() => setShowModal(false)}
          locale={lang}
        />
      )}
    </div>
  );
}

export { ResidentCard };