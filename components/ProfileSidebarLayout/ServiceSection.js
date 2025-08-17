import { useEffect, useState } from "react";
import SectionTitle from "@/components/services/SectionTitle";
import ServiceProfileCard from "@/components/services/ServiceProfileCard";
import { firestore } from "@/lib/firebase.client";
import { collection, query, where, getDocs } from "firebase/firestore";

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

  // ✅ عرف الـ state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ استخرج الـ clientId اللي Firestore مسميه userId في collection requests
  // (حسب لقطة الشاشة قيمته رقم العميل COM-400-0106)
  const clientId = client?.customerId || client?.userId || null;

useEffect(() => {
  async function fetchOrders() {
    setLoading(true);
    try {
      const q = query(
        collection(firestore, "requests"),
        where("userId", "==", clientId) // هنا استخدم clientId وليس client.customerId
      );
      const snapshot = await getDocs(q);
      setOrders(
        snapshot.docs.map(d => ({ ...d.data(), orderId: d.id }))
      );
    } catch (error) {
      console.error("fetchOrders error:", error);
      setOrders([]);
    }
    setLoading(false);
  }
  if (clientId) fetchOrders();
  else setOrders([]);
}, [clientId]);

  return (
    <div className="space-y-8">
      {groups.map((group, idx) => {
        const arr = objectToArray(group.services).filter(filterFn);
        if (!arr.length) return null;
        return (
          <div key={group.title + idx}>
            <SectionTitle icon={null} color="emerald">
              {group.title}
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {arr.map((srv, i) => (
                <ServiceProfileCard
                  key={srv.name + i}
                  category={srv.category}
                  name={srv.name}
                  description={srv.description}
                  price={srv.price}
                  printingFee={srv.printingFee}
                  tax={srv.tax}
                  clientPrice={srv.clientPrice}
                  duration={srv.duration}
                  requiredDocuments={srv.requiredDocuments || srv.documents || []}
                  requireUpload={srv.requireUpload}
                  coins={srv.coins || 0}
                  lang={lang}
                  // ⚠️ هنا برضه ابعت رقم العميل لأن requests.userId هو رقم العميل
                  userId={client?.customerId || client?.userId}
                  userWallet={client?.walletBalance || 0}
                  userCoins={client?.coins || 0}
                  onPaid={onServicePaid}
                  coinsPercent={0.1}
                  addNotification={addNotification}
                  serviceId={srv.serviceId}
                  repeatable={srv.repeatable}
                  allowPaperCount={srv.allowPaperCount}
                  pricePerPage={srv.pricePerPage}
                  userEmail={client?.email}
                />
              ))}
            </div>
          </div>
        );
      })}

      {groups.every(g => !objectToArray(g.services).filter(filterFn).length) && (
        <div className="text-center text-gray-400 py-8">
          لا توجد خدمات متاحة حاليا
        </div>
      )}

      <SectionTitle icon={null} color="emerald">
        {lang === "ar" ? "عروضك الحالية / طلباتك المدفوعة" : "Your Current Offers / Paid Orders"}
      </SectionTitle>

      {loading ? (
        <div className="text-center text-gray-400 py-4">
          {lang === "ar" ? "جاري التحميل..." : "Loading..."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {orders.length > 0 ? (
            orders.map((order, idx) => {
              // ✅ createdAt قد يكون string أو Timestamp
              const createdAt =
                order.createdAt?.toDate
                  ? order.createdAt.toDate()
                  : order.createdAt
                  ? new Date(order.createdAt)
                  : null;

              return (
                <div key={order.orderId || idx} className="border rounded-lg p-4 bg-white shadow">
                  <div className="font-bold text-emerald-600 mb-2">
                    {order.serviceName}
                  </div>
                  <div className="text-gray-700 text-sm mb-1">
                    {lang === "ar" ? "إجمالي السعر: " : "Total Price: "} {order.total ?? order.paidAmount ?? 0} {lang === "ar" ? "د.إ" : "AED"}
                  </div>
                  <div className="text-gray-500 text-xs mb-1">
                    {lang === "ar" ? "تاريخ الطلب: " : "Order Date: "}
                    {createdAt ? createdAt.toLocaleString(lang === "ar" ? "ar-EG" : "en-US") : "-"}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-400 py-4">
              {lang === "ar" ? "لا يوجد طلبات حتى الآن" : "No orders yet"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
