'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaRegCalendarAlt } from "react-icons/fa";
import NationalitySelect from "@/components/NationalitySelect";

// حاسبة العمر
function calcAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// تنسيق رقم الإقامة: 784-0000-0000000-0
function formatEIDNumber(value) {
  // فقط أرقام
  let digits = value.replace(/[^\d]/g, '').slice(0, 15);
  let parts = [];
  parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 7));
  if (digits.length > 7) parts.push(digits.slice(7, 14));
  if (digits.length > 14) parts.push(digits.slice(14, 15));
  return parts.filter(Boolean).join('-');
}

export default function PersonalInfoStep({
  form,
  onChange,
  onNext,
  onBack,
  lang,
  t,
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

  // العمر الحالي
  const age = calcAge(type === "company" ? form.ownerBirthDate : form.birthDate);

  // التحقق من كل الحقول
  function validateAllRequired() {
    if (type === "company") {
      return (
        form.companyNameAr &&
        form.companyNameEn &&
        form.companyLicenseNumber &&
        form.companyRegistrationDate &&
        form.ownerFirstName &&
        form.ownerMiddleName &&
        form.ownerLastName &&
        form.ownerBirthDate &&
        form.ownerNationality &&
        form.ownerGender &&
        (!form.ownerBirthDate || calcAge(form.ownerBirthDate) >= 18)
      );
    } else {
      const isResident = type === "resident";
      return (
        form.firstName &&
        form.lastName &&
        form.middleName &&
        form.nameEn &&
        form.birthDate &&
        form.nationality &&
        form.gender &&
        (!form.birthDate || calcAge(form.birthDate) >= 18) &&
        (!isResident || (form.eidNumber && form.eidExpiry)) &&
        form.passportNumber &&
        form.passportExpiry
      );
    }
  }

  function handleNext() {
    // تحقق من السن
    if (type === "company") {
      if (!form.ownerBirthDate || calcAge(form.ownerBirthDate) < 18) {
        alert(lang === "ar" ? "عمر المالك يجب ألا يقل عن 18 سنة" : "Owner must be at least 18 years old");
        return;
      }
    } else {
      if (!form.birthDate || calcAge(form.birthDate) < 18) {
        alert(lang === "ar" ? "العمر يجب ألا يقل عن 18 سنة" : "You must be at least 18 years old");
        return;
      }
    }
    if (!validateAllRequired()) {
      alert(lang === "ar" ? "يرجى تعبئة جميع الحقول الإلزامية" : "Please fill in all required fields");
      return;
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
                required
              />
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "اسم الشركة بالإنجليزية (إلزامي)" : "Company Name (English) (Required)"}
                value={form.companyNameEn || ""}
                onChange={e => onChange({ companyNameEn: e.target.value })}
                dir="ltr"
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
                  {/* عرض العمر */}
                  {form.ownerBirthDate && (
                    <span className="text-xs text-emerald-700 font-bold mt-2 block">
                      {lang === "ar"
                        ? `العمر الحالي: ${calcAge(form.ownerBirthDate) || "--"} سنة`
                        : `Current age: ${calcAge(form.ownerBirthDate) || "--"} years`}
                    </span>
                  )}
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

            {/* حقل تاريخ الميلاد مع label واضح + حساب العمر */}
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
              {/* عرض العمر */}
              {form.birthDate && (
                <span className="text-xs text-emerald-700 font-bold mt-2 block">
                  {lang === "ar"
                    ? `العمر الحالي: ${age || "--"} سنة`
                    : `Current age: ${age || "--"} years`}
                </span>
              )}
            </div>

            {/* رقم الإقامة وتاريخ انتهائها (للمقيم فقط) */}
            {type === "resident" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <input
                  className={inputClass}
                  placeholder="784-0000-0000000-0"
                  value={form.eidNumber || ""}
                  onChange={e => onChange({ eidNumber: formatEIDNumber(e.target.value) })}
                  dir="ltr"
                  maxLength={19}
                  required
                />
                <div className="relative w-full">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    {lang === "ar" ? "تاريخ انتهاء الإقامة" : "Residence Expiry Date"}
                  </label>
                  <input
                    className={inputClass + " pr-10"}
                    type="date"
                    value={form.eidExpiry || ""}
                    onChange={e => onChange({ eidExpiry: e.target.value })}
                    required
                    style={{ WebkitAppearance: "none", appearance: "none" }}
                  />
                  <FaRegCalendarAlt className="absolute right-3 top-7 text-emerald-400 pointer-events-none text-lg" />
                </div>
              </div>
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

            {/* رقم الباسبور وتاريخ انتهائه */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "رقم جواز السفر" : "Passport Number"}
                value={form.passportNumber || ""}
                onChange={e => onChange({ passportNumber: e.target.value })}
                dir="ltr"
                required
              />
              <div className="relative w-full">
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  {lang === "ar" ? "تاريخ انتهاء جواز السفر" : "Passport Expiry Date"}
                </label>
                <input
                  className={inputClass + " pr-10"}
                  type="date"
                  value={form.passportExpiry || ""}
                  onChange={e => onChange({ passportExpiry: e.target.value })}
                  required
                  style={{ WebkitAppearance: "none", appearance: "none" }}
                />
                <FaRegCalendarAlt className="absolute right-3 top-7 text-emerald-400 pointer-events-none text-lg" />
              </div>
            </div>
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