import React, { useState, useEffect } from "react";
import { FaSearch, FaClipboardList } from "react-icons/fa";
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const PREFIXES = [
  { key: "RES", labelAr: "مقيم", labelEn: "Resident" },
  { key: "NON", labelAr: "غير مقيم", labelEn: "Non-Resident" },
  { key: "COM", labelAr: "شركة", labelEn: "Company" }
];

export default function ServicesManagementSection({ employeeData, lang }) {
  // حقل موحد للبحث (prefix + باقي الرقم)
  const [inputValue, setInputValue] = useState("");
  const [fullClientId, setFullClientId] = useState("");
  const [prefix, setPrefix] = useState("RES");
  const [client, setClient] = useState(null);

  // الخدمات
  const [services, setServices] = useState([]);
  const [otherServices, setOtherServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedService, setSelectedService] = useState(null);

  // -------- معالجة إدخال الموظف --------
  function handleInputChange(e) {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    // افصل البريفكس
    let foundPrefix = PREFIXES.find(p => value.startsWith(p.key));
    let prefixVal = foundPrefix ? foundPrefix.key : prefix;
    setPrefix(prefixVal);

    // شيل البريفكس من القيمة
    let rest = foundPrefix ? value.slice(prefixVal.length) : value;
    // ادخل الـ - بعد أول 3 أرقام (أو أقل)
    let firstNum = rest.slice(0, 3);
    let lastNum = rest.slice(3, 7);

    // كوّن الشكل النهائي للرقم
    let clientId = `${prefixVal}-${firstNum}${firstNum.length === 3 ? "-" : ""}${lastNum}`;
    setInputValue(value); // الأصلية للكتابة
    setFullClientId(clientId);
  }

  // -------- البحث عن العميل تلقائي --------
  useEffect(() => {
    async function fetchClient() {
      if (fullClientId.length < 12) {
        setClient(null);
        setServices([]);
        setOtherServices([]);
        return;
      }
      // جلب بيانات العميل
      const docRef = doc(firestore, "users", fullClientId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setClient({ ...data, customerId: snap.id });
        // جلب الخدمات المناسبة لهذا النوع
        const type = data.accountType || data.type;
        fetchServicesForType(type);
        fetchOtherServices(type);
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

  // -------- جلب الخدمات حسب النوع --------
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

  // -------- جلب الخدمات الأخرى --------
  async function fetchOtherServices(type) {
    const q = query(collection(firestore, "services"), where("type", "==", "other"));
    const snap = await getDocs(q);
    let arr = [];
    snap.forEach(doc => {
      arr.push({ id: doc.id, ...doc.data() });
    });
    setOtherServices(arr);
  }

  // -------- اختيار الخدمة --------
  useEffect(() => {
    if (!selectedServiceId) return setSelectedService(null);
    const all = [...services, ...otherServices];
    const srv = all.find(s => s.id === selectedServiceId);
    setSelectedService(srv || null);
  }, [selectedServiceId, services, otherServices]);

  // -------- جدول تفاصيل --------
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

  // -------- الواجهة --------
  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-extrabold text-emerald-700 mb-8 text-center tracking-tight drop-shadow">
        {lang === "ar" ? "إنشاء خدمة للعميل" : "Create Client Service"}
      </h2>
      <div className="flex flex-col gap-6 items-center mb-6">
        {/* حقل بحث موحد */}
        <div className="w-full flex flex-row gap-3 items-end">
          <div className="flex flex-col flex-1">
            <label className="font-bold text-emerald-800 mb-1">{lang === "ar" ? "رقم العميل" : "Client ID"}</label>
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder={lang === "ar" ? "مثال: RES2009180" : "e.g. RES2009180"}
                className="border-2 rounded-xl px-5 py-3 w-full shadow focus:outline-emerald-500 text-lg font-bold text-emerald-900 tracking-widest bg-white"
                maxLength={11}
                style={{ letterSpacing: "2px" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                <FaSearch />
              </span>
            </div>
            {/* عرض الرقم النهائي للعميل */}
            <div className="mt-2 text-emerald-700 font-bold text-base">
              {fullClientId}
            </div>
          </div>
          {/* قائمة الخدمات تظهر إذا وجد العميل */}
          <div className="flex flex-col flex-1">
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
        </div>
      </div>
      {/* جدول التفاصيل */}
      <div className="rounded-xl bg-white/95 p-5 shadow-lg border border-emerald-100">
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