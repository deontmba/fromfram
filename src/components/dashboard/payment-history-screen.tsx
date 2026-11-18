"use client";

import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { CustomerPage } from "@/components/ui/customer-page";

type PaymentTransaction = {
  id: string;
  createdAt?: string | Date;
  amount?: number;
  status?: string;
  qrisCode?: string;
  paidAt?: string | Date;
};

export function PaymentHistoryScreen() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      try {
        const res = await fetch("/api/user/transactions");
        if (res.ok) {
          const data = await res.json();
          setPayments(data.transactions || []);
        }
      } catch (err) {
        console.error("Failed to load transactions", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  const formatDate = (dateValue?: string | Date) => {
    if (!dateValue) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(dateValue));
  };

  const formatRupiah = (amount?: number) => {
    if (amount === undefined || amount === null) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statusTag: Record<string, [string, string]> = {
    COMPLETED: ["Lunas", "bg-[#effaf5] text-[#07845e]"],
    PENDING: ["Menunggu", "bg-amber-50 text-amber-700"],
    FAILED: ["Gagal", "bg-red-50 text-red-700"],
  };

  return (
    <CustomerPage title="Riwayat pembayaran" subtitle="Semua pembayaran langgananmu.">
      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white" />
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center text-neutral-500">
          Belum ada pembayaran.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {payments.map((payment) => {
            const [label, tone] = statusTag[payment.status ?? ""] ?? [payment.status ?? "-", "bg-neutral-100 text-neutral-600"];
            return (
              <li key={payment.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#effaf5] text-[#13b987]">
                    <Receipt aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900">Pembayaran langganan</p>
                    <p className="truncate text-sm text-neutral-500">
                      INV-{payment.id ? payment.id.split("-").pop()?.toUpperCase() : "-"} · {formatDate(payment.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-neutral-900">{formatRupiah(payment.amount)}</p>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CustomerPage>
  );
}
