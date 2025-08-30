import React, { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const PREFIXES = [
  { key: "RES", labelAr: "مقيم", labelEn: "Resident" },
  { key: "NON", labelAr: "غير مقيم", labelEn: "Non-Resident" },
  { key: "COM", labelAr: "شركة", labelEn: "Company" }
];

export default function ServicesManagementSection({ employeeData, lang }) {
  // حقول البحث
  const [prefix, setPrefix] = useState("RES");
  const [clientNumber, setClientNumber] = useState(""); // مثال: 200-9180
  const [fullClientId, setFullClientId] = useState("");
  const [client, setClient] = useState(null);

  // الخدمات
  const [services, setServices] = useState([]);
  const [otherServices, setOtherServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedService, setSelectedService] = useState(null);

  // معالجة الإدخال: إضافة "-" تلقائي بعد أول 3 أرقام
  function handleClientNumberChange(e) {
    let value = e.target.value.replace(/\D/g, ""); // فقط أرقام
    if (value.length > 7) value = value.slice(0, 7); // حد أقصى 7 أرقام
    let formatted = value;
    if (value.length > 3) {
      formatted = value.slice(0, 3) + '-' + value.slice(3);
    }
    setClientNumber(formatted);
  }

  // تكوين رقم العميل النهائي عند الكتابة
  useEffect(() => {
    // لو الرقم كامل (3 أرقام + 4 أرقام)
    const isValid = /^\d{3}-\d{4}$/.test(clientNumber);
    setFullClientId(isValid ? `${prefix}-${clientNumber}` : "");
  }, [prefix, clientNumber]);

  // البحث عن العميل تلقائي عند اكتمال الرقم
  useEffect(() => {
    async function fetchClient() {
      if (!fullClientId || fullClientId.length < 12) {
        setClient(null);
        setServices([]);
        setOtherServices([]);
        return;
      }
      const docRef = doc(firestore, "users", fullClientId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setClient({ ...data, customerId: snap.id });
        const type = data.accountType || data.type;
        fetchServicesForType(type);
        fetchOtherServices();
      } else {
        setClient(null);
        setServices([]);
        setOtherServices([]);
      }
      setSelectedServiceId("");
      setSelectedService(null);
    }
    fetchClient();
    // eslint-disable-next-line
  }, [fullClientId]);

  // جلب الخدمات حسب النوع
  async function fetchServicesForType(type) {
    if (!type) return setServices([]);
    const q = query(collection(firestore, "services"), where("type", "==", type));
    const snap = await getDocs(q);
    let arr = [];
    snap.forEach(doc => {
      arr.push({ id: doc.id, ...doc.data() });
    });
    setServices(arr);
  }

  // جلب الخدمات الأخرى
  async function fetchOtherServices() {
    const q = query(collection(firestore, "services"), where("type", "==", "other"));
    const snap = await getDocs(q);
    let arr = [];
    snap.forEach(doc => {
      arr.push({ id: doc.id, ...doc.data() });
    });
    setOtherServices(arr);
  }

  // اختيار الخدمة
  useEffect(() => {
    if (!selectedServiceId) return setSelectedService(null);
    const all = [...services, ...otherServices];
    const srv = all.find(s => s.id === selectedServiceId);
    setSelectedService(srv || null);
  }, [selectedServiceId, services, otherServices]);

  // جدول التفاصيل
  function DetailsTable() {
    if (!client) return null;
    return (
      <table className="w-full mt-6 rounded-xl overflow-hidden shadow border border-emerald-300 bg-white animate-fade-in">
        <thead className="bg-emerald-50">
          <tr>
            <th className="p-3 text-emerald-800 font-bold">{lang === "ar" ? "العنصر" : "Item"}</th>
            <th className="p-3 text-emerald-800 font-bold">{lang === "ar" ? "القيمة" : "Value"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-3 font-bold">{lang === "ar" ? "اسم العميل" : "Client Name"}</td>
            <td className="p-3">{client.firstName} {client.lastName}</td>
          </tr>
          <tr>
            <td className="p-3 font-bold">{lang === "ar" ? "رقم العميل" : "Client ID"}</td>
            <td className="p-3">{client.customerId}</td>
          </tr>
          <tr>
            <td className="p-3 font-bold">{lang === "ar" ? "نوع العميل" : "Client Type"}</td>
            <td className="p-3">{client.accountType || client.type}</td>
          </tr>
          {selectedService && (
            <>
              <tr>
                <td className="p-3 font-bold">{lang === "ar" ? "الخدمة" : "Service"}</td>
                <td className="p-3">{selectedService.name}</td>
              </tr>
              <tr>
                <td className="p-3 font-bold">{lang === "ar" ? "السعر" : "Price"}</td>
                <td className="p-3">{selectedService.price} AED</td>
              </tr>
              <tr>
                <td className="p-3 font-bold">{lang === "ar" ? "وصف الخدمة" : "Description"}</td>
                <td className="p-3">{selectedService.desc}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    );
  }

  // التصميم النهائي ثابت وأنيق
  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-extrabold text-emerald-700 mb-8 text-center tracking-tight drop-shadow">
        {lang === "ar" ? "إنشاء خدمة للعميل" : "Create Client Service"}
      </h2>
      <form className="bg-white/95 rounded-xl shadow-xl p-8 flex flex-row gap-4 items-center justify-center" style={{ minHeight: 110 }}>
        {/* نوع العميل */}
        <div className="flex flex-col items-start w-40">
          <label className="font-bold text-emerald-800 mb-1">{lang === "ar" ? "نوع العميل" : "Client Type"}</label>
          <select
            className="border-2 rounded-xl px-3 py-2 w-full shadow focus:outline-emerald-500 text-lg font-bold text-emerald-900 bg-white"
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
          >
            {PREFIXES.map(p => (
              <option key={p.key} value={p.key}>{lang === "ar" ? p.labelAr : p.labelEn}</option>
            ))}
          </select>
        </div>
        {/* رقم العميل */}
        <div className="flex flex-col items-start w-40">
          <label className="font-bold text-emerald-800 mb-1">{lang === "ar" ? "رقم العميل" : "Client Number"}</label>
          <div className="relative w-full">
            <input
              type="text"
              value={clientNumber}
              onChange={handleClientNumberChange}
              placeholder={lang === "ar" ? "مثال: 2009180" : "e.g. 2009180"}
              className="border-2 rounded-xl px-5 py-3 w-full shadow focus:outline-emerald-500 text-lg font-bold text-emerald-900 tracking-widest bg-white text-center"
              maxLength={8}
              style={{ letterSpacing: "2px" }}
              autoComplete="off"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400">
              <FaSearch />
            </span>
          </div>
          {/* عرض رقم العميل النهائي تحت الحقل */}
          <div className="mt-2 text-emerald-700 font-bold text-base text-center w-full select-all">
            {fullClientId}
          </div>
        </div>
        {/* قائمة الخدمات تظهر إذا وجد العميل */}
        <div className="flex flex-col items-start w-56">
          <label className="font-bold text-emerald-800 mb-1">{lang === "ar" ? "الخدمة" : "Service"}</label>
          <select
            className="border-2 rounded-xl px-4 py-3 shadow text-lg font-bold text-emerald-900 bg-white"
            value={selectedServiceId}
            onChange={e => setSelectedServiceId(e.target.value)}
            disabled={!client}
          >
            <option value="">{lang === "ar" ? "-- اختر الخدمة --" : "-- Select Service --"}</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            {otherServices.length > 0 && (
              <optgroup label={lang === "ar" ? "خدمات أخرى" : "Other Services"}>
                {otherServices.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </form>
      {/* جدول التفاصيل */}
      <div className="rounded-xl bg-white/95 p-5 shadow-lg border border-emerald-100 mt-6">
        {client && <DetailsTable />}
        {fullClientId.length >= 12 && !client && (
          <div className="text-red-600 font-bold text-center py-6 text-lg">
            {lang === "ar" ? "العميل غير موجود أو البيانات غير صحيحة." : "Client not found or incorrect info."}
          </div>
        )}
        {!client && !fullClientId && (
          <div className="text-gray-500 text-center py-4">
            {lang === "ar" ? "يرجى إدخال رقم العميل لعرض التفاصيل." : "Please enter Client ID to show details."}
          </div>
        )}
      </div>
    </div>
  );
}