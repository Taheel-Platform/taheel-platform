import React, { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

const PREFIXES = [
  { key: "resident", labelAr: "مقيم", labelEn: "Resident" },
  { key: "nonresident", labelAr: "غير مقيم", labelEn: "Non-Resident" },
  { key: "company", labelAr: "شركة", labelEn: "Company" }
];

export default function ServicesManagementSection({ employeeData, lang }) {
  // البحث
  const [prefix, setPrefix] = useState("resident");
  const [clientNumber, setClientNumber] = useState("");
  const [fullClientId, setFullClientId] = useState("");
  const [client, setClient] = useState(null);

  // الخدمات
  const [services, setServices] = useState([]);
  const [otherServices, setOtherServices] = useState([]);
  const [serviceQuery, setServiceQuery] = useState(""); // للبحث التلقائي
  const [filteredServices, setFilteredServices] = useState([]);
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

  // البحث عن العميل (نفس الكود القديم)
  async function handleSearch(e) {
    e.preventDefault();
    const isValid = /^\d{3}-\d{4}$/.test(clientNumber);
    const clientId = isValid ? `${prefix.toUpperCase()}-${clientNumber}` : "";
    setFullClientId(clientId);

    if (!clientId || clientId.length < 12) {
      setClient(null);
      setServices([]);
      setOtherServices([]);
      setSelectedService(null);
      return;
    }

    const docRef = doc(firestore, "users", clientId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      setClient({ ...data, customerId: snap.id });
      await fetchServicesForType(prefix);
      await fetchOtherServices();
    } else {
      setClient(null);
      setServices([]);
      setOtherServices([]);
    }
    setSelectedService(null);
    setServiceQuery("");
  }

  // جلب خدمات نوع العميل
  async function fetchServicesForType(type) {
    const collRef = collection(firestore, "servicesByClientType", type, type);
    const snap = await getDocs(collRef);
    let arr = [];
    snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
    setServices(arr);
  }

  // جلب خدمات other
  async function fetchOtherServices() {
    const collRef = collection(firestore, "servicesByClientType", "other", "other");
    const snap = await getDocs(collRef);
    let arr = [];
    snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
    setOtherServices(arr);
  }

  // فلترة الخدمات عند الكتابة
  useEffect(() => {
    let all = [...services, ...otherServices];
    if (serviceQuery.trim() === "") {
      setFilteredServices(all);
    } else {
      setFilteredServices(
        all.filter(s =>
          (s.name || "").toLowerCase().includes(serviceQuery.toLowerCase())
        )
      );
    }
  }, [serviceQuery, services, otherServices]);

  // تفاصيل الخدمة
  function DetailsBox() {
    if (!client) return null;
    return (
      <div className="w-full rounded-xl overflow-hidden shadow border border-emerald-100 bg-white animate-fade-in mt-4">
        <div className="bg-emerald-50 px-4 py-2 text-center font-bold text-emerald-800 text-lg">
          {lang === "ar" ? "تفاصيل الخدمة" : "Service Details"}
        </div>
        <div className="px-4 py-4 grid grid-cols-1 gap-2 text-base font-semibold text-gray-800">
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
          {selectedService && (
            <>
              <div>
                <span className="inline-block w-32 text-emerald-700">{lang === "ar" ? "الخدمة:" : "Service:"}</span>
                <span>{selectedService.name}</span>
              </div>
              <div>
                <span className="inline-block w-32 text-emerald-700">{lang === "ar" ? "السعر:" : "Price:"}</span>
                <span>{selectedService.price} AED</span>
              </div>
              <div>
                <span className="inline-block w-32 text-emerald-700">{lang === "ar" ? "وصف الخدمة:" : "Description:"}</span>
                <span>{selectedService.description}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

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
        {/* الخدمة مع البحث */}
        <div className="flex flex-col items-start flex-1" style={{ minWidth: "350px", position: "relative" }}>
          <label className="font-bold text-emerald-700 mb-1 text-sm">{lang === "ar" ? "الخدمة" : "Service"}</label>
          <input
            type="text"
            value={serviceQuery}
            onChange={e => {
              setServiceQuery(e.target.value);
              setSelectedService(null);
            }}
            placeholder={lang === "ar" ? "ابحث أو اكتب اسم الخدمة" : "Search or type service name"}
            className="border-2 rounded-lg px-3 py-1 w-full shadow focus:outline-emerald-500 text-base font-bold text-emerald-900 bg-white"
            style={{ height: 38, fontSize: "18px" }}
            disabled={!client}
            autoComplete="off"
          />
          {/* قائمة اقتراحات الخدمات */}
          {serviceQuery && filteredServices.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-emerald-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
              {filteredServices.map(s => (
                <li
                  key={s.id}
                  className="px-4 py-2 cursor-pointer hover:bg-emerald-50"
                  onClick={() => {
                    setSelectedService(s);
                    setServiceQuery(s.name);
                  }}
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
          {/* إظهار كل الخدمات لو لا يوجد بحث */}
          {!serviceQuery && client && filteredServices.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-emerald-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
              {filteredServices.map(s => (
                <li
                  key={s.id}
                  className="px-4 py-2 cursor-pointer hover:bg-emerald-50"
                  onClick={() => {
                    setSelectedService(s);
                    setServiceQuery(s.name);
                  }}
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
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