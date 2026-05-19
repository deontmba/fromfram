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

        const INFO_BULLETS = [
          "Pengiriman dilakukan setiap hari pukul 06:00 - 12:00",
          "Meal kit sudah dikemas dalam cooler box untuk menjaga kesegaran",
          "Jika tidak ada di rumah, kurir akan menghubungi via telepon",
          "Status akan update otomatis real-time",
        ];

        // Format timeline helper
        const buildTimeline = (status: string, shippedAt: string | null, deliveredAt: string | null) => {
          const formatTime = (timeStr: string | null) => {
            if (!timeStr) return null;
            const date = new Date(timeStr);
            return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(date);
          };

          return [
            {
              id: "prepared",
              label: "Pesanan Disiapkan",
              timeLabel: "06:00",
              state: status === "PREPARING" ? "current" : "completed",
            },
            {
              id: "courier",
              label: "Pesanan Dibawa Kurir",
              timeLabel:
                formatTime(shippedAt) ??
                (status === "SHIPPED" ? "Sedang berlangsung" : "Estimasi 08:00"),
              state:
                status === "PREPARING" ? "upcoming" : status === "SHIPPED" ? "current" : "completed",
            },
            {
              id: "received",
              label: "Pesanan Diterima",
              timeLabel: formatTime(deliveredAt) ?? "Estimasi 10:00–12:00",
              state: status === "DELIVERED" ? "completed" : "upcoming",
            },
          ];
        };

        const mapDeliveryToItem = (d: any) => {
          if (!d) return null;
          const dayDate = new Date(d.deliveryDate);
          
          let statusTone = "scheduled";
          if (d.status === "SHIPPED") statusTone = "active";
          if (d.status === "DELIVERED") statusTone = "completed";

          return {
            id: d.id,
            dayLabel: d.dayLabel || new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(dayDate),
            dateLabel: d.dateLabel || new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(dayDate),
            menuName: d.menuName || "Menu belum tersedia",
            addressLabel: d.addressLabel || (d.address ? `Menuju: ${d.address.label || ""} - ${d.address.street || ""}, ${d.address.city || ""}` : "Alamat tidak tersedia"),
            status: d.status,
            statusLabel:
              d.status === "PREPARING"
                ? "Disiapkan"
                : d.status === "SHIPPED"
                  ? "Dalam Perjalanan"
                  : "Selesai",
            statusTone,
            etaTitle: d.status === "PREPARING" ? "Pesanan sedang disiapkan di warehouse" : d.status === "SHIPPED" ? "Kurir sedang menuju lokasi" : "Pesanan telah diterima",
            etaWindow: d.status === "PREPARING" ? "Estimasi dikirim pukul 06:00–08:00" : d.status === "SHIPPED" ? "Estimasi tiba 10:00–12:00" : "Pengiriman selesai",
            timeline: buildTimeline(d.status, d.shippedAt, d.deliveredAt),
          };
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            ⚠️
          </div>
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
