"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, rtdb } from "@/lib/firebase.client";
import { onAuthStateChanged } from "firebase/auth";
import { ref as dbRef, get } from "firebase/database";

/**
 * SuperAdminGuard
 * يحمي صفحات المدير العام فقط (role === "superadmin")
 * إذا لم يكن المستخدم سوبر أدمن ⇦ ينقله إلى unauthorized
 * إذا لم يكن مسجّل ⇦ ينقله إلى /login
 */
export default function SuperAdminGuard({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const snap = await get(dbRef(rtdb, `users/${user.uid}`));
      if (snap.exists() && snap.val().role === "superadmin") {
        setAllowed(true);
        setAdminData({ ...snap.val(), id: user.uid });
      } else {
        router.replace("/unauthorized");
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  if (checking) return <div className="p-10 text-center">جاري التأكد من الصلاحية...</div>;
  if (!allowed) return null;
  // يمكنك تمرير بيانات المدير العام للأبناء
  return typeof children === "function" ? children(adminData) : children;
}