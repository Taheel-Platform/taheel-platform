import { ResidentCard } from "@/components/cards/ResidentCard";
import CompanyCardGold from "@/components/cards/CompanyCard";
import { NonResidentCard } from "@/components/cards/NonResidentCard";

export default function PersonalInfoSection({ client, ownerResident, lang = "ar" }) {
  const clientType = (client?.type || client?.accountType || "").toLowerCase();

  return (
    <section className="w-full max-w-xl mx-auto flex flex-col items-center gap-6">
      {/* عنوان القسم */}
      <h2 className="text-emerald-700 font-extrabold text-2xl mb-2">
        {lang === "ar" ? "المعلومات الشخصية" : "Personal Info"}
      </h2>
      {/* كارت العميل حسب نوع الحساب */}
      {clientType === "resident" && (
        <ResidentCard client={client} lang={lang} />
      )}
      {clientType === "company" && (
        <>
          <CompanyCardGold company={client} lang={lang} />
          {/* بيانات مالك الشركة (لو موجودة) */}
          {ownerResident && <ResidentCard client={ownerResident} lang={lang} />}
        </>
      )}
      {clientType === "nonresident" && (
        <NonResidentCard client={client} lang={lang} />
      )}
    </section>
  );
}