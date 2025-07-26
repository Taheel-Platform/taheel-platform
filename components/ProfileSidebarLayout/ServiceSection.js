import SectionTitle from "@/components/services/SectionTitle";
import ServiceProfileCard from "@/components/services/ServiceProfileCard";

export default function Sidebar({
  icon,
  color,
  title,
  services = [],
  filterService,
  lang,
  client,
  onPaid,
  addNotification,
}) {
  // حماية إضافية
  if (!Array.isArray(services)) services = [];
  if (!services.length) return null;

  return (
    <>
      <SectionTitle icon={icon} color={color}>
        {title}
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {services
          .filter(filterService || (() => true))
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