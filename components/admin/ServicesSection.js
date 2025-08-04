"use client";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";

const categories = [
  { key: "all", label_ar: "الكل", label_en: "All" },
  { key: "resident", label_ar: "مقيمين", label_en: "Residents" },
  { key: "nonresident", label_ar: "غير مقيمين", label_en: "Non-Residents" },
  { key: "company", label_ar: "شركات", label_en: "Companies" },
  { key: "other", label_ar: "أخرى", label_en: "Other" },
];

// رقم خدمة فريد
function generateServiceId() {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SER-000-${num}${rand}`;
}

// حساب الضريبة 5% على رسوم الطباعة فقط + السعر النهائي للعميل
function calcAll(price, printingFee) {
  const p = Number(price) || 0;
  const print = Number(printingFee) || 0;
  const tax = +(print * 0.05).toFixed(2);
  const clientPrice = +(p + print + tax).toFixed(2);
  return { tax, clientPrice, print };
}

export default function ServicesSection({ lang = "ar" }) {
  // نوع العميل الافتراضي (يمكنك تغييره حسب الحاجة أو حسب تسجيل دخول المستخدم)
  const [clientType, setClientType] = useState("resident");

  const [services, setServices] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(1);
  const [documentsFields, setDocumentsFields] = useState([""]);

  const [newService, setNewService] = useState({
    name: "",
    description: "",
    category: clientType,
    subcategory: "",
    provider: "",
    price: "",
    printingFee: "",
    coins: "",
    requiredDocuments: [],
    duration: "",
    requireUpload: false,
    repeatable: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [editService, setEditService] = useState({});
  const [editDocumentsFields, setEditDocumentsFields] = useState([]);

  // جلب كل الخدمات من Firestore من المسار الصحيح حسب نوع العميل
  useEffect(() => {
    async function fetchData() {
      if (!clientType) return;
      const snap = await getDocs(
        collection(db, `servicesByClientType/${clientType}/services`)
      );
      const arr = [];
      snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id }));
      setServices(
        arr.sort((a, b) =>
          a.name.localeCompare(b.name, lang === "ar" ? "ar" : "en")
        )
      );
    }
    fetchData();
  }, [loading, lang, clientType]);

  // تحديث الحقول عند تغيير عدد المستندات المطلوبة (لإضافة خدمة)
  useEffect(() => {
    if (documentsCount < 1) setDocumentsCount(1);
    setDocumentsFields(
      Array.from(
        { length: documentsCount },
        (_, i) => newService.requiredDocuments[i] || ""
      )
    );
  }, [documentsCount, newService.requiredDocuments]);

  // تحديث الحقول عند تغيير عدد المستندات المطلوبة (لتعديل خدمة)
  useEffect(() => {
    if (editingId && editService.requireUpload) {
      setEditDocumentsFields(
        Array.from(
          { length: editService.requiredDocuments ? editService.requiredDocuments.length : 1 },
          (_, i) => editService.requiredDocuments[i] || ""
        )
      );
    }
  }, [editService.requiredDocuments, editingId, editService.requireUpload]);

  // تحديث الكوينات فقط عند تغير السعر
  useEffect(() => {
    if (newService.price !== "" && !isNaN(newService.price)) {
      setNewService((ns) => ({
        ...ns,
        coins: Number(ns.price) || "",
      }));
    }
  }, [newService.price]);

  // حسابات الأسعار والضريبة
  const { tax, clientPrice, print } = calcAll(
    newService.price,
    newService.printingFee
  );

  // إضافة خدمة جديدة لمسار نوع العميل الصحيح
  async function handleAddService(e) {
    e.preventDefault();
    setLoading(true);
    await addDoc(
      collection(db, `servicesByClientType/${clientType}/services`),
      {
        ...newService,
        category: clientType, // تأكيد تخزين نوع العميل الصحيح
        price: Number(newService.price),
        printingFee: Number(newService.printingFee),
        coins: Number(newService.coins),
        profit: Number(newService.printingFee), // الربح = رسوم الطباعة دائماً
        tax: Number(tax),
        clientPrice: Number(clientPrice),
        requiredDocuments: newService.requireUpload
          ? documentsFields.map((s) => s.trim()).filter(Boolean)
          : [],
        serviceId: generateServiceId(),
        createdAt: serverTimestamp(),
        active: true,
      }
    );
    setNewService({
      name: "",
      description: "",
      category: clientType,
      subcategory: "",
      provider: "",
      price: "",
      printingFee: "",
      coins: "",
      requiredDocuments: [],
      duration: "",
      requireUpload: false,
      repeatable: false,
    });
    setDocumentsFields([""]);
    setDocumentsCount(1);
    setShowAdd(false);
    setLoading(false);
  }

  // حذف خدمة
  async function handleDeleteService(id) {
    if (
      !confirm(
        lang === "ar"
          ? "هل أنت متأكد من حذف الخدمة؟"
          : "Are you sure to delete the service?"
      )
    )
      return;
    setLoading(true);
    await deleteDoc(doc(db, `servicesByClientType/${clientType}/services`, id));
    setLoading(false);
  }

  // تعديل خدمة
  async function handleEditService(e) {
    e.preventDefault();
    setLoading(true);
    const { tax, clientPrice } = calcAll(
      editService.price,
      editService.printingFee
    );
    await updateDoc(
      doc(db, `servicesByClientType/${clientType}/services`, editingId),
      {
        ...editService,
        price: Number(editService.price),
        printingFee: Number(editService.printingFee),
        coins: Number(editService.coins),
        profit: Number(editService.printingFee), // الربح = رسوم الطباعة دائماً
        tax: Number(tax),
        clientPrice: Number(clientPrice),
        requiredDocuments: editService.requireUpload
          ? editDocumentsFields.map((s) => s.trim()).filter(Boolean)
          : [],
      }
    );
    setEditingId(null);
    setLoading(false);
  }

  // فلترة الخدمات
  const filteredServices =
    filter === "all"
      ? services
      : services.filter((s) => s.category === filter);

  return (
    <div className="bg-gradient-to-br from-white to-cyan-50 rounded-2xl shadow p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between items-center mb-6 gap-3">
        <span className="text-2xl font-bold text-cyan-900">
          {lang === "ar" ? "إدارة الخدمات" : "Services Management"}
        </span>
        <div className="flex gap-2">
          {/* اختيار نوع العميل */}
          <select
            value={clientType}
            onChange={(e) => {
              setClientType(e.target.value);
              setFilter("all");
              setNewService((ns) => ({
                ...ns,
                category: e.target.value,
              }));
            }}
            className="p-2 rounded border text-cyan-800 font-bold bg-cyan-50"
          >
            {categories
              .filter((c) => c.key !== "all")
              .map((cat) => (
                <option value={cat.key} key={cat.key}>
                  {lang === "ar" ? cat.label_ar : cat.label_en}
                </option>
              ))}
          </select>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="px-4 py-2 rounded bg-cyan-700 hover:bg-cyan-900 text-white font-bold shadow mt-2 md:mt-0 transition cursor-pointer"
          >
            {lang === "ar"
              ? showAdd
                ? "إغلاق"
                : "إضافة خدمة جديدة"
              : showAdd
              ? "Close"
              : "Add Service"}
          </button>
        </div>
      </div>

      {/* فلاتر الفئات */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-4 py-1 rounded-lg border font-semibold transition cursor-pointer ${
              filter === cat.key
                ? "bg-cyan-700 text-white border-cyan-700"
                : "bg-white text-cyan-700 border-cyan-300 hover:bg-cyan-50"
            }`}
          >
            {lang === "ar" ? cat.label_ar : cat.label_en}
          </button>
        ))}
      </div>

      {/* نموذج إضافة خدمة */}
      {showAdd && (
        <form
          onSubmit={handleAddService}
          className="bg-cyan-50 rounded-lg p-4 mb-6 shadow flex flex-col gap-2 border border-cyan-200"
        >
          <div className="flex flex-col md:flex-row gap-2">
            <input
              required
              className="p-2 rounded border text-gray-900 font-semibold flex-1"
              placeholder={lang === "ar" ? "اسم الخدمة" : "Service name"}
              value={newService.name}
              onChange={(e) =>
                setNewService({ ...newService, name: e.target.value })
              }
            />
            <textarea
              className="p-2 rounded border text-gray-900 flex-1"
              placeholder={lang === "ar" ? "وصف الخدمة" : "Service Description"}
              rows={3}
              value={newService.description}
              onChange={(e) =>
                setNewService({ ...newService, description: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <select
              className="p-2 rounded border text-gray-900 font-semibold flex-1"
              value={newService.category}
              disabled // النوع يتبع اختيار نوع العميل الرئيسي
            >
              <option value={clientType}>
                {lang === "ar"
                  ? categories.find((c) => c.key === clientType)?.label_ar
                  : categories.find((c) => c.key === clientType)?.label_en}
              </option>
            </select>
            <input
              className="p-2 rounded border text-gray-900 flex-1"
              placeholder={
                lang === "ar"
                  ? "تصنيف فرعي (اختياري)"
                  : "Subcategory (optional)"
              }
              value={newService.subcategory}
              onChange={(e) =>
                setNewService({ ...newService, subcategory: e.target.value })
              }
            />
            <input
              className="p-2 rounded border text-gray-900 flex-1"
              placeholder={
                lang === "ar"
                  ? "جهة الخدمة (اختياري)"
                  : "Provider (optional)"
              }
              value={newService.provider}
              onChange={(e) =>
                setNewService({ ...newService, provider: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            {/* سعر الخدمة */}
            <input
              required
              type="number"
              min="0"
              className="p-2 rounded border text-gray-900 flex-1"
              placeholder={
                lang === "ar"
                  ? "سعر الخدمة (بدون رسوم الطباعة)"
                  : "Service Price (excl. printing)"
              }
              value={newService.price}
              onChange={(e) =>
                setNewService({ ...newService, price: e.target.value })
              }
            />
            {/* رسوم الطباعة */}
            <input
              type="number"
              min="0"
              className="p-2 rounded border text-gray-900 flex-1"
              placeholder={
                lang === "ar" ? "رسوم الطباعة" : "Printing Fee"
              }
              value={newService.printingFee}
              onChange={(e) =>
                setNewService({ ...newService, printingFee: e.target.value })
              }
            />
            {/* الكوينات */}
            <input
              required
              type="number"
              min="0"
              readOnly
              className="p-2 rounded border text-gray-900 flex-1 bg-gray-100"
              placeholder={lang === "ar" ? "عدد الكوينات" : "Coins"}
              value={newService.coins}
            />
            {/* وقت الإنجاز */}
            <input
              className="p-2 rounded border text-gray-900 flex-1"
              placeholder={lang === "ar" ? "وقت الإنجاز" : "Estimated Duration"}
              value={newService.duration}
              onChange={(e) =>
                setNewService({ ...newService, duration: e.target.value })
              }
            />
          </div>
          {/* مخرجات السعر النهائى للعميل */}
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 flex flex-col gap-1 bg-gray-50 p-2 rounded border border-gray-200 text-gray-900">
              <span className="font-bold text-cyan-800">
                {lang === "ar" ? "التكلفة النهائية للعميل:" : "Client Final Price:"}
              </span>
              <span>
                {lang === "ar"
                  ? `سعر الخدمة: ${newService.price || 0} د.إ`
                  : `Service: ${newService.price || 0} AED`}
              </span>
              <span>
                {lang === "ar"
                  ? `رسوم الطباعة: ${newService.printingFee || 0} د.إ`
                  : `Printing: ${newService.printingFee || 0} AED`}
              </span>
              <span>
                {lang === "ar"
                  ? `ضريبة الطباعة 5%: ${tax} د.إ`
                  : `Printing Tax 5%: ${tax} AED`}
              </span>
              <span className="font-extrabold text-emerald-700 mt-1">
                {lang === "ar"
                  ? `الإجمالى للعميل: ${clientPrice} د.إ`
                  : `Total for client: ${clientPrice} AED`}
              </span>
            </div>
          </div>
          {/* Checkbox لطلب رفع مستند */}
          <label className="flex items-center gap-2 mt-2 select-none cursor-pointer text-cyan-800 font-semibold">
            <input
              type="checkbox"
              checked={!!newService.requireUpload}
              onChange={(e) => {
                setNewService({
                  ...newService,
                  requireUpload: e.target.checked,
                });
                if (!e.target.checked) {
                  setDocumentsCount(1);
                  setDocumentsFields([""]);
                }
              }}
              className="accent-cyan-700 w-5 h-5 cursor-pointer"
            />
            {lang === "ar"
              ? "تفعيل رفع مستند (يجب على العميل رفع مستند)"
              : "Require document upload (Client must upload documents)"}
          </label>
          {newService.requireUpload && (
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-cyan-700">
                  {lang === "ar"
                    ? "عدد المستندات المطلوبة:"
                    : "Number of required documents:"}
                </span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="p-1 w-16 rounded border text-cyan-900 font-bold"
                  value={documentsCount}
                  onChange={(e) =>
                    setDocumentsCount(Number(e.target.value))
                  }
                />
              </div>
              {Array.from({ length: documentsCount }).map((_, i) => (
                <input
                  key={i}
                  className="p-2 rounded border text-gray-900"
                  placeholder={
                    lang === "ar"
                      ? `اسم المستند #${i + 1}`
                      : `Document name #${i + 1}`
                  }
                  value={documentsFields[i] || ""}
                  onChange={(e) => {
                    const docs = [...documentsFields];
                    docs[i] = e.target.value;
                    setDocumentsFields(docs);
                    setNewService((ns) => ({
                      ...ns,
                      requiredDocuments: docs,
                    }));
                  }}
                />
              ))}
            </div>
          )}
          {/* Checkbox هل الخدمة قابلة للتكرار */}
          <label className="flex items-center gap-2 mt-1 select-none cursor-pointer text-cyan-800 font-semibold">
            <input
              type="checkbox"
              checked={!!newService.repeatable}
              onChange={(e) =>
                setNewService({ ...newService, repeatable: e.target.checked })
              }
              className="accent-cyan-700 w-5 h-5 cursor-pointer"
            />
            {lang === "ar"
              ? "خدمة متعددة (يمكن للعميل تحديد عدد مرات التنفيذ)"
              : "Repeatable service (Client can specify quantity)"}
          </label>
          <button
            disabled={loading}
            className="px-4 py-2 rounded bg-cyan-800 hover:bg-cyan-900 text-white font-bold shadow mt-2 self-end transition cursor-pointer"
          >
            {lang === "ar" ? "إضافة الخدمة" : "Add Service"}
          </button>
        </form>
      )}

      {/* جدول الخدمات */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border rounded-lg bg-white text-xs sm:text-sm">
          <thead className="bg-cyan-100 text-cyan-900">
            <tr>
              <th className="py-2 px-2">ID</th>
              <th className="py-2 px-2">{lang === "ar" ? "الاسم" : "Name"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "الوصف" : "Description"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "التصنيف" : "Category"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "فرعي" : "Subcategory"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "جهة" : "Provider"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "سعر الخدمة" : "Service Price"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "رسوم الطباعة" : "Printing Fee"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "ضريبة الطباعة (5%)" : "Printing Tax (5%)"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "الإجمالى للعميل" : "Client Total"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "كوينات" : "Coins"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "مدة" : "Duration"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "مستندات" : "Documents"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "رفع مستند؟" : "Upload?"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "متعددة؟" : "Repeatable?"}</th>
              <th className="py-2 px-2">{lang === "ar" ? "تحكم" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((service) =>
              editingId === service.id ? (
                <tr key={service.id} className="bg-cyan-50">
                  <td className="py-2 px-2 text-xs font-mono text-cyan-800">
                    {service.serviceId}
                  </td>
                  <td className="py-2 px-2">
                    <input
                      className="p-1 rounded border w-28 text-cyan-900"
                      value={editService.name}
                      onChange={(e) =>
                        setEditService({
                          ...editService,
                          name: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <textarea
                      className="p-1 rounded border w-32 text-cyan-900"
                      rows={2}
                      value={editService.description || ""}
                      onChange={(e) =>
                        setEditService({
                          ...editService,
                          description: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      className="p-1 rounded border text-cyan-900"
                      value={editService.category}
                      onChange={(e) =>
                        setEditService({
                          ...editService,
                          category: e.target.value,
                        })
                      }
                    >
                      {categories
                        .filter((c) => c.key !== "all")
                        .map((cat) => (
                          <option value={cat.key} key={cat.key}>
                            {lang === "ar" ? cat.label_ar : cat.label_en}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      className="p-1 rounded border w-20 text-cyan-900"
                      value={editService.subcategory}
                      onChange={(e) =>
                        setEditService({
                          ...editService,
                          subcategory: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      className="p-1 rounded border w-20 text-cyan-900"
                      value={editService.provider}
                      onChange={(e) =>
                        setEditService({
                          ...editService,
                          provider: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      className="p-1 rounded border w-16 text-cyan-900"
                      value={editService.price}
                      onChange={(e) =>
                        setEditService({
                          ...editService,
                          price: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      className="p-1 rounded border w-16 text-cyan-900"
                      value={editService.printingFee}
                      onChange={(e) =>
                        setEditService({
                          ...editService,
                          printingFee: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="py-2 px-2 text-cyan-800 bg-gray-100 font-bold">
                    {calcAll(editService.price, editService.printingFee).tax}
                  </td>
                  <td className="py-2 px-2 text-emerald-800 bg-gray-100 font-bold">
                    {calcAll(editService.price, editService.printingFee)
                      .clientPrice}
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      className="p-1 rounded border w-12 text-cyan-900"
                      value={editService.coins}
                      onChange={(e) =>
                        setEditService({
                          ...editService,
                          coins: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      className="p-1 rounded border w-20 text-cyan-900"
                      value={editService.duration}
                      onChange={(e) =>
                        setEditService({
                          ...editService,
                          duration: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="py-2 px-2">
                    {editService.requireUpload &&
                      editDocumentsFields.map((docName, i) => (
                        <input
                          key={i}
                          className="p-1 rounded border w-32 text-cyan-900 mb-1"
                          value={docName}
                          onChange={(e) => {
                            const docs = [...editDocumentsFields];
                            docs[i] = e.target.value;
                            setEditDocumentsFields(docs);
                            setEditService((es) => ({
                              ...es,
                              requiredDocuments: docs,
                            }));
                          }}
                        />
                      ))}
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={!!editService.requireUpload}
                      onChange={(e) => {
                        setEditService({
                          ...editService,
                          requireUpload: e.target.checked,
                        });
                        if (!e.target.checked) setEditDocumentsFields([""]);
                      }}
                      className="accent-cyan-700 w-5 h-5 cursor-pointer"
                    />
                    {editService.requireUpload && (
                      <input
                        type="number"
                        min={1}
                        max={10}
                        className="w-10 ml-1 p-1 rounded border text-cyan-900 font-bold"
                        value={editDocumentsFields.length}
                        onChange={(e) => {
                          const count = Number(e.target.value);
                          setEditDocumentsFields((prev) =>
                            Array.from(
                              { length: count },
                              (v, i) => prev[i] || ""
                            )
                          );
                          setEditService((es) => ({
                            ...es,
                            requiredDocuments: Array.from(
                              { length: count },
                              (v, i) => editDocumentsFields[i] || ""
                            ),
                          }));
                        }}
                      />
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={!!editService.repeatable}
                      onChange={(e) =>
                        setEditService({
                          ...editService,
                          repeatable: e.target.checked,
                        })
                      }
                      className="accent-cyan-700 w-5 h-5 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <button
                      onClick={handleEditService}
                      className="px-2 py-1 bg-cyan-700 hover:bg-cyan-900 text-white rounded mx-1 transition cursor-pointer"
                    >
                      {lang === "ar" ? "حفظ" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 bg-gray-400 hover:bg-gray-600 text-white rounded mx-1 transition cursor-pointer"
                    >
                      {lang === "ar" ? "إلغاء" : "Cancel"}
                    </button>
                  </td>
                </tr>
              ) : (
                <tr
                  key={service.id}
                  className="border-b hover:bg-cyan-50 transition"
                >
                  <td className="py-2 px-2 text-xs font-mono text-cyan-800">
                    {service.serviceId}
                  </td>
                  <td className="py-2 px-2 font-bold text-cyan-900">
                    {service.name}
                  </td>
                  <td className="py-2 px-2 text-cyan-700 whitespace-pre-line">
                    {service.description}
                  </td>
                  <td className="py-2 px-2">
                    {
                      categories.find(
                        (c) => c.key === service.category
                      )?.[lang === "ar" ? "label_ar" : "label_en"] ||
                      service.category
                    }
                  </td>
                  <td className="py-2 px-2 text-cyan-700">
                    {service.subcategory}
                  </td>
                  <td className="py-2 px-2 text-cyan-700">
                    {service.provider}
                  </td>
                  <td className="py-2 px-2 text-cyan-900">
                    {service.price} د.إ
                  </td>
                  <td className="py-2 px-2 text-cyan-900">
                    {service.printingFee || 0} د.إ
                  </td>
                  <td className="py-2 px-2 text-cyan-800 bg-gray-100 font-bold">
                    {service.tax ?? "-"}
                  </td>
                  <td className="py-2 px-2 text-emerald-800 bg-gray-100 font-bold">
                    {service.clientPrice ?? "-"}
                  </td>
                  <td className="py-2 px-2 text-cyan-900">
                    {service.coins}
                  </td>
                  <td className="py-2 px-2 text-cyan-700">
                    {service.duration}
                  </td>
                  <td className="py-2 px-2 text-xs text-cyan-800">
                    {Array.isArray(service.requiredDocuments) && service.requiredDocuments.length > 0
                      ? service.requiredDocuments.map((d, i) => <div key={i}>{d}</div>)
                      : "-"}
                  </td>
                  <td className="py-2 px-2">
                    {service.requireUpload ? (
                      <span
                        title={
                          lang === "ar"
                            ? "يتطلب رفع مستند"
                            : "Requires document upload"
                        }
                        className="inline-block w-5 h-5 bg-cyan-700 rounded text-white font-bold text-center leading-5"
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        title={
                          lang === "ar"
                            ? "لا يتطلب"
                            : "Not required"
                        }
                        className="inline-block w-5 h-5 bg-gray-200 rounded text-gray-500 font-bold text-center leading-5"
                      >
                        ×
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {service.repeatable ? (
                      <span
                        title={
                          lang === "ar"
                            ? "خدمة متعددة"
                            : "Repeatable"
                        }
                        className="inline-block w-5 h-5 bg-emerald-700 rounded text-white font-bold text-center leading-5"
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        title={
                          lang === "ar"
                            ? "خدمة مرة واحدة"
                            : "One time"
                        }
                        className="inline-block w-5 h-5 bg-gray-200 rounded text-gray-500 font-bold text-center leading-5"
                      >
                        ×
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => {
                        setEditingId(service.id);
                        setEditService({
                          ...service,
                          requiredDocuments: Array.isArray(service.requiredDocuments)
                            ? service.requiredDocuments
                            : [],
                        });
                        setEditDocumentsFields(
                          Array.isArray(service.requiredDocuments)
                            ? service.requiredDocuments
                            : [""]
                        );
                      }}
                      className="px-2 py-1 bg-cyan-600 hover:bg-cyan-800 text-white rounded mx-1 transition cursor-pointer"
                    >
                      {lang === "ar" ? "تعديل" : "Edit"}
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-800 text-white rounded mx-1 transition cursor-pointer"
                    >
                      {lang === "ar" ? "حذف" : "Delete"}
                    </button>
                  </td>
                </tr>
              )
            )}
            {filteredServices.length === 0 && (
              <tr>
                <td colSpan={16} className="py-6 text-gray-400">
                  {lang === "ar"
                    ? "لا توجد خدمات"
                    : "No services found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-cyan-700 opacity-70">
        {lang === "ar"
          ? "ملاحظة: يمكنك إضافة حقول جديدة تحت كل فئة أو خدمة فرعية مستقبلًا بسهولة عبر الكود."
          : "Note: You can add new fields or sub-services under each category in the future easily via code."}
      </div>
    </div>
  );
}