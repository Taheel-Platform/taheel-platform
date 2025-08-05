import SectionTitle from "@/components/services/SectionTitle";
import ServiceProfileCard from "@/components/services/ServiceProfileCard";

function objectToArray(obj) {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === "object") return Object.values(obj);
  return [];
}

export default function ServiceSection({
  groups = [],
  filterService,
  lang,
  client,
  onServicePaid,
  addNotification,
  search,
  setSearch,
  companies,
}) {
  const filterFn = typeof filterService === "function" ? filterService : () => true;

  return (
    <div className="space-y-8">
      {groups.map((group, idx) => {
        const arr = objectToArray(group.services).filter(filterFn);
        if (!arr.length) return null;
        return (
          <div key={group.title + idx}>
            <SectionTitle icon={null} color={"emerald"}>
              {group.title}
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {arr.map((srv, i) => (
                <ServiceProfileCard
  key={srv.name + i}
  category={srv.category}
  name={srv.name}
  description={srv.description}
  price={srv.price} // ✅ السعر الأساسي
  printingFee={srv.printingFee} // ✅ رسوم الطباعة
  tax={srv.tax} // ✅ الضريبة
  clientPrice={srv.clientPrice} // ✅ السعر النهائي (لو متوفر)
  duration={srv.duration}
  requiredDocuments={srv.requiredDocuments || srv.documents || []} // ✅ التصحيح هنا
  requireUpload={srv.requireUpload}
  coins={srv.coins || 0}
  lang={lang}
  userId={client.userId}
  userWallet={client.walletBalance || 0}
  userCoins={client.coins || 0}
  onPaid={onServicePaid}
  coinsPercent={0.1}
  addNotification={addNotification}
  serviceId={srv.serviceId}
  repeatable={srv.repeatable}
  allowPaperCount={srv.allowPaperCount}
  pricePerPage={srv.pricePerPage}
  userEmail={client.email}
/>
              ))}
            </div>
          </div>
        );
      })}
      {/* رسالة إذا لا توجد أي خدمات بعد الفلترة */}
      {groups.every(g => !objectToArray(g.services).filter(filterFn).length) && (
        <div className="text-center text-gray-400 py-8">
          لا توجد خدمات متاحة حاليا
        </div>
      )}
    </div>
  );
}