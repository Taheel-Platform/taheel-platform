"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function ForceLangWrapper({ defaultLang = "ar" }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // إذا لم يوجد باراميتر lang في الرابط، ضيفه فقط!
    let paramLang = searchParams.get("lang");
    if (!paramLang) {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", defaultLang);
      router.replace(url.pathname + url.search);
    }
    // لا يوجد أي تعامل مع localStorage أو تغيير إذا اللغة مختلفة
  }, [searchParams, router, defaultLang]);

  return null;
}