"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  FaCheckCircle, FaRegCircle, FaSearch, FaEye, FaTimes, FaDownload, FaUserPlus, FaEdit, FaCamera, FaStickyNote
} from "react-icons/fa";
import { firestore, auth } from "@/lib/firebase.client";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";

// --- دوال مساعدة ---
function getStatus(staff) {
  if (staff.status === "online") {
    return { label: "أونلاين", color: "text-green-600 bg-green-50", icon: <FaCheckCircle /> };
  }
  return { label: "أوفلاين", color: "text-gray-400 bg-gray-100", icon: <FaRegCircle /> };
}

function getStaffName(staff) {
  if (staff.name) return staff.name;
  if (staff.firstName || staff.lastName) return [staff.firstName, staff.lastName].filter(Boolean).join(" ");
  return "—";
}

function getProfilePic(staff) {
  return staff.profilePic || staff.photoUrl || "/avatar.svg";
}

function generateEmployeeNumber(staffList) {
  const nums = staffList
    .filter(s => s.employeeNumber && /^EMP-\d{4}-\d{3}$/.test(s.employeeNumber))
    .map(s => parseInt(s.employeeNumber.split("-")[2], 10));
  const nextNum = (nums.length ? Math.max(...nums) + 1 : 1);
  const year = new Date().getFullYear();
  return `EMP-${year}-${String(nextNum).padStart(3, "0")}`;
}

function StaffSection() {
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const usersRef = collection(firestore, "users");
    // جلب الموظفين والمدراء فقط
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const arr = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.type === "employee" || data.type === "admin") {
          arr.push({ ...data, key: docSnap.id });
        }
      });
      setStaff(arr);
    });
    return () => unsubscribe();
  }, []);

  const filteredStaff = staff.filter(s =>
    getStaffName(s).toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || "").includes(search) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.employeeNumber || "").includes(search)
  );

  function getTodayEntry(staff) {
    const today = new Date().toISOString().slice(0, 10);
    if (Array.isArray(staff.attendance)) {
      const todayLog = staff.attendance.find(a => a.date === today);
      if (todayLog) return `${todayLog.date} ${todayLog.in}`;
    }
    if (Array.isArray(staff.enterLog) && staff.enterLog.length) {
      const log = staff.enterLog.find(l => l.date === today);
      if (log) return `${log.date} ${log.in}`;
    }
    if (Array.isArray(staff.loginHistory)) {
      const log = staff.loginHistory.find(l => l.date === today);
      if (log) {
        const d = new Date(log.in);
        return `${log.date} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
      }
    }
    return "-";
  }

  const handleAdd = () => setShowAdd(true);

  return (
    <div className="bg-gradient-to-b from-emerald-50 to-white min-h-screen py-8 px-2 md:px-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-3xl font-extrabold text-emerald-800 drop-shadow-sm">
          إدارة الموظفين والمدراء
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <input
              className="border border-emerald-200 focus:border-emerald-400 rounded px-3 py-2 w-56 pr-10 text-base text-emerald-900 shadow-sm transition cursor-pointer"
              placeholder="بحث بالاسم/الهاتف/الإيميل/رقم الموظف"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: "#f9fafb" }}
            />
            <FaSearch className="absolute right-3 top-3 text-emerald-300 pointer-events-none" />
          </div>
          <button
            onClick={handleAdd}
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white rounded-full px-5 py-2 font-bold flex items-center gap-2 shadow transition cursor-pointer"
          >
            <FaUserPlus /> إضافة موظف/مدير
          </button>
        </div>
      </div>

      {/* جدول الموظفين */}
      <div className="overflow-x-auto rounded-xl shadow bg-white/95 border border-emerald-100">
        <table className="min-w-full text-center text-base">
          <thead>
            <tr className="bg-emerald-50 text-emerald-900 font-bold">
              <th className="py-3">الرقم</th>
              <th className="py-3">الصورة</th>
              <th className="py-3">الاسم</th>
              <th className="py-3">الحالة</th>
              <th className="py-3">الدور</th>
              <th className="py-3">دخول اليوم</th>
              <th className="py-3">الهاتف</th>
              <th className="py-3">الإيميل</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-gray-400 py-6 text-lg">
                  لا يوجد موظفين حالياً.
                </td>
              </tr>
            ) : filteredStaff.map((s) => {
              const status = getStatus(s);
              return (
                <tr
                  key={s.key}
                  className="hover:bg-emerald-50 transition cursor-pointer"
                  onClick={() => setSelected(s)}
                  style={{cursor:'pointer'}}
                >
                  <td className="font-mono font-bold text-indigo-700">{s.employeeNumber || "-"}</td>
                  <td>
                    <Image src={getProfilePic(s)} alt={getStaffName(s)} width={44} height={44} className="w-11 h-11 rounded-full border-2 border-emerald-100 mx-auto bg-white shadow cursor-pointer" />
                  </td>
                  <td className="font-bold text-emerald-900 cursor-pointer">{getStaffName(s)}</td>
                  <td>
                    <span className={`font-semibold rounded-full px-3 py-1 text-sm ${status.color} flex items-center gap-1 justify-center w-fit mx-auto cursor-pointer`}>
                      {status.icon} {status.label}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold cursor-pointer ${
                      s.type === "admin"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {s.type === "admin" ? "مدير" : "موظف"}
                    </span>
                  </td>
                  <td className="text-gray-700 cursor-pointer">{getTodayEntry(s)}</td>
                  <td className="text-gray-700 cursor-pointer">{s.phone || "-"}</td>
                  <td className="text-gray-700 cursor-pointer">{s.email || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* بطاقة الموظف */}
      {selected && (
        <StaffCard
          staff={selected}
          onClose={() => setSelected(null)}
          onImageChange={async (img) => {
            const userRef = doc(firestore, "users", selected.key);
            await updateDoc(userRef, { profilePic: img });
            setSelected({ ...selected, profilePic: img });
          }}
          onAddNote={async (noteText) => {
            if (!noteText.trim()) return;
            const newNote = { date: new Date().toISOString().slice(0, 10), note: noteText };
            const notes = Array.isArray(selected.notes) ? [...selected.notes, newNote] : [newNote];
            const userRef = doc(firestore, "users", selected.key);
            await updateDoc(userRef, { notes });
            setSelected({ ...selected, notes });
          }}
        />
      )}

      {/* نافذة إضافة موظف/مدير */}
      {showAdd && (
        <StaffAddModal onClose={() => setShowAdd(false)} staffList={staff} />
      )}
    </div>
  );
}

// بطاقة الموظف
function StaffCard({ staff, onClose, onImageChange, onAddNote }) {
  const [editMode, setEditMode] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");

  let totalHours = staff.workHoursMonth;
  if (typeof totalHours !== "number" && Array.isArray(staff.attendance)) {
    totalHours = staff.attendance.reduce((acc, cur) => acc + getHourDiff(cur.in, cur.out), 0);
  }
  const doneCount = staff.transactionsDone || staff.doneCount || 0;
  const notes = Array.isArray(staff.notes) ? staff.notes : [];

  // تغيير الصورة
  const handleImageInput = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgFile(ev.target.result);
      onImageChange(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNote = async () => {
    await onAddNote(noteText);
    setNoteText("");
    setShowNote(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-10 relative border-2 border-emerald-100">
        <button className="absolute top-3 left-3 text-gray-400 hover:text-gray-700 font-bold text-2xl cursor-pointer" onClick={onClose}>
          <FaTimes />
        </button>
        <div className="flex flex-col md:flex-row gap-7 items-center">
          <div className="relative group mb-2 md:mb-0">
            <Image src={imgFile || getProfilePic(staff)} alt={getStaffName(staff)} width={144} height={144}
                 className="w-36 h-36 rounded-full border-4 border-emerald-200 shadow object-cover bg-white transition-transform group-hover:scale-105 cursor-pointer"
            />
            <label title="تغيير الصورة"
                   className="absolute bottom-2 right-2 bg-white/80 rounded-full p-2 shadow cursor-pointer border border-emerald-200 hover:bg-emerald-50 transition"
                   style={{zIndex: 10}}>
              <FaCamera className="text-emerald-700 text-lg" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageInput}/>
            </label>
          </div>
          <div className="flex-1 flex flex-col gap-2 items-center md:items-start">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-emerald-800">{getStaffName(staff)}</span>
              <span className="font-mono text-indigo-700 bg-indigo-50 rounded-full px-3 py-1 text-xs ml-2">{staff.employeeNumber || "-"}</span>
              {staff.type === "admin" ? (
                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold ml-2">مدير</span>
              ) : (
                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold ml-2">موظف</span>
              )}
            </div>
            <div className="flex gap-2 items-center mt-1">
              {getStatus(staff).label === "أونلاين"
                ? <span className="text-green-600 flex items-center gap-1"><FaCheckCircle /> أونلاين</span>
                : <span className="text-gray-400 flex items-center gap-1"><FaRegCircle /> أوفلاين</span>
              }
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full">
              <div><span className="font-bold text-emerald-700">الجوال:</span> <span className="text-gray-700">{staff.phone || "-"}</span></div>
              <div><span className="font-bold text-emerald-700">الإيميل:</span> <span className="text-gray-700">{staff.email || "-"}</span></div>
              <div><span className="font-bold text-emerald-700">رقم الإقامة:</span> <span className="text-gray-700">{staff.eidNumber || staff.iqama || "-"}</span></div>
              <div><span className="font-bold text-emerald-700">المسمى الوظيفي:</span> <span className="text-gray-700">{staff.jobTitle || "-"}</span></div>
              <div><span className="font-bold text-emerald-700">ساعات العمل (اليوم):</span> <span className="text-gray-700">{staff.workHoursToday ? staff.workHoursToday + " ساعة" : "-"}</span></div>
              <div><span className="font-bold text-emerald-700">ساعات العمل (الشهر):</span> <span className="text-gray-700">{totalHours !== undefined ? totalHours + " ساعة" : "-"}</span></div>
              <div><span className="font-bold text-emerald-700">طلبات منجزة (الشهر):</span> <span className="text-gray-700">{doneCount}</span></div>
              <div><span className="font-bold text-emerald-700">الجهات المرتبطة:</span> <span className="text-gray-700">{Array.isArray(staff.providers) ? staff.providers.join(", ") : "-"}</span></div>
            </div>
          </div>
        </div>
        <div className="mt-6 mb-3">
          <div className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
            <FaStickyNote /> ملاحظات للموظف
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs ml-3 flex items-center gap-1 cursor-pointer"
              onClick={() => setShowNote(v => !v)}>
              + إضافة ملاحظة
            </button>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 min-h-12 text-emerald-900 shadow-inner leading-relaxed">
            {notes.length > 0
              ? notes.map((n, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-xs text-gray-500">{n.date}:</span>
                    {" "}
                    <span>{n.note}</span>
                  </div>
                ))
              : "لا يوجد ملاحظات"}
          </div>
          {showNote && (
            <div className="mt-3 flex gap-2">
              <input className="border rounded px-3 py-2 flex-1"
                value={noteText}
                autoFocus
                onChange={e=>setNoteText(e.target.value)}
                placeholder="اكتب الملاحظة هنا..." />
              <button className="bg-emerald-600 text-white px-4 rounded cursor-pointer" onClick={handleSaveNote}>حفظ</button>
              <button className="bg-gray-300 text-gray-700 px-3 rounded cursor-pointer" onClick={()=>setShowNote(false)}>إلغاء</button>
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <button className="bg-blue-600 hover:bg-blue-700 text-white rounded px-6 py-2 flex items-center gap-1 font-bold shadow cursor-pointer">
            <FaDownload /> تصدير تقرير الشهر
          </button>
          <button className="bg-emerald-700 hover:bg-emerald-800 text-white rounded px-6 py-2 flex items-center gap-1 font-bold shadow cursor-pointer">
            <FaEye /> كل التفاصيل
          </button>
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-6 py-2 flex items-center gap-1 font-bold shadow cursor-pointer"
            onClick={() => setEditMode(true)}>
            <FaEdit /> تعديل البيانات
          </button>
        </div>
        {editMode && (
          <EditStaffModal staff={staff} onClose={() => setEditMode(false)} />
        )}
      </div>
    </div>
  );
}

// نافذة إضافة موظف/مدير جديد (Firebase Auth + Firestore)
function StaffAddModal({ onClose, staffList }) {
  const [data, setData] = useState({
    type: "employee",
    name: "",
    email: "",
    phone: "",
    eidNumber: "",
    jobTitle: "",
    profilePic: "",
    status: "offline",
    password: "",
    providers: [],
  });
  const [img, setImg] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [providersList, setProvidersList] = useState([]);
  const [allSelected, setAllSelected] = useState(false);

  useEffect(() => {
    // جلب جميع الجهات من كل الجذور (مقيمين/غير مقيمين/شركات/أخرى)
    async function fetchAllProviders() {
      const roots = ["resident", "nonresident", "company", "other"];
      let all = [];
      for (const root of roots) {
        const docRef = doc(firestore, "servicesByClientType", root);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.providers)) all = [...all, ...data.providers];
        }
      }
      // إزالة التكرار
      setProvidersList([...new Set(all)]);
    }
    fetchAllProviders();
  }, []);

  function handleImg(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      setImg(e.target.result);
      setData(d => ({ ...d, profilePic: e.target.result }));
    };
    reader.readAsDataURL(file);
  }

  // اختيار كل الجهات/إلغاء الكل
  function handleSelectAllProviders() {
    if (allSelected) {
      setData(d => ({ ...d, providers: [] }));
      setAllSelected(false);
    } else {
      setData(d => ({ ...d, providers: providersList }));
      setAllSelected(true);
    }
  }

  // اختيار جهة واحدة
  function handleProviderChange(provider) {
    let arr = [...data.providers];
    if (arr.includes(provider)) {
      arr = arr.filter(p => p !== provider);
    } else {
      arr.push(provider);
    }
    setData(d => ({ ...d, providers: arr }));
    setAllSelected(arr.length === providersList.length);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSuccess("");
    try {
      // 1. سجل الموظف في Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const { user } = userCredential;
      // 2. احفظ بياناته في Firestore تحت uid
      const employeeNumber = generateEmployeeNumber(staffList);
      const userData = {
        ...data,
        profilePic: img,
        registeredAt: new Date().toISOString(),
        employeeNumber,
        uid: user.uid,
        role: data.type
      };
    await setDoc(doc(firestore, "users", employeeNumber), {
  ...userData,
  uid: user.uid, // احتفظ بالـ UID للربط مع Authentication إذا احتجته
});
      setSuccess("تم إنشاء موظف جديد بنجاح!"); // ✅ أضف رسالة النجاح هنا
      setLoading(false);
      setTimeout(() => {
        onClose(); // ✅ يغلق المودال بعد 1.8 ثانية
      }, 1800);
    } catch (err) {
      setError(err.message || "حدث خطأ!");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border-2 border-emerald-200 relative animate-fade-in">
        <button className="absolute top-3 left-3 text-gray-400 hover:text-gray-700 font-bold text-2xl cursor-pointer" onClick={onClose} type="button">
          <FaTimes />
        </button>
        <div className="text-xl font-bold text-emerald-700 mb-6 flex items-center gap-2">
          <FaUserPlus /> إضافة موظف/مدير جديد
        </div>
        {error && <div className="bg-red-100 text-red-800 p-2 rounded mb-2">{error}</div>}
        <div className="flex flex-col items-center mb-4">
          <div className="relative group mb-2">
            <Image src={img || "/avatar.svg"} alt="صورة الموظف" width={96} height={96} className="w-24 h-24 rounded-full border-4 border-emerald-200 shadow object-cover bg-white" />
            <label title="إضافة صورة" className="absolute bottom-2 right-2 bg-white/80 rounded-full p-2 shadow cursor-pointer border border-emerald-200 hover:bg-emerald-50 transition">
              <FaCamera className="text-emerald-700 text-lg" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImg}/>
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <input className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="اسم الموظف أو المدير" value={data.name}
            onChange={e=>setData(d=>({...d, name: e.target.value}))} required />
          <input className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="البريد الإلكتروني" type="email" value={data.email}
            onChange={e=>setData(d=>({...d, email: e.target.value}))} required />
          <div className="relative">
            <input
              className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
              placeholder="كلمة المرور (للدخول)"
              type={showPass ? "text" : "password"}
              value={data.password}
              onChange={e => setData(d => ({ ...d, password: e.target.value }))}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-700 cursor-pointer"
              onClick={() => setShowPass(v => !v)}
              tabIndex={-1}
            >
              {showPass ? "إخفاء" : "إظهار"}
            </button>
          </div>
          <input className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="رقم الهاتف" value={data.phone}
            onChange={e=>setData(d=>({...d, phone: e.target.value}))} required />
          <input className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="رقم الإقامة" value={data.eidNumber}
            onChange={e=>setData(d=>({...d, eidNumber: e.target.value}))} />
          <input className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="المسمى الوظيفي" value={data.jobTitle}
            onChange={e=>setData(d=>({...d, jobTitle: e.target.value}))} />
          <select className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            value={data.type} onChange={e=>setData(d=>({...d, type: e.target.value}))}>
            <option value="employee">موظف</option>
            <option value="admin">مدير</option>
          </select>
        </div>
        {/* اختيار الجهات */}
        <div className="mt-4">
          <div className="font-bold text-emerald-700 mb-2">جهات الخدمة المرتبطة:</div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer font-semibold text-indigo-700 bg-indigo-100 px-3 py-1 rounded">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAllProviders}
                className="mr-1 accent-indigo-600"
              />
              كل الجهات
            </label>
            {providersList.map((prov) => (
              <label key={prov} className="cursor-pointer font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded">
                <input
                  type="checkbox"
                  checked={data.providers.includes(prov)}
                  onChange={() => handleProviderChange(prov)}
                  className="mr-1 accent-emerald-600"
                />
                {prov}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading} className="mt-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-full px-8 py-3 font-bold flex items-center gap-2 shadow transition cursor-pointer">
          {loading ? "جاري الإضافة..." : <><FaUserPlus /> إضافة</>}
        </button>
      </form>
    </div>
  );
}

// نافذة تعديل (بسيطة)
function EditStaffModal({ staff, onClose }) {
  const [data, setData] = useState({ ...staff });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userRef = doc(firestore, "users", staff.key);
    await updateDoc(userRef, {
      ...data
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 border-2 border-emerald-200 relative animate-fade-in">
        <button className="absolute top-3 left-3 text-gray-400 hover:text-gray-700 font-bold text-2xl cursor-pointer" onClick={onClose} type="button">
          <FaTimes />
        </button>
        <div className="text-xl font-bold text-emerald-700 mb-4 flex items-center gap-2">
          <FaEdit /> تعديل بيانات الموظف أو المدير
        </div>
        <div className="flex flex-col gap-3">
          <input className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="اسم الموظف أو المدير" value={data.name}
            onChange={e=>setData(d=>({...d, name: e.target.value}))} required />
          <input className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="البريد الإلكتروني" type="email" value={data.email}
            onChange={e=>setData(d=>({...d, email: e.target.value}))} required />
          <input className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="رقم الهاتف" value={data.phone}
            onChange={e=>setData(d=>({...d, phone: e.target.value}))} required />
          <input className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="رقم الإقامة" value={data.eidNumber}
            onChange={e=>setData(d=>({...d, eidNumber: e.target.value}))} />
          <input className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="المسمى الوظيفي" value={data.jobTitle}
            onChange={e=>setData(d=>({...d, jobTitle: e.target.value}))} />
          <select className="border rounded px-3 py-2 w-full text-emerald-900 bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            value={data.type} onChange={e=>setData(d=>({...d, type: e.target.value}))}>
            <option value="employee">موظف</option>
            <option value="admin">مدير</option>
          </select>
        </div>
        <button type="submit" className="mt-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-full px-8 py-3 font-bold flex items-center gap-2 shadow transition cursor-pointer">
          <FaEdit /> حفظ التعديلات
        </button>
      </form>
    </div>
  );
}

// دالة لحساب الفرق بين وقتين (ساعة:دقيقة)
function getHourDiff(start, end) {
  if (!start || !end) return 0;
  if (typeof start === "number" && typeof end === "number") {
    return Math.round((end - start) / 1000 / 60 / 60);
  }
  const [h1, m1] = ("" + start).split(":").map(Number);
  const [h2, m2] = ("" + end).split(":").map(Number);
  return Math.max(0, (h2 + m2 / 60) - (h1 + m1 / 60));
}

export default function StaffSectionWrapper(props) {
  return (
    <Suspense fallback={null}>
      <StaffSection {...props} />
    </Suspense>
  );
}