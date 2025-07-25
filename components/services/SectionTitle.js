import SectionTitle from "@/components/services/SectionTitle";
import ServiceProfileCard from "@/components/services/ServiceProfileCard";

export default function ServiceSection({
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
  const filteredServices = services.filter(filterService);

  if (!filteredServices.length)
    return (
      <div className="text-gray-400 text-xl text-center py-8">
        {lang === "ar" ? "لا توجد خدمات متاحة حالياً" : "No services available now"}
      </div>
    );

  return (
    <>
      <SectionTitle icon={icon} color={color}>
        {title}
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {filteredServices.map((srv, i) => (
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
          />
        ))}
      </div>
    </>
  );
}