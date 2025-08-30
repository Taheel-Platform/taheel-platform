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
  // البحث
  const [prefix, setPrefix] = useState("RES");
  const [clientNumber, setClientNumber] = useState("");
  const [fullClientId, setFullClientId] = useState("");
  const [client, setClient] = useState(null);

  // الخدمات
  const [services, setServices] = useState([]);
  const [otherServices, setOtherServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedService, setSelectedService] = useState(null);

  // إضافة "-" بعد أول 3 أرقام
  function handleClientNumberChange(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 7) value = value.slice(0, 7);
    let formatted = value;
    if (value.length > 3) {
      formatted = value.slice(0, 3) + '-' + value.slice(3);
    }
    setClientNumber(formatted);
  }

  // الضغط على زر البحث
  async function handleSearch(e) {
    e.preventDefault();
    const isValid = /^\d{3}-\d{4}$/.test(clientNumber);
    const clientId = isValid ? `${prefix}-${clientNumber}` : "";
    setFullClientId(clientId);

    if (!clientId || clientId.length < 12) {
      setClient(null);
      setServices([]);
      setOtherServices([]);
      setSelectedServiceId("");
      setSelectedService(null);
      return;
    }

    const docRef = doc(firestore, "users", clientId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      setClient({ ...data, customerId: snap.id });
      const type = data.accountType || data.type;
      await fetchServicesForType(type);
      await fetchOtherServices();
    } else {
      setClient(null);
      setServices([]);
      setOtherServices([]);
    }
    setSelectedServiceId("");
    setSelectedService(null);
  }

async function fetchServicesForType(type) {
  if (!type) return setServices([]);
  const clientType = String(type).toLowerCase();
  // جلب الوثيقة نفسها
  const docRef = doc(firestore, "servicesByClientType", clientType);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    // استخراج كل الحقول التي تبدأ بـ service و active = true
    const servicesArr = Object.entries(data)
      .filter(([key, val]) => key.startsWith("service") && val.active)
      .map(([key, val]) => ({ id: key, ...val }));
    setServices(servicesArr);
  } else {
    setServices([]);
  }
}

  async function fetchOtherServices() {
    const q = query(collection(firestore, "services"), where("type", "==", "other"));
    const snap = await getDocs(q);
    let arr = [];
    snap.forEach(doc => {
      arr.push({ id: doc.id, ...doc.data() });
    });
    setOtherServices(arr);
  }

  useEffect(() => {
    if (!selectedServiceId) return setSelectedService(null);
    const all = [...services, ...otherServices];
    const srv = all.find(s => s.id === selectedServiceId);
    setSelectedService(srv || null);
  }, [selectedServiceId, services, otherServices]);

  // تفاصيل الخدمة
function DetailsBox() {
    if (!client || !selectedService) return null;

    // المستندات المطلوبة
    const requiredDocs = Array.isArray(selectedService.requiredDocuments)
      ? selectedService.requiredDocuments
      : (selectedService.requiredDocuments ? Object.values(selectedService.requiredDocuments) : []);
    const requireUpload = selectedService.requireUpload || requiredDocs.length > 0;

    return (
      <div className="w-full rounded-xl overflow-hidden shadow border border-emerald-100 bg-white animate-fade-in">
        <div className="bg-emerald-50 px-4 py-2 text-center font-bold text-emerald-800 text-lg">
          {lang === "ar" ? "تفاصيل الخدمة" : "Service Details"}
        </div>
        <div className="px-4 py-4 grid grid-cols-1 gap-3 text-base font-semibold text-gray-800">
          <div>
            <span className="inline-block w-32 text-emerald-700">{lang === "ar" ? "اسم العميل:" : "Client Name:"}</span>
            <span>{client.firstName} {client.lastName}</span>
          </div>
          <div>
            <span className="inline-block w-32 text-emerald-700">{lang === "ar" ? "رقم العميل:" : "Client ID:"}</span>
            <span>{client.customerId}</span>
          </div>
          <div>
            <span className="inline-block w-32 text-emerald-700">{lang === "ar" ? "نوع العميل:" : "Client Type:"}</span>
            <span>{client.accountType || client.type}</span>
          </div>
          <hr className="my-2 border-emerald-100"/>
          <div>
            <span className="inline-block w-32 text-emerald-700">{lang === "ar" ? "الخدمة:" : "Service:"}</span>
            <span>{selectedService.name}</span>
          </div>
          <div>
            <span className="inline-block w-32 text-emerald-700">{lang === "ar" ? "السعر:" : "Price:"}</span>
            <span>{selectedService.price} AED</span>
          </div>
          <div>
            <span className="inline-block w-32 text-emerald-700">{lang === "ar" ? "الوصف:" : "Description:"}</span>
            <span>{selectedService.desc || selectedService.description}</span>
          </div>
          {/* مستندات مطلوبة */}
          {requiredDocs.length > 0 && (
            <div>
              <span className="inline-block w-32 text-emerald-700">{lang === "ar" ? "المستندات المطلوبة:" : "Required Documents:"}</span>
              <ul className="list-disc list-inside text-gray-700 text-sm mt-1 ml-2">
                {requiredDocs.map((doc, idx) => (
                  <li key={idx}>{typeof doc === "string" ? doc : (doc.ar || doc.en || doc.name || doc.label)}</li>
                ))}
              </ul>
            </div>
          )}
          {/* زر رفع المستندات لو الخدمة محتاجاها */}
          {requireUpload && (
            <div className="mt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-base shadow"
                onClick={() => alert("فتح مودال رفع المستندات (هتضيفه لاحقًا)")}
              >
                {lang === "ar" ? "رفع المستندات المطلوبة" : "Upload Documents"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }


  // توسيع المكان الرئيسي للحقول
  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-extrabold text-emerald-700 mb-6 text-center tracking-tight drop-shadow">
        {lang === "ar" ? "إنشاء خدمة للعميل" : "Create Client Service"}
      </h2>
      <form
        className="bg-white rounded-xl shadow-lg px-12 py-8 flex flex-row gap-8 items-center justify-center"
        style={{ minHeight: 80 }}
        onSubmit={handleSearch}
      >
        {/* نوع العميل */}
        <div className="flex flex-col items-start" style={{ width: "120px", minWidth: "90px" }}>
          <label className="font-bold text-emerald-700 mb-1 text-sm">{lang === "ar" ? "نوع العميل" : "Client Type"}</label>
          <select
            className="border-2 rounded-lg px-2 py-1 w-full shadow focus:outline-emerald-500 text-base font-bold text-emerald-900 bg-white"
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
            style={{ height: 38 }}
          >
            {PREFIXES.map(p => (
              <option key={p.key} value={p.key}>{lang === "ar" ? p.labelAr : p.labelEn}</option>
            ))}
          </select>
        </div>
        {/* رقم العميل */}
        <div className="flex flex-col items-start" style={{ width: "290px", minWidth: "160px" }}>
          <label className="font-bold text-emerald-700 mb-1 text-sm">{lang === "ar" ? "رقم العميل" : "Client Number"}</label>
          <div className="relative w-full flex flex-row items-center">
            <input
              type="text"
              value={clientNumber}
              onChange={handleClientNumberChange}
              placeholder={lang === "ar" ? "2009180" : "2009180"}
              className="border-2 rounded-lg px-3 py-1 w-full shadow focus:outline-emerald-500 text-base font-bold text-emerald-900 tracking-widest bg-white text-center"
              maxLength={8}
              style={{ height: 38, letterSpacing: "2px", fontSize: "22px" }}
              autoComplete="off"
            />
            <button
              type="submit"
              className="ml-2 px-4 py-1 rounded-full bg-emerald-600 hover:bg-emerald-800 text-white flex items-center gap-1 font-bold text-base"
              style={{ height: 38, minWidth: "72px", fontSize: "18px" }}
              title={lang === "ar" ? "بحث" : "Search"}
            >
              <FaSearch />
              {lang === "ar" ? "بحث" : "Search"}
            </button>
          </div>
        </div>
        {/* الخدمة */}
        <div className="flex flex-col items-start flex-1" style={{ minWidth: "350px" }}>
          <label className="font-bold text-emerald-700 mb-1 text-sm">{lang === "ar" ? "الخدمة" : "Service"}</label>
          <select
            className="border-2 rounded-lg px-2 py-1 shadow text-base font-bold text-emerald-900 bg-white w-full"
            value={selectedServiceId}
            onChange={e => setSelectedServiceId(e.target.value)}
            disabled={!client}
            style={{ height: 38, fontSize: "18px" }}
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
      {/* تفاصيل الخدمة بشكل أنيق */}
      <div className="rounded-xl bg-white/95 p-4 shadow-lg border border-emerald-100 mt-4">
        {client && <DetailsBox />}
        {fullClientId.length >= 12 && !client && (
          <div className="text-red-600 font-bold text-center py-5 text-base">
            {lang === "ar" ? "العميل غير موجود أو البيانات غير صحيحة." : "Client not found or incorrect info."}
          </div>
        )}
        {!client && !fullClientId && (
          <div className="text-gray-500 text-center py-3 text-base">
            {lang === "ar" ? "يرجى إدخال رقم العميل ثم الضغط على بحث." : "Please enter Client ID then click Search."}
          </div>
        )}
      </div>
    </div>
  );
}