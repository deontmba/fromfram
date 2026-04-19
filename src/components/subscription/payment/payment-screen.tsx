"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type PlanKey = "weekly" | "monthly" | "yearly";

type PaymentSummary = {
  planLabel: string;
  servingLabel: string;
  durationLabel: string;
  addressLabel: string;
  subtotal: number;
  discount: number;
  total: number;
};

type TransactionViewModel = {
  id: string | null;
  amount: number | null;
  status: string | null;
  qrisCode: string | null;
};

const FALLBACK_SUMMARY: PaymentSummary = {
  planLabel: "Bulanan",
  servingLabel: "2 orang",
  durationLabel: "4 minggu (28 hari)",
  addressLabel: "Rumah",
  subtotal: 1200000,
  discount: 168000,
  total: 1200000,
};

const PLAN_CONFIG: Record<PlanKey, Omit<PaymentSummary, "servingLabel" | "addressLabel">> = {
  weekly: {
    planLabel: "Mingguan",
    durationLabel: "1 minggu (7 hari)",
    subtotal: 350000,
    discount: 0,
    total: 350000,
  },
  monthly: {
    planLabel: "Bulanan",
    durationLabel: "4 minggu (28 hari)",
    subtotal: 1200000,
    discount: 168000,
    total: 1200000,
  },
  yearly: {
    planLabel: "Tahunan",
    durationLabel: "52 minggu (365 hari)",
    subtotal: 12000000,
    discount: 0,
    total: 12000000,
  },
};

const benefits = [
  "Gratis ongkir",
  "28 meal kit (menu sudah dipilih)",
  "Priority customer support",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmedValue = value.trim();

      if (trimmedValue) {
        return trimmedValue;
      }
    }
  }

  return null;
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsedValue = Number.parseFloat(value.replace(/[^\d.-]/g, ""));

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return null;
}

function formatCurrency(amount: number) {
  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

function normalizePlanKey(value: unknown): PlanKey | null {
  const normalizedValue = pickString(value)?.toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  if (["mingguan", "weekly", "week"].includes(normalizedValue)) {
    return "weekly";
  }

  if (["bulanan", "monthly", "month"].includes(normalizedValue)) {
    return "monthly";
  }

  if (["tahunan", "yearly", "annual", "year"].includes(normalizedValue)) {
    return "yearly";
  }

  return null;
}

function unwrapSubscriptionRecord(payload: unknown) {
  const rootRecord = toRecord(payload);

  if (!rootRecord) {
    return null;
  }

  const subscriptionRecord = toRecord(rootRecord.subscription);
  if (subscriptionRecord) {
    return subscriptionRecord;
  }

  const dataRecord = toRecord(rootRecord.data);
  if (dataRecord) {
    return toRecord(dataRecord.subscription) ?? dataRecord;
  }

  return rootRecord;
}

function mapSubscriptionToSummary(payload: unknown): Partial<PaymentSummary> {
  const record = unwrapSubscriptionRecord(payload);

  if (!record) {
    return {};
  }

  const planKey =
    normalizePlanKey(
      pickString(
        record.planType,
        record.planName,
        record.plan,
        toRecord(record.plan)?.type,
        toRecord(record.plan)?.name,
      ),
    ) ?? "monthly";
  const planConfig = PLAN_CONFIG[planKey];
  const servings = pickNumber(record.servings, record.servingSize, record.servingCount);
  const summaryPatch: Partial<PaymentSummary> = { ...planConfig };

  if (servings) {
    summaryPatch.servingLabel = `${servings} orang`;
  }

  return summaryPatch;
}

function unwrapTransactionRecord(payload: unknown) {
  const rootRecord = toRecord(payload);

  if (!rootRecord) {
    return null;
  }

  return toRecord(rootRecord.transaction) ?? toRecord(rootRecord.data) ?? rootRecord;
}

function mapTransaction(payload: unknown): TransactionViewModel | null {
  const record = unwrapTransactionRecord(payload);

  if (!record) {
    return null;
  }

  return {
    id: pickString(record.id, record.transactionId),
    amount: pickNumber(record.amount, record.total, record.totalAmount),
    status: pickString(record.status),
    qrisCode: pickString(
      record.qrisCode,
      record.qris,
      record.paymentCode,
      toRecord(record.payment)?.qrisCode,
    ),
  };
}

function getAddressCandidates(payload: unknown) {
  const rootRecord = toRecord(payload);

  if (!rootRecord) {
    return [];
  }

  const candidates = [rootRecord.address, rootRecord.addresses, rootRecord.data];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (isRecord(candidate)) {
      return [candidate];
    }
  }

  return [];
}

function getDefaultAddressLabel(payload: unknown) {
  const addresses = getAddressCandidates(payload)
    .map((address) => toRecord(address))
    .filter((address): address is Record<string, unknown> => Boolean(address));
  const defaultAddress =
    addresses.find((address) => address.isDefault === true) ?? addresses[0];

  return pickString(defaultAddress?.label);
}

function QrisIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm11 1h2v2h-2v-2Zm4 0h1v5h-5v-1h4v-4Zm-7-3h2v2h-2v-2Zm0 5h2v3h-2v-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QrisPlaceholder() {
  return (
    <div className="grid h-full min-h-[230px] place-items-center rounded-2xl border border-[#e1e1e1] bg-[#f8f8f8] px-6 py-8">
      <svg viewBox="0 0 180 180" aria-label="Kode QRIS demo" className="h-40 w-40 text-[#16b784]">
        <rect x="12" y="12" width="156" height="156" rx="8" fill="white" stroke="currentColor" strokeWidth="4" />
        <rect x="36" y="36" width="34" height="34" rx="4" fill="currentColor" />
        <rect x="110" y="36" width="34" height="34" rx="4" fill="currentColor" />
        <rect x="36" y="110" width="34" height="34" rx="4" fill="currentColor" />
        <rect x="46" y="46" width="14" height="14" rx="2" fill="white" />
        <rect x="120" y="46" width="14" height="14" rx="2" fill="white" />
        <rect x="46" y="120" width="14" height="14" rx="2" fill="white" />
        <rect x="84" y="40" width="10" height="10" rx="5" fill="currentColor" />
        <rect x="84" y="68" width="10" height="10" rx="5" fill="currentColor" />
        <rect x="84" y="96" width="10" height="10" rx="5" fill="currentColor" />
        <rect x="106" y="88" width="38" height="10" rx="5" fill="currentColor" />
        <rect x="106" y="108" width="10" height="38" rx="5" fill="currentColor" />
        <rect x="132" y="132" width="12" height="12" rx="6" fill="currentColor" />
        <rect x="70" y="84" width="10" height="10" rx="5" fill="currentColor" />
        <rect x="40" y="84" width="10" height="10" rx="5" fill="currentColor" />
        <rect x="58" y="92" width="18" height="8" rx="4" fill="currentColor" />
      </svg>
    </div>
  );
}

export function PaymentScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<PaymentSummary>(FALLBACK_SUMMARY);
  const [transaction, setTransaction] = useState<TransactionViewModel>({
    id: null,
    amount: null,
    status: null,
    qrisCode: null,
  });
  const [isPreparing, setIsPreparing] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Menyiapkan pembayaran QRIS...");

  useEffect(() => {
    let isMounted = true;

    async function loadPaymentContext() {
      const nextSummary: PaymentSummary = { ...FALLBACK_SUMMARY };

      try {
        const [subscriptionResult, addressResult] = await Promise.allSettled([
          fetch("/api/subscriptions/me", { cache: "no-store" }),
          fetch("/api/profile/address", { cache: "no-store" }),
        ]);

        if (subscriptionResult.status === "fulfilled" && subscriptionResult.value.ok) {
          const subscriptionPayload = await subscriptionResult.value.json().catch(() => null);
          Object.assign(nextSummary, mapSubscriptionToSummary(subscriptionPayload));
        }

        if (addressResult.status === "fulfilled" && addressResult.value.ok) {
          const addressPayload = await addressResult.value.json().catch(() => null);
          nextSummary.addressLabel = getDefaultAddressLabel(addressPayload) ?? nextSummary.addressLabel;
        }
      } catch {
        // Fallback ringkasan tetap cukup untuk demo pembayaran.
      }

      if (!isMounted) {
        return;
      }

      setSummary(nextSummary);

      try {
        const response = await fetch("/api/transactions", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: nextSummary.total,
            paymentMethod: "QRIS",
          }),
        });

        const payload = await response.json().catch(() => null);
        const nextTransaction = response.ok ? mapTransaction(payload) : null;

        if (!isMounted) {
          return;
        }

        if (nextTransaction) {
          setTransaction(nextTransaction);
          setStatusMessage("Kode pembayaran siap digunakan.");
        } else {
          setStatusMessage("Mode demo aktif. Pembayaran tetap bisa dilanjutkan.");
        }
      } catch {
        if (isMounted) {
          setStatusMessage("Mode demo aktif. Pembayaran tetap bisa dilanjutkan.");
        }
      } finally {
        if (isMounted) {
          setIsPreparing(false);
        }
      }
    }

    void loadPaymentContext();

    return () => {
      isMounted = false;
    };
  }, []);

  const paymentAmount = transaction.amount ?? summary.total;
  const summaryRows = useMemo(
    () => [
      { label: "Plan", value: summary.planLabel },
      { label: "Serving Size", value: summary.servingLabel },
      { label: "Durasi", value: summary.durationLabel },
      { label: "Alamat", value: summary.addressLabel },
    ],
    [summary],
  );

  const handlePayment = useCallback(async () => {
    if (isPaying) {
      return;
    }

    setIsPaying(true);
    setStatusMessage("Memproses pembayaran...");

    try {
      if (transaction.id) {
        await fetch(`/api/transactions/${encodeURIComponent(transaction.id)}/pay`, {
          method: "PATCH",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      // Flow demo tetap lanjut ke dashboard meskipun API pembayaran belum tersedia.
    }

    router.push("/dashboard");
  }, [isPaying, router, transaction.id]);

  return (
    <main className="min-h-screen bg-[#ececec] px-4 py-8 sm:px-5 sm:py-10">
      <section className="mx-auto w-full max-w-[980px]">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 text-[#10b981]">
            <Image src="/icons/leaf-logo.svg" alt="FromFram logo" width={30} height={30} />
            <span className="text-[1.95rem] font-extrabold leading-none tracking-[-0.02em]">FromFram</span>
          </div>
          <h1 className="text-[2rem] font-bold leading-tight text-neutral-900 sm:text-[2.35rem]">
            Pembayaran
          </h1>
          <p className="mt-2 text-[0.98rem] text-neutral-500 sm:text-[1rem]">
            Scan QRIS atau simulasi pembayaran
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-[#e0e0e0] bg-[#f8f8f8] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.08)] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#1db788]" />
              <h2 className="text-[1.15rem] font-bold text-neutral-900">Ringkasan Pesanan</h2>
            </div>

            <div className="space-y-3 border-b border-[#d8d8d8] pb-5 text-[0.96rem]">
              {summaryRows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <span className="text-neutral-500">{row.label}</span>
                  <span className="max-w-[60%] text-right font-semibold text-neutral-900">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 py-5 text-[0.96rem]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Subtotal</span>
                <span className="font-semibold text-neutral-900">{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">Diskon</span>
                <span className="font-semibold text-[#0ca978]">
                  {summary.discount > 0 ? `- ${formatCurrency(summary.discount)}` : formatCurrency(0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-[1.08rem] font-bold text-neutral-900">Total</span>
                <span className="text-[1.15rem] font-extrabold text-[#12af80]">
                  {formatCurrency(summary.total)}
                </span>
              </div>
            </div>

            <ul className="space-y-3 rounded-2xl border border-[#bfe9dc] bg-[#eefaf5] px-4 py-4 text-[0.95rem] text-neutral-800">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center text-[#12af80]">
                    <CheckIcon />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#e0e0e0] bg-[#f8f8f8] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.08)] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <QrisIcon className="h-5 w-5 text-[#1db788]" />
              <h2 className="text-[1.15rem] font-bold text-neutral-900">Metode Pembayaran</h2>
            </div>

            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#12a880] px-4 py-3 text-white shadow-[0_8px_18px_rgba(18,168,128,0.22)]">
              <QrisIcon />
              <span className="font-bold">QRIS</span>
            </div>

            <div className="rounded-2xl border border-[#dedede] bg-white p-5 text-center">
              <p className="text-[0.9rem] text-neutral-500">Scan kode QR untuk membayar</p>
              <p className="mt-2 text-[1.45rem] font-extrabold text-[#12af80]">
                {formatCurrency(paymentAmount)}
              </p>

              <div className="mt-5">
                <QrisPlaceholder />
              </div>

              <p className="mt-4 text-[0.82rem] text-neutral-500">Kode berlaku selama 24 jam</p>
              {transaction.qrisCode ? (
                <p className="mt-1 text-[0.78rem] font-medium text-neutral-400">
                  Kode demo: {transaction.qrisCode}
                </p>
              ) : null}
            </div>

            <div className="mt-5 border-t border-[#d8d8d8] pt-5">
              <p className="text-[0.9rem] text-neutral-500">
                Untuk demo: klik tombol di bawah untuk simulasi pembayaran.
              </p>
              <p className="mt-2 min-h-5 text-[0.84rem] font-medium text-neutral-500">
                {isPreparing ? "Menghubungkan ke layanan transaksi..." : statusMessage}
              </p>

              <button
                type="button"
                disabled={isPaying}
                onClick={handlePayment}
                className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#1db788] px-8 text-[1rem] font-semibold text-white shadow-[0_8px_18px_rgba(29,183,136,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#16a679] hover:shadow-[0_12px_22px_rgba(29,183,136,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPaying ? "Memproses..." : "Bayar"}
              </button>
            </div>
          </section>
        </div>

        <div className="mt-7 text-center">
          <Link
            href="/subscription/weekly-menu"
            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold text-neutral-500 transition hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8]"
          >
            Kembali ke pemilihan menu
          </Link>
        </div>
      </section>
    </main>
  );
}
