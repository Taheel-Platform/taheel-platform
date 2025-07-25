"use client";
import SectionTitle from "@/components/services/SectionTitle";
import ServiceProfileCard from "@/components/services/ServiceProfileCard";

export default function ServiceSection({ services = [], lang = "ar", client }) {
  // حماية إضافية: تأكد أن الخدمات مصفوفة دائماً
  if (!Array.isArray(services)) services = [];

  return (
    <section className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* عنوان القسم */}
      <SectionTitle color="#059669">
        {lang === "ar" ? "الخدمات" : "Services"}
      </SectionTitle>
      {/* كروت الخدمات */}
      {services.length === 0 ? (
        <div className="text-gray-400 text-xl text-center py-8">
          {lang === "ar" ? "لا توجد خدمات متاحة حالياً" : "No services available now"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8 w-full">
          {services.map((srv, i) => (
            <ServiceProfileCard
              key={srv.serviceId || srv.name + i}
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
              serviceId={srv.serviceId}
              repeatable={srv.repeatable}
              allowPaperCount={srv.allowPaperCount}
              pricePerPage={srv.pricePerPage}
              userEmail={client.email}
            />
          ))}
        </div>
      )}
    </section>
  );
}