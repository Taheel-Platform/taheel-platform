"use client";
import { Suspense } from "react";

function NotFoundContent() {
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