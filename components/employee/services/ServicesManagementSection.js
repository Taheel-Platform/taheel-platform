import React, { useState, useEffect } from "react";
import { FaSearch, FaRegCopy, FaCheckCircle, FaUser, FaClipboardList, FaMoneyCheckAlt } from "react-icons/fa";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";

export default function ServicesManagementSection({ employeeData, lang }) {
  // State
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceResults, setServiceResults] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [creating, setCreating] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [copied, setCopied] = useState(false);

  // نوع العميل
  const clientTypes = [
    { key: "resident", labelAr: "مقيم", labelEn: "Resident" },
    { key: "nonresident", labelAr: "غير مقيم", labelEn: "Non-Resident" },
    { key: "company", labelAr: "شركة", labelEn: "Company" },
    { key: "other", labelAr: "أخرى", labelEn: "Other" },
  ];

  // بحث العملاء من فايرستور
  useEffect(() => {
    if (!clientSearch || clientSearch.length < 2) {
      setClientResults([]);
      return;
    }
    async function fetchClients() {
      // بحث مبدئي بالاسم أو رقم العميل
      const q = query(
        collection(db, "users"),
        where("role", "==", "client")
      );
      const snap = await getDocs(q);
      const searchLower = clientSearch.toLowerCase();
      const results = [];
      snap.forEach(doc => {
        const data = doc.data();
        // بحث بالاسم أو رقم العميل
        const fullName = `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim();
        if (
          (data.customerId && data.customerId.includes(clientSearch)) ||
          (fullName && fullName.toLowerCase().includes(searchLower))
        ) {
          results.push({
            id: data.customerId,
            name: fullName,
            phone: data.phone,
            email: data.email
          });
        }
      });
      setClientResults(results);
    }
    fetchClients();
  }, [clientSearch]);

  // جلب الخدمات من فايرستور
  useEffect(() => {
    async function fetchServices() {
      const q = query(collection(db, "services"));
      const snap = await getDocs(q);
      let services = [];
      snap.forEach(doc => {
        const data = doc.data();
        services.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          price: data.price,
          desc: data.desc
        });
      });
      // فلترة حسب نوع العميل
      if (selectedType)
        services = services.filter(s => s.type === selectedType);
      // فلترة بالبحث النصي
      if (serviceSearch)
        services = services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
      setServiceResults(services);
    }
    fetchServices();
  }, [serviceSearch, selectedType]);

  // إنشاء الخدمة وتوليد رابط دفع (اختبارى هنا، استبدله بربط فعلي)
  function handleCreateService() {
    setCreating(true);
    setTimeout(() => {
      // توليد لينك دفع وهمي
      const fakeLink = `https://pay.taheel.ae/invoice/${selectedClient?.id}/${selectedService?.id}`;
      setPaymentLink(fakeLink);
      setCreating(false);
      setCopied(false);
    }, 1200);
  }

  // نسخ الرابط
  function handleCopy() {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  // تصميم عصري جداً
  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-extrabold text-indigo-700 mb-7 text-center tracking-tight">
        {lang === "ar" ? "إدارة وإنشاء الخدمات" : "Service Management"}
      </h2>
      <div className="bg-white rounded-3xl shadow-2xl p-7 flex flex-col gap-8 border border-indigo-100 animate-fade-in">
        {/* بحث واختيار العميل */}
        <div>
          <label className="block font-bold text-indigo-800 mb-2 text-base">
            {lang === "ar" ? "بحث عن العميل" : "Search Client"}
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={lang === "ar" ? "اكتب اسم أو رقم العميل..." : "Type client name or ID..."}
              value={selectedClient ? selectedClient.name : clientSearch}
              onChange={e => {
                setSelectedClient(null);
                setClientSearch(e.target.value);
              }}
              className="w-full border rounded-xl px-4 py-2 shadow text-indigo-900 font-semibold focus:outline-indigo-500"
            />
            <FaSearch className="absolute right-3 top-3 text-indigo-400" />
            {/* نتائج البحث */}
            {clientResults.length > 0 && !selectedClient && (
              <ul className="absolute z-40 bg-white border rounded-xl w-full shadow-lg mt-2 max-h-48 overflow-auto">
                {clientResults.map(c => (
                  <li
                    key={c.id}
                    className="p-2 hover:bg-indigo-50 cursor-pointer flex items-center gap-2"
                    onClick={() => {
                      setSelectedClient(c);
                      setClientResults([]);
                      setClientSearch("");
                    }}
                  >
                    <FaUser className="text-indigo-400" />
                    <span className="font-bold">{c.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{c.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* بيانات العميل المختار */}
          {selectedClient && (
            <div className="mt-3 px-4 py-3 bg-indigo-50 rounded-lg flex flex-col gap-1">
              <span><FaUser className="inline text-indigo-500 mr-1" /> <b>{selectedClient.name}</b></span>
              <span className="text-xs text-gray-600">{lang === "ar" ? "رقم العميل:" : "Client ID:"} {selectedClient.id}</span>
              <span className="text-xs text-gray-600">{lang === "ar" ? "جوال:" : "Phone:"} {selectedClient.phone}</span>
              <span className="text-xs text-gray-600">{lang === "ar" ? "البريد:" : "Email:"} {selectedClient.email}</span>
            </div>
          )}
        </div>
        {/* اختيار نوع العميل */}
        <div>
          <label className="block font-bold text-indigo-800 mb-2 text-base">
            {lang === "ar" ? "نوع العميل" : "Client Type"}
          </label>
          <select
            className="w-full border rounded-xl px-4 py-2 shadow text-indigo-900 font-semibold focus:outline-indigo-500"
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
          >
            <option value="">{lang === "ar" ? "-- اختر نوع العميل --" : "-- Select Client Type --"}</option>
            {clientTypes.map(t => (
              <option key={t.key} value={t.key}>{lang === "ar" ? t.labelAr : t.labelEn}</option>
            ))}
          </select>
        </div>
        {/* اختيار الخدمة */}
        <div>
          <label className="block font-bold text-indigo-800 mb-2 text-base">
            {lang === "ar" ? "بحث واختيار الخدمة" : "Search & Select Service"}
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={lang === "ar" ? "اكتب اسم الخدمة..." : "Type service name..."}
              value={selectedService ? selectedService.name : serviceSearch}
              onChange={e => {
                setSelectedService(null);
                setServiceSearch(e.target.value);
              }}
              className="w-full border rounded-xl px-4 py-2 shadow text-indigo-900 font-semibold focus:outline-indigo-500"
            />
            <FaClipboardList className="absolute right-3 top-3 text-indigo-400" />
            {/* نتائج البحث عن الخدمة */}
            {serviceResults.length > 0 && !selectedService && (
              <ul className="absolute z-40 bg-white border rounded-xl w-full shadow-lg mt-2 max-h-48 overflow-auto">
                {serviceResults.map(s => (
                  <li
                    key={s.id}
                    className="p-2 hover:bg-indigo-50 cursor-pointer flex items-center gap-2"
                    onClick={() => {
                      setSelectedService(s);
                      setServiceResults([]);
                      setServiceSearch("");
                    }}
                  >
                    <FaMoneyCheckAlt className="text-indigo-400" />
                    <span className="font-bold">{s.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{lang === "ar" ? clientTypes.find(t => t.key === s.type)?.labelAr : clientTypes.find(t => t.key === s.type)?.labelEn}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* تفاصيل الخدمة المختارة */}
          {selectedService && (
            <div className="mt-3 px-4 py-3 bg-indigo-50 rounded-lg flex flex-col gap-1">
              <span><FaClipboardList className="inline text-indigo-500 mr-1" /> <b>{selectedService.name}</b></span>
              <span className="text-xs text-gray-600">{selectedService.desc}</span>
              <span className="text-xs text-gray-600">{lang === "ar" ? "السعر:" : "Price:"} {selectedService.price} AED</span>
            </div>
          )}
        </div>
        {/* زر إنشاء الخدمة وتوليد رابط دفع */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <button
            className={`px-5 py-3 rounded-full font-bold text-lg shadow-lg transition ${
              selectedClient && selectedType && selectedService && !creating
                ? "bg-indigo-600 hover:bg-indigo-800 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!selectedClient || !selectedType || !selectedService || creating}
            onClick={handleCreateService}
          >
            {creating
              ? (lang === "ar" ? "جاري الإنشاء..." : "Creating...")
              : lang === "ar"
                ? "إنشاء الخدمة وتوليد رابط دفع"
                : "Create Service & Generate Payment Link"}
          </button>
          {/* رابط الدفع بعد الإنشاء */}
          {paymentLink && (
            <div className="w-full flex flex-col items-center gap-2">
              <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2 w-full justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
                <span className="font-bold text-green-700">{lang === "ar" ? "تم الإنشاء! رابط الدفع:" : "Payment link generated!"}</span>
              </div>
              <div className="flex w-full gap-2">
                <input
                  type="text"
                  className="border rounded px-2 py-1 flex-1 font-mono text-green-700 bg-green-100"
                  value={paymentLink}
                  readOnly
                />
                <button
                  className="px-3 py-1 bg-green-600 text-white rounded font-bold flex items-center gap-1"
                  onClick={handleCopy}
                >
                  <FaRegCopy />
                  {copied
                    ? (lang === "ar" ? "تم النسخ!" : "Copied!")
                    : (lang === "ar" ? "نسخ" : "Copy")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}