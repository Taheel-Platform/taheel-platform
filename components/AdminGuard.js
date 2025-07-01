"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase.client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      // جلب بيانات المستخدم من Firestore
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      if (userDoc.exists() && (userDoc.data().role === "admin" || userDoc.data().role === "superadmin")) {
        setAllowed(true);
      } else {
        router.replace("/unauthorized");
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  if (checking) return <div className="p-10 text-center">جاري التأكد من الصلاحية...</div>;
  if (!allowed) return null;
  return children;
}