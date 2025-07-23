'use client';

import { motion, AnimatePresence } from "framer-motion";
import { FaRegCalendarAlt } from "react-icons/fa";
import NationalitySelect from "@/components/NationalitySelect";
import { doc, updateDoc } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";

// دالة حفظ البيانات الشخصية في نفس وثيقة المستخدم في كولكشن users
async function savePersonalInfo(userId, data) {
  try {
    await updateDoc(doc(db, "users", userId), {
      ...data,
      personalInfoUpdatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Firestore Error:", err);
    alert("حدث خطأ أثناء حفظ البيانات الشخصية");
  }
}

export default function PersonalInfoStep({
  form,
  onChange,
  onNext,
  onBack,
  lang,
  t,
  userId // الآن يجب تمرير userId من الأب
}) {
  const type = form.accountType;

  const inputClass =
    "border border-gray-300 rounded-xl px-3 py-2 font-bold bg-gray-50 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-200 outline-none shadow placeholder:text-gray-400 transition-all w-full";

  const genderOptions = [
    { value: "", label: lang === "ar" ? "اختر الجنس" : "Select Gender" },
    { value: "male", label: t?.male ?? (lang === "ar" ? "ذكر" : "Male") },
    { value: "female", label: t?.female ?? (lang === "ar" ? "أنثى" : "Female") },
    { value: "other", label: t?.other ?? (lang === "ar" ? "أخرى" : "Other") }
  ];

  // التعديل هنا: حفظ البيانات عند الضغط على "التالي"
  async function handleNext() {
    if (type === "company" && !form.ownerGender) {
      alert(lang === "ar" ? "يرجى اختيار الجنس للمالك" : "Please select owner gender");
      return;
    }
    if (!form.gender && (type !== "company")) {
      alert(lang === "ar" ? "يرجى اختيار الجنس" : "Please select a gender");
      return;
    }
    if (userId) {
      await savePersonalInfo(userId, form);
    }
    onNext();
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`personal-info-${type}`}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-6 bg-white rounded-2xl px-4 py-6 shadow-xl"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <h2 className="font-extrabold text-2xl text-emerald-700 mb-4 text-center">
          {lang === "ar" ? "البيانات الشخصية" : "Personal Information"}
        </h2>

        {/* بيانات الشركة لو النوع شركة */}
        {type === "company" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-2">
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "اسم الشركة بالعربية (إلزامي)" : "Company Name (Arabic) (Required)"}
                value={form.companyNameAr || ""}
                onChange={e => onChange({ companyNameAr: e.target.value })}
                autoComplete="organization"
                required
              />
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "اسم الشركة بالإنجليزية (إلزامي)" : "Company Name (English) (Required)"}
                value={form.companyNameEn || ""}
                onChange={e => onChange({ companyNameEn: e.target.value })}
                dir="ltr"
                autoComplete="organization"
                required
              />
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "رقم الرخصة التجارية أو الصناعية" : "Trade/Industrial License Number"}
                value={form.companyLicenseNumber || ""}
                onChange={e => onChange({ companyLicenseNumber: e.target.value })}
                dir="ltr"
                required
              />
              <div className="relative w-full">
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  {lang === "ar" ? "تاريخ تسجيل الشركة" : "Company Registration Date"}
                </label>
                <input
                  className={inputClass + " pr-10"}
                  type="date"
                  value={form.companyRegistrationDate || ""}
                  onChange={e => onChange({ companyRegistrationDate: e.target.value })}
                  required
                  style={{ WebkitAppearance: "none", appearance: "none" }}
                />
                <FaRegCalendarAlt className="absolute right-3 top-7 text-emerald-400 pointer-events-none text-lg" />
              </div>
            </div>

            {/* بيانات المالك بشكل منظم */}
            <div className="border rounded-xl p-4 mb-2 bg-gray-50">
              <h3 className="font-bold text-emerald-700 mb-3 text-lg text-center">
                {lang === "ar" ? "بيانات المالك" : "Owner Information"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <input
                  className={inputClass}
                  placeholder={lang === "ar" ? "الاسم الأول" : "First Name"}
                  value={form.ownerFirstName || ""}
                  onChange={e => onChange({ ownerFirstName: e.target.value })}
                  required
                />
                <input
                  className={inputClass}
                  placeholder={lang === "ar" ? "الاسم الأوسط" : "Middle Name"}
                  value={form.ownerMiddleName || ""}
                  onChange={e => onChange({ ownerMiddleName: e.target.value })}
                  required
                />
                <input
                  className={inputClass}
                  placeholder={lang === "ar" ? "الاسم الأخير" : "Last Name"}
                  value={form.ownerLastName || ""}
                  onChange={e => onChange({ ownerLastName: e.target.value })}
                  required
                />
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* تاريخ ميلاد المالك */}
                <div className="relative w-full">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    {lang === "ar" ? "تاريخ ميلاد المالك" : "Owner Birth Date"}
                  </label>
                  <input
                    className={inputClass + " pr-10"}
                    type="date"
                    value={form.ownerBirthDate || ""}
                    onChange={e => onChange({ ownerBirthDate: e.target.value })}
                    required
                    style={{ WebkitAppearance: "none", appearance: "none" }}
                  />
                  <FaRegCalendarAlt className="absolute right-3 top-7 text-emerald-400 pointer-events-none text-lg" />
                </div>
                {/* الجنسية والجنس في صف واحد منسق */}
                <NationalitySelect
                  label={lang === "ar" ? "الجنسية" : "Nationality"}
                  placeholder={lang === "ar" ? "الجنسية (إلزامي)" : "Nationality (Required)"}
                  value={form.ownerNationality || ""}
                  onChange={opt => onChange({ ownerNationality: opt?.value })}
                  required
                />
                <select
                  className={inputClass}
                  value={form.ownerGender ?? ""}
                  onChange={e => onChange({ ownerGender: e.target.value })}
                  required
                >
                  {genderOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* بيانات فردية (مقيم/غير مقيم) */}
        {(type === "resident" || type === "nonresident") && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "الاسم الأول (إلزامي)" : "First Name (Required)"}
                value={form.firstName || ""}
                onChange={e => onChange({ firstName: e.target.value })}
                required
                autoComplete="given-name"
              />
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "الاسم الأخير (إلزامي)" : "Last Name (Required)"}
                value={form.lastName || ""}
                onChange={e => onChange({ lastName: e.target.value })}
                required
                autoComplete="family-name"
              />
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "الاسم الأوسط (إلزامي)" : "Middle Name (Required)"}
                value={form.middleName || ""}
                onChange={e => onChange({ middleName: e.target.value })}
                required
                autoComplete="additional-name"
              />
            </div>

            <input
              className={inputClass}
              placeholder={lang === "ar" ? "اسم العميل بالإنجليزية كما في الباسبور" : "English Name (as in Passport)"}
              value={form.nameEn || ""}
              onChange={e => onChange({ nameEn: e.target.value })}
              dir="ltr"
              autoComplete="off"
              required
            />

            {/* حقل تاريخ الميلاد مع label واضح */}
            <div className="relative w-full">
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {lang === "ar" ? "تاريخ الميلاد" : "Birth Date"}
              </label>
              <input
                className={inputClass + " pr-10"}
                type="date"
                value={form.birthDate || ""}
                onChange={e => onChange({ birthDate: e.target.value })}
                autoComplete="bday"
                required
                style={{ WebkitAppearance: "none", appearance: "none" }}
              />
              <FaRegCalendarAlt className="absolute right-3 top-7 text-emerald-400 pointer-events-none text-lg" />
            </div>

            {type === "resident" && (
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "رقم الإقامة - 784-0000-0000000-0" : "Residence ID Number - 784-0000-0000000-0"}
                value={form.eidNumber || ""}
                onChange={e => onChange({ eidNumber: e.target.value })}
                dir="ltr"
                maxLength={19}
                autoComplete="off"
                required
              />
            )}

            <NationalitySelect
              label={lang === "ar" ? "الجنسية" : "Nationality"}
              placeholder={lang === "ar" ? "الجنسية (إلزامي)" : "Nationality (Required)"}
              value={form.nationality || ""}
              onChange={opt => onChange({ nationality: opt?.value })}
              required
            />

            <select
              className={inputClass}
              value={form.gender ?? ""}
              onChange={e => onChange({ gender: e.target.value })}
              required
            >
              {genderOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        )}
        {/* الأزرار تحت بعض في عمود */}
        <div className="flex flex-col gap-3 mt-7 justify-center items-center">
          <button
            type="button"
            className="bg-gray-100 text-emerald-700 px-6 py-2 rounded-xl font-bold shadow hover:bg-gray-200 transition border border-emerald-300 w-full max-w-xs"
            onClick={onBack}
            style={{ cursor: "pointer" }}
          >
            {lang === "ar" ? "رجوع" : "Back"}
          </button>
          <button
            type="button"
            className="bg-gradient-to-r from-emerald-700 via-emerald-500 to-green-700 text-white px-7 py-2 rounded-xl font-bold shadow-lg hover:brightness-110 hover:scale-[1.02] transition border-none w-full max-w-xs"
            onClick={handleNext}
            style={{ cursor: "pointer" }}
          >
            {lang === "ar" ? "التالي" : "Next"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}