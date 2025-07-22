'use client';

import CountrySelect from "@/components/CountrySelect";

const UAE_EMIRATES = [
  { value: "dubai", labelAr: "دبي", labelEn: "Dubai" },
  { value: "abudhabi", labelAr: "أبوظبي", labelEn: "Abu Dhabi" },
  { value: "sharjah", labelAr: "الشارقة", labelEn: "Sharjah" },
  { value: "ajman", labelAr: "عجمان", labelEn: "Ajman" },
  { value: "ummalquwain", labelAr: "أم القيوين", labelEn: "Umm Al Quwain" },
  { value: "rasalkhaimah", labelAr: "رأس الخيمة", labelEn: "Ras Al Khaimah" },
  { value: "fujairah", labelAr: "الفجيرة", labelEn: "Fujairah" },
];

// ترجمة نوع الحساب
const accountTypeBadge = {
  resident: { ar: "مقيم", en: "Resident", color: "emerald" },
  nonresident: { ar: "غير مقيم", en: "Non Resident", color: "blue" },
  company: { ar: "شركة", en: "Company", color: "yellow" }
};

export default function AddressStep({ form, onChange, onNext, onBack, lang, t }) {
  const inputClass =
    "w-full border border-gray-300 rounded-xl px-3 py-2 font-bold bg-gray-50 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-200 outline-none shadow placeholder:text-gray-400 transition-all";
  const selectClass =
    inputClass + " cursor-pointer";

  const isUae = form.accountType === "resident" || form.accountType === "company";
  const badge = accountTypeBadge[form.accountType];

  return (
    <div className="flex flex-col gap-6 bg-white rounded-2xl px-4 py-6 shadow-xl animate-fade-in"
         dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* عنوان العنوان مع شارة نوع الحساب */}
      <div className="flex items-center justify-between mb-2">
        {lang === "ar" ? (
          <>
            <span className={`inline-block text-xs font-bold px-2 py-1 rounded-full bg-${badge?.color}-100 text-${badge?.color}-800`}>
              {badge ? badge.ar : ""}
            </span>
            <h2 className="font-extrabold text-2xl text-emerald-700 text-center flex-1">{t.address}</h2>
          </>
        ) : (
          <>
            <h2 className="font-extrabold text-2xl text-emerald-700 text-center flex-1">{t.address}</h2>
            <span className={`inline-block text-xs font-bold px-2 py-1 rounded-full bg-${badge?.color}-100 text-${badge?.color}-800`}>
              {badge ? badge.en : ""}
            </span>
          </>
        )}
      </div>

      {/* مقيم/شركة */}
      {isUae ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1 w-full">
            <select
              className={selectClass}
              value={form.emirate || ""}
              onChange={e => onChange({ emirate: e.target.value })}
              required
              style={{ cursor: "pointer" }}
            >
              <option value="">
                {lang === "ar" ? "اختر الإمارة" : "Choose Emirate"}
              </option>
              {UAE_EMIRATES.map(em => (
                <option key={em.value} value={em.value}>
                  {lang === "ar" ? em.labelAr : em.labelEn}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full">
            <input
              className={inputClass}
              placeholder={lang === "ar" ? "الحي أو المنطقة" : "District / Area"}
              value={form.district || ""}
              onChange={e => onChange({ district: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <input
              className={inputClass}
              placeholder={lang === "ar" ? "اسم الشارع" : "Street Name"}
              value={form.street || ""}
              onChange={e => onChange({ street: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <input
              className={inputClass}
              placeholder={lang === "ar" ? "رقم البناية" : "Building Number"}
              value={form.building || ""}
              onChange={e => onChange({ building: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <input
              className={inputClass}
              placeholder={lang === "ar" ? "الدور" : "Floor"}
              value={form.floor || ""}
              onChange={e => onChange({ floor: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <input
              className={inputClass}
              placeholder={lang === "ar" ? "رقم الشقة" : "Apartment Number"}
              value={form.apartment || ""}
              onChange={e => onChange({ apartment: e.target.value })}
            />
          </div>
        </div>
      ) : (
        /* غير مقيم: الدولة بسطر كامل وباقي الحقول منسقة */
        <>
          <div className="flex flex-col gap-1 w-full mb-2">
            <CountrySelect
              label={null}
              placeholder={lang === "ar" ? "الدولة" : "Country"}
              value={form.country || ""}
              onChange={opt => onChange({ country: opt?.value })}
              required
              className={selectClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1 w-full">
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "المدينة" : "City"}
                value={form.city || ""}
                onChange={e => onChange({ city: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "الولاية / المحافظة" : "State / Province"}
                value={form.state || ""}
                onChange={e => onChange({ state: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "الحي أو المنطقة" : "District / Area"}
                value={form.district || ""}
                onChange={e => onChange({ district: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "اسم الشارع" : "Street Name"}
                value={form.street || ""}
                onChange={e => onChange({ street: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "رقم البناية" : "Building Number"}
                value={form.building || ""}
                onChange={e => onChange({ building: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1 w-full sm:col-span-2">
              <input
                className={inputClass}
                placeholder={lang === "ar" ? "رقم الشقة" : "Apartment Number"}
                value={form.apartment || ""}
                onChange={e => onChange({ apartment: e.target.value })}
              />
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
          onClick={onNext}
          style={{ cursor: "pointer" }}
        >
          {lang === "ar" ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}