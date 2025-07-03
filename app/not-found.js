"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Force dynamic rendering to prevent static export issues
export const dynamic = 'force-dynamic';

function NotFoundContent() {
  // حتى لو لم تستخدمها فعليًا، فقط تواجدها هنا يحل المشكلة
  useSearchParams();
  return (
    <div style={{textAlign: "center", marginTop: 100, fontSize: 24}}>
      الصفحة غير موجودة
      <br />
      Page Not Found
    </div>
  );
}

export default function NotFoundPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotFoundContent />
    </Suspense>
  );
}