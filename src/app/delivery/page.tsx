"use client";

import { useEffect, useState } from "react";
import { DeliveryScreen } from "@/components/delivery/delivery-screen";

export default function DeliveryPage() {
  const [delivery, setDelivery] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [deliveriesRes, todayRes] = await Promise.all([
          fetch("/api/deliveries", { cache: "no-store" }),
          fetch("/api/deliveries/today", { cache: "no-store" }),
        ]);

        if (!deliveriesRes.ok || !todayRes.ok) {
          throw new Error("Gagal mengambil data pengiriman.");
        }

        const deliveriesPayload = await deliveriesRes.json();
        const todayPayload = await todayRes.json();

        // Map the API responses into the expected view model
        const deliveriesData = deliveriesPayload?.data || {};
        const todayData = todayPayload?.data || {};

        const INFO_BULLETS: string[] = deliveriesData.infoBullets ?? [
          "Makan siang diantar sekitar pukul 11.30 WIB, makan malam sekitar pukul 17.30 WIB",
          "Jika penerima tidak ada di tempat, kurir akan menghubungi nomor HP di alamat",
          "Status berubah saat pesanan disiapkan, dibawa kurir, dan diterima",
        ];

        const mapDeliveryToItem = (d: any) => {
          if (!d) return null;
          const statusTone = d.status === "SHIPPED" ? "active" : d.status === "DELIVERED" ? "completed" : "scheduled";
          return { ...d, statusTone, menuName: d.menuName || "Menu belum tersedia" };
        };

        const todayDeliveryMapped = todayData.todayDelivery ? mapDeliveryToItem(todayData.todayDelivery) : null;
        const upcomingMapped = (deliveriesData.upcomingDeliveries || []).map(mapDeliveryToItem);
        const recentMapped = (deliveriesData.recentDeliveries || []).map(mapDeliveryToItem);

        setDelivery({
          periodLabel: deliveriesData.periodLabel || "Periode minggu ini",
          todayDelivery: todayDeliveryMapped,
          upcomingDeliveries: upcomingMapped,
          recentDeliveries: recentMapped,
          infoBullets: INFO_BULLETS,
          emptyStateTitle: "Belum ada data pengiriman untuk minggu ini.",
          emptyStateDescription: "Pengiriman akan muncul setelah menu mingguan dikunci.",
        });
      } catch (err: any) {
        setError(err.message || "Gagal memuat data tracking pengiriman.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f8f7] text-neutral-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <p className="text-sm font-bold text-neutral-600">Memuat data tracking...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f8f7] text-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-red-100 p-6 text-center shadow-lg">
          <h3 className="mt-4 text-sm font-bold text-neutral-800">Terjadi Kesalahan</h3>
          <p className="mt-2 text-xs text-neutral-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 w-full inline-flex h-10 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white hover:bg-teal-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  return <DeliveryScreen delivery={delivery} />;
}
