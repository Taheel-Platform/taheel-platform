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
  category, // مررها من الأعلى (resident, company, ...)
}) {
  // فلترة الخدمات على حسب الفلتر المطلوب
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
  key={srv.serviceId || srv.name + i}
  category={srv.category || category}
  name={srv.name}
  name_en={srv.name_en}
  description={srv.description}
  description_en={srv.description_en}
  price={srv.price}                  
  printingFee={srv.printingFee}
  tax={srv.tax}
  clientPrice={srv.clientPrice}
  duration={srv.duration}
  requiredDocuments={srv.requiredDocuments || []}
  coins={srv.coins || 0}
  requireUpload={srv.requireUpload}
  repeatable={srv.repeatable}
  allowPaperCount={srv.allowPaperCount}
  pricePerPage={srv.pricePerPage}
  userId={client.userId}
  userWallet={client.walletBalance || 0}
  userCoins={client.coins || 0}
  lang={lang}
  onPaid={onPaid}
  serviceId={srv.serviceId}
  userEmail={client.email}
  longDescription={srv.longDescription}
  longDescription_en={srv.longDescription_en}
  addNotification={addNotification}
/>
        ))}
      </div>
    </>
  );
}