import React, { useState, useEffect } from "react";
import { FaSearch, FaUser, FaClipboardList } from "react-icons/fa";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";

export default function ServicesManagementSection({ employeeData, lang }) {
  // State
  const [clientSearch, setClientSearch] = useState("");
  const [clientResult, setClientResult] = useState(null);
  const [serviceList, setServiceList] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // بحث العميل
  async function handleClientSearch() {
    if (!clientSearch.trim()) return;
    const q = query(
      collection(db, "users"),
      where("role", "==", "client")
    );
    const snap = await getDocs(q);
    const searchLower = clientSearch.toLowerCase();
    let found = null;
    snap.forEach(doc => {
      const data = doc.data();
      const fullName = `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim();
      if (
        (data.customerId && data.customerId.includes(clientSearch)) ||
        (fullName && fullName.toLowerCase().includes(searchLower))
      ) {
        found = {
          id: data.customerId,
          name: fullName,
          phone: data.phone,
          email: data.email,
          type: data.type || data.accountType || "",
        };
      }
    });
    setClientResult(found);
    setSelectedService(null); // امسح الخدمة لو غيرت العميل
  }

  // جلب الخدمات حسب نوع العميل
  useEffect(() => {
    async function fetchServices() {
      if (!clientResult?.type) {
        setServiceList([]);
        return;
      }
      const q = query(
        collection(db, "services"),
        where("type", "==", clientResult.type)
      );
      const snap = await getDocs(q);
      let services = [];
      snap.forEach(doc => {
        const data = doc.data();
        services.push({
          id: doc.id,
          name: data.name,
          price: data.price,
          desc: data.desc,
        });
      });
      setServiceList(services);
    }
    fetchServices();
  }, [clientResult?.type]);

  // تفاصيل الخدمة في جدول
  function ServiceDetailsTable() {
    if (!selectedService || !clientResult) return null;
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
            <td className="p-3">{clientResult.name}</td>
          </tr>
          <tr>
            <td className="p-3 font-bold">{lang === "ar" ? "رقم العميل" : "Client ID"}</td>
            <td className="p-3">{clientResult.id}</td>
          </tr>
          <tr>
            <td className="p-3 font-bold">{lang === "ar" ? "نوع العميل" : "Client Type"}</td>
            <td className="p-3">{clientResult.type}</td>
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-extrabold text-indigo-700 mb-6 text-center tracking-tight">
        {lang === "ar" ? "إنشاء خدمة للعميل" : "Create Client Service"}
      </h2>
      <div className="flex flex-row gap-4 items-end mb-6 flex-wrap">
        {/* بحث العميل */}
        <div className="flex flex-col">
          <label className="font-bold text-indigo-800 mb-1">{lang === "ar" ? "اسم أو رقم العميل" : "Client Name or ID"}</label>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder={lang === "ar" ? "اكتب هنا..." : "Type here..."}
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 w-40 shadow focus:outline-indigo-500"
              onKeyDown={e => { if (e.key === "Enter") handleClientSearch(); }}
            />
            <button
              className="bg-indigo-600 hover:bg-indigo-800 text-white rounded-lg px-3 py-2 shadow flex items-center gap-1"
              onClick={handleClientSearch}
              title={lang === "ar" ? "بحث" : "Search"}
            >
              <FaSearch />
              {lang === "ar" ? "بحث" : "Search"}
            </button>
          </div>
        </div>
        {/* نوع العميل يظهر تلقائي */}
        <div className="flex flex-col">
          <label className="font-bold text-indigo-800 mb-1">{lang === "ar" ? "نوع العميل" : "Client Type"}</label>
          <input
            type="text"
            value={clientResult?.type ? clientResult.type : ""}
            readOnly
            className="border rounded-lg px-3 py-2 w-32 shadow bg-gray-100 text-gray-700"
            placeholder={lang === "ar" ? "..." : "..."}
          />
        </div>
        {/* قائمة الخدمات المناسبة */}
        <div className="flex flex-col">
          <label className="font-bold text-indigo-800 mb-1">{lang === "ar" ? "الخدمة" : "Service"}</label>
          <select
            className="border rounded-lg px-3 py-2 w-48 shadow"
            value={selectedService?.id || ""}
            onChange={e => {
              const srv = serviceList.find(s => s.id === e.target.value);
              setSelectedService(srv || null);
            }}
            disabled={!clientResult}
          >
            <option value="">{lang === "ar" ? "-- اختر الخدمة --" : "-- Select Service --"}</option>
            {serviceList.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {/* زر إنشاء الخدمة */}
        <div>
          <button
            className={`px-5 py-2 rounded-full font-bold text-lg shadow-lg transition ${
              clientResult && selectedService
                ? "bg-indigo-600 hover:bg-indigo-800 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!clientResult || !selectedService}
            onClick={() => alert("تم إنشاء الخدمة! (هنا يتم توليد رابط الدفع وتسجيل الطلب)")}>
            {lang === "ar" ? "إنشاء الخدمة" : "Create Service"}
          </button>
        </div>
      </div>
      {/* تفاصيل الخدمة وجدول العميل */}
      {clientResult && selectedService && (
        <ServiceDetailsTable />
      )}
      {/* رسالة لو العميل غير موجود */}
      {clientSearch && !clientResult && (
        <div className="mt-6 text-red-600 font-bold text-center">
          {lang === "ar" ? "العميل غير موجود أو البيانات غير صحيحة." : "Client not found or incorrect info."}
        </div>
      )}
    </div>
  );
}