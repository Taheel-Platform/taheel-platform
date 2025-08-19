"use client";

import { useEffect, useMemo, useState } from "react";
import { translateServiceFields } from "@/utils/translate";

export default function useServiceTranslations(services, lang, options = {}) {
  const { idKey = "serviceId", fields = ["name", "description", "longDescription"] } = options;
  const [map, setMap] = useState({});
  const target = lang === "ar" ? "ar" : "en";

  const list = useMemo(() => Array.isArray(services) ? services : [], [services]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!list.length) {
        if (alive) setMap({});
        return;
      }
      // عربي: لا ترجمة
      if (target === "ar") {
        const m = {};
        for (const s of list) {
          const sid = s?.[idKey] || s?.id || s?.name;
          m[sid] = fields.reduce((acc, f) => {
            acc[f] = s?.[f] || "";
            return acc;
          }, {});
        }
        if (alive) setMap(m);
        return;
      }

      const entries = await Promise.all(
        list.map(async (s) => {
          const sid = s?.[idKey] || s?.id || s?.name;
          const tr = await translateServiceFields({ service: s, lang, fields, idKey });
          return [sid, tr];
        })
      );

      if (alive) setMap(Object.fromEntries(entries));
    }

    run();
    return () => {
      alive = false;
    };
  }, [target, list, lang, idKey, fields.join("|")]);

  return map; // { serviceKey: { name, description, longDescription } }
}