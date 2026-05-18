"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Receipt, Wallet } from "lucide-react";

type PaymentTransaction = {
  id: string;
  createdAt?: string | Date;
  amount?: number;
  status?: string;
  qrisCode?: string;
  paidAt?: string | Date;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
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

  return (
    <main className="min-h-screen bg-[#eceded] px-4 py-10 sm:px-6 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]"
      />

      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto w-full max-w-[880px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-5 py-6 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8 sm:py-8"
      >
        <motion.div variants={itemVariants} className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Payment History</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Riwayat pembayaran langganan Anda
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-2xl border border-neutral-300 bg-white px-5 text-[1rem] font-semibold text-neutral-700 transition hover:bg-neutral-50 cursor-pointer"
          >
            Kembali
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-neutral-500">Memuat data pembayaran...</div>
          ) : (
            <>
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-[18px] border border-black/5 bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.03)] transition hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eafff5] text-[#13b987]">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-[1.1rem] font-bold text-neutral-900">Pembayaran Langganan</h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                        <span className="font-medium text-neutral-700">INV-{payment.id?.slice(0, 6).toUpperCase() ?? "UNKNOWN"}</span>
                        <span>•</span>
                        <span>{formatDate(payment.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-neutral-500 flex items-center gap-1.5">
                        <Wallet className="h-4 w-4" />
                        QRIS
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-0 flex w-full sm:w-auto items-center justify-between sm:flex-col sm:items-end gap-2">
                    <p className="text-[1.15rem] font-bold text-neutral-900">{formatRupiah(payment.amount)}</p>
                    <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                      payment.status === "COMPLETED" 
                        ? "bg-[#eafff5] text-[#13b987]" 
                        : payment.status === "FAILED"
                        ? "bg-[#fff1f2] text-[#e11d48]"
                        : "bg-[#fffbeb] text-[#d97706]"
                    }`}>
                      {payment.status === "COMPLETED" ? "PAID" : payment.status}
                    </div>
                  </div>
                </div>
              ))}

              {payments.length === 0 && (
                <div className="py-12 text-center text-neutral-500">
                  Belum ada riwayat pembayaran.
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.section>
    </main>
  );
}
