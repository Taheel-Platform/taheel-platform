import SectionTitle from "@/components/services/SectionTitle";
import ServiceProfileCard from "@/components/services/ServiceProfileCard";

function objectToArray(obj) {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === "object") return Object.values(obj);
  return [];
}

export default function ServiceSection({
  icon,
  color,
  title,
  services,
  filterService,
  lang,
  client,
  onPaid,
  addNotification,
}) {
  const safeServices = objectToArray(services);
  const filterFn = typeof filterService === "function" ? filterService : () => true;

  if (!safeServices.length) return (
    <div className="text-center text-gray-400 py-8">
      لا توجد خدمات متاحة حاليا
    </div>
  );

  return (
    <>
      <SectionTitle icon={icon} color={color}>
        {title}
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {safeServices
          .filter(filterFn)
          .map((srv, i) => (
            <ServiceProfileCard
              key={srv.name + i}
              category={srv.category}
              name={srv.name}
              description={srv.description}
              price={srv.price}
              duration={srv.duration}
              requiredDocs={srv.documents || []}
              requireUpload={srv.requireUpload}
              coins={srv.coins || 0}
              lang={lang}
              userId={client.userId}
              userWallet={client.walletBalance || 0}
              userCoins={client.coins || 0}
              onPaid={onPaid}
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
    </>
  );
}