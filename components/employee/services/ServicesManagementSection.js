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
  // البحث المركب للعميل
  const [prefix, setPrefix] = useState("RES");
  const [firstPart, setFirstPart] = useState("");
  const [secondPart, setSecondPart] = useState("");
  const [fullClientId, setFullClientId] = useState("");
  const [client, setClient] = useState(null);

  // الخدمات
  const [services, setServices] = useState([]);
  const [otherServices, setOtherServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedService, setSelectedService] = useState(null);

  // -------- بناء رقم العميل تلقائي --------
  useEffect(() => {
    if (firstPart.length === 3 && !secondPart) {
      setSecondPart("");
    }
    if (firstPart.length > 3) {
      setFirstPart(firstPart.slice(0, 3));
    }
    if (secondPart.length > 4) {
      setSecondPart(secondPart.slice(0, 4));
    }
    setFullClientId(`${prefix}-${firstPart}${firstPart ? "-" : ""}${secondPart}`);
  }, [prefix, firstPart, secondPart]);

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
    if (!client || !selectedService) return null;
    return (
      <table className="w-full mt-6 rounded-xl overflow-hidden shadow border border-indigo-100 bg-white animate-fade-in">
        <thead className="bg-indigo-50">
          <tr>
            <th className="p-3 text-indigo-700">{lang === "ar" ? "العنصر" : "Item"}</th>
            <th className="p-3 text-indigo-700">{lang === "ar" ? "القيمة" : "Value"}</th>
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
        </tbody>
      </table>
    );
  }

  // -------- الواجهة --------
  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-extrabold text-indigo-700 mb-6 text-center tracking-tight">
        {lang === "ar" ? "إنشاء خدمة للعميل" : "Create Client Service"}
      </h2>
      <div className="flex flex-row gap-4 items-end mb-6 flex-wrap">
        {/* اختيار البريفكس */}
        <div className="flex flex-col">
          <label className="font-bold text-indigo-800 mb-1">{lang === "ar" ? "نوع" : "Prefix"}</label>
          <select
            className="border rounded-lg px-3 py-2 w-28 shadow focus:outline-indigo-500"
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
          >
            {PREFIXES.map(p => (
              <option key={p.key} value={p.key}>{lang === "ar" ? p.labelAr : p.labelEn}</option>
            ))}
          </select>
        </div>
        {/* أول 3 أرقام */}
        <div className="flex flex-col">
          <label className="font-bold text-indigo-800 mb-1">{lang === "ar" ? "أول 3 أرقام" : "First 3 Digits"}</label>
          <input
            type="number"
            value={firstPart}
            onChange={e => setFirstPart(e.target.value.replace(/\D/g, ""))}
            className="border rounded-lg px-3 py-2 w-24 shadow focus:outline-indigo-500 text-center"
            maxLength={3}
            min={0}
            max={999}
          />
        </div>
        {/* آخر 4 أرقام */}
        <div className="flex flex-col">
          <label className="font-bold text-indigo-800 mb-1">{lang === "ar" ? "آخر 4 أرقام" : "Last 4 Digits"}</label>
          <input
            type="number"
            value={secondPart}
            onChange={e => setSecondPart(e.target.value.replace(/\D/g, ""))}
            className="border rounded-lg px-3 py-2 w-28 shadow focus:outline-indigo-500 text-center"
            maxLength={4}
            min={0}
            max={9999}
          />
        </div>
        {/* زر البحث */}
        <div>
          <button
            className="px-5 py-2 rounded-full font-bold text-lg shadow-lg bg-indigo-600 hover:bg-indigo-800 text-white"
            onClick={() => setFullClientId(`${prefix}-${firstPart}${firstPart ? "-" : ""}${secondPart}`)}
            disabled={!firstPart || !secondPart}
          >
            <FaSearch /> {lang === "ar" ? "بحث" : "Search"}
          </button>
        </div>
        {/* نوع العميل يظهر تلقائي */}
        <div className="flex flex-col">
          <label className="font-bold text-indigo-800 mb-1">{lang === "ar" ? "نوع العميل" : "Client Type"}</label>
          <input
            type="text"
            value={client?.accountType || client?.type || ""}
            readOnly
            className="border rounded-lg px-3 py-2 w-32 shadow bg-gray-100 text-gray-700"
            placeholder={lang === "ar" ? "..." : "..."}
          />
        </div>
        {/* قائمة الخدمات تظهر تلقائي */}
        <div className="flex flex-col">
          <label className="font-bold text-indigo-800 mb-1">{lang === "ar" ? "الخدمة" : "Service"}</label>
          <select
            className="border rounded-lg px-3 py-2 w-48 shadow"
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
      {/* جدول التفاصيل */}
      {client && selectedService && <DetailsTable />}
      {/* رسالة لو العميل غير موجود */}
      {fullClientId.length >= 12 && !client && (
        <div className="mt-6 text-red-600 font-bold text-center">
          {lang === "ar" ? "العميل غير موجود أو البيانات غير صحيحة." : "Client not found or incorrect info."}
        </div>
      )}
    </div>
  );
}