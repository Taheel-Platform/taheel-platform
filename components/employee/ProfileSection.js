"use client";
import { useState } from "react";
import StyledQRCode from "@/components/StyledQRCode";
import { FaCamera, FaCopy, FaDownload } from "react-icons/fa";
import Image from "next/image";
import { firestore } from "@/lib/firebase.client";
import { doc, updateDoc } from "firebase/firestore";

export default function ProfileSection({ employeeData, lang = "ar" }) {
  // يجب أن تكون كل الـ hooks في أعلى الدالة
  const [avatar, setAvatar] = useState(employeeData?.profilePic || "/default-avatar.png");
  const [loading, setLoading] = useState(false);

  // إذا لم تصل البيانات بعد، لا تعرض الكارت
  if (!employeeData) return <div>جاري تحميل البيانات...</div>;

  // دمج uid لو مش موجود
  const employee = { ...employeeData, uid: employeeData.uid || employeeData.id };

  const {
    uid = "",
    employeeNumber = "",
    name = "اسم الموظف",
    jobTitle = "المسمى الوظيفي",
    email = "example@email.com",
    phone = "",
    profilePic = "/default-avatar.png",
    registeredAt = "",
    qrValue = "",
    logo = "/logo-transparent-large.png",
  } = employee;

  const t = {
    ar: {
      cardTitle: "بطاقة موظف",
      cardType: "موظف",
      number: "الرقم الوظيفي",
      name: "الاسم",
      job: "المسمى الوظيفي",
      email: "البريد الإلكتروني",
      phone: "الجوال",
      registered: "تاريخ التسجيل",
      editPhoto: "تغيير الصورة",
      copy: "نسخ البيانات",
      download: "تحميل كارت PDF",
      uploading: "جاري الرفع...",
    },
    en: {
      cardTitle: "Employee Card",
      cardType: "Employee",
      number: "Employee No.",
      name: "Name",
      job: "Job Title",
      email: "Email",
      phone: "Phone",
      registered: "Registered At",
      editPhoto: "Change Photo",
      copy: "Copy Info",
      download: "Download PDF",
      uploading: "Uploading...",
    }
  }[lang === "en" ? "en" : "ar"];

  // تغيير الصورة الشخصية
  const handleAvatarChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      if (!uid) {
        alert(lang === "ar" ? "معرّف المستخدم غير متوفر" : "User ID is missing");
        return;
      }
      setLoading(true);
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", uid);

      let url = avatar;
      try {
        const res = await fetch("/api/upload-to-gcs", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
        url = data.url;
        setAvatar(url);
        await updateDoc(doc(firestore, "users", uid), { profilePic: url });
      } catch (error) {
        console.error(error);
        alert(
          (lang === "ar" ? "حدث خطأ أثناء رفع الصورة: " : "Error uploading photo: ")
          + (error?.message || error)
        );
      }
      setLoading(false);
    }
  };

  // نسخ بيانات الكارت
  const handleCopy = () => {
    const info = `
${t.cardTitle}
${t.number}: ${employeeNumber}
${t.name}: ${name}
${t.job}: ${jobTitle}
${t.email}: ${email}
${t.phone}: ${phone}
${t.registered}: ${registeredAt}
    `;
    navigator.clipboard.writeText(info);
  };

  // تحميل الكارت PDF
  const handleDownload = () => {
    window.print();
  };

  // ألوان وتصميم
  const mainColor = "#4338ca";
  const gradFrom = "#e7e9fb";
  const gradVia = "#f6f7fc";
  const gradTo = "#eef2fb";
  const accentColor = "#312e81";
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div
      className={`relative w-[370px] max-w-full mx-auto rounded-3xl shadow-2xl border-2 overflow-hidden print:shadow-none`}
      style={{
        borderColor: mainColor,
        background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradVia} 60%, ${gradTo} 100%)`,
      }}
      dir={dir}
      lang={lang}
    >
      {/* علامة مائية */}
      <img
        src={logo}
        alt="Taheel Logo Watermark"
        className="absolute left-1/2 top-1/2 pointer-events-none select-none"
        style={{
          width: 220,
          height: 220,
          opacity: 0.08,
          transform: "translate(-50%,-50%)",
          zIndex: 0,
          userSelect: "none"
        }}
      />

      {/* الهيدر */}
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

      {/* جانب ملون يسار */}
      <div className="absolute left-0 top-0 h-full w-2 rounded-l-3xl"
        style={{ background: `linear-gradient(to bottom, ${mainColor} 0%, ${accentColor} 100%)`, zIndex: 10 }} />

      {/* صورة الموظف + QR */}
      <div className="flex items-center justify-between px-6 pt-0 pb-2 gap-2 relative z-10" style={{ marginTop: "-40px" }}>
        <div className="relative group">
          <Image src={avatar} width={90} height={90} alt={name} className="rounded-xl border-2" style={{ borderColor: mainColor, backgroundColor: "#f5fafd" }} />
          <label className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-md border border-indigo-300 cursor-pointer group-hover:opacity-100 transition z-10" title={t.editPhoto}>
            <FaCamera className="text-indigo-700" size={18} />
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
              disabled={loading}
            />
          </label>
          {loading && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs bg-white px-2 py-1 rounded shadow border font-bold">{t.uploading}</span>
          )}
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-indigo-700 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow">{employeeNumber}</span>
        </div>
        <div className="flex flex-col items-center flex-1 px-2" />
        <div className="flex flex-col items-center">
          <div className="bg-white p-0 rounded-xl shadow border-2" style={{ borderColor: gradTo, width: 90, height: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <StyledQRCode value={qrValue || employeeNumber} logo={logo} size={82} />
          </div>
          <span className="mt-1 text-[11px] text-gray-500 font-mono font-bold tracking-widest">{employeeNumber}</span>
        </div>
      </div>

      {/* بيانات الموظف */}
      <div className="flex flex-col items-center justify-center mt-6 mb-2 px-4 relative z-10">
        <span className="font-bold text-lg text-gray-800 text-center w-full truncate" title={name}>
          {name}
        </span>
        <span className="text-sm text-gray-500 mt-2 text-center w-full">
          {t.job}: <span className="font-bold" style={{ color: mainColor }}>{jobTitle}</span>
        </span>
        <span className="text-sm text-gray-500 mt-2 text-center w-full">
          {t.email}: <span className="font-bold">{email}</span>
        </span>
        <span className="text-sm text-gray-500 mt-2 text-center w-full">
          {t.phone}: <span className="font-bold">{phone}</span>
        </span>
        <span className="text-sm text-gray-500 mt-2 text-center w-full">
          {t.registered}: <span className="font-bold">{registeredAt?.split("T")[0]}</span>
        </span>
      </div>

      {/* أزرار الأكشن */}
      <div className="flex justify-end items-center px-4 pb-3 relative z-10 gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-indigo-50 hover:bg-indigo-200 text-indigo-700 border border-indigo-200 font-bold shadow"
        >
          <FaCopy /> {t.copy}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-800 text-white border border-indigo-800 font-bold shadow print:hidden"
        >
          <FaDownload /> {t.download}
        </button>
      </div>
    </div>
  );
}