"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";

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
  qrImageDataUrl: string | null;
  snapToken: string | null;
  redirectUrl: string | null;
};

type PaymentScreenProps = {
  midtransClientKey?: string | null;
  isMidtransProduction?: boolean;
};

declare global {
  interface Window {
    snap?: {
      embed: (token: string, options: { embedId: string; onSuccess?: () => void; onPending?: () => void; onError?: () => void; onClose?: () => void }) => void;
    };
  }
}

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
  const rootRecord = toRecord(payload);
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
    qrImageDataUrl: pickString(rootRecord?.qrImageDataUrl, record.qrImageDataUrl),
    snapToken: pickString(rootRecord?.snapToken, record.snapToken, record.qrisCode),
    redirectUrl: pickString(rootRecord?.redirectUrl, record.redirectUrl),
  };
}

function getSummaryFromDraft() {
  if (typeof window === "undefined") {
    return {} as Partial<PaymentSummary>;
  }

  try {
    const rawDraft = sessionStorage.getItem("fromfram_subscription_draft");
    if (!rawDraft) {
      return {} as Partial<PaymentSummary>;
    }

    const parsedDraft = JSON.parse(rawDraft) as {
      duration?: PlanKey;
      servings?: number;
    };

    const duration = parsedDraft.duration;
    if (!duration || !(duration in PLAN_CONFIG)) {
      return {} as Partial<PaymentSummary>;
    }

    return {
      ...PLAN_CONFIG[duration],
      servingLabel:
        typeof parsedDraft.servings === "number" && Number.isFinite(parsedDraft.servings)
          ? `${parsedDraft.servings} orang`
          : undefined,
    };
  } catch {
    return {} as Partial<PaymentSummary>;
  }
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

async function lockCurrentWeeklyBox() {
  const response = await fetch('/api/weekly-boxes/current/lock', {
    method: 'PATCH',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'Gagal mengunci weekly box.'
    );
  }

  return payload;
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

function SnapPlaceholder({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[560px] w-full place-items-center rounded-2xl border border-dashed border-[#d7d7d7] bg-[#f8f8f8] px-6 py-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#e6faf3]" />
        <p className="text-[1rem] font-bold text-neutral-900">Midtrans Snap belum siap</p>
        <p className="mt-2 text-[0.9rem] leading-6 text-neutral-500">{message}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function PaymentScreen({ midtransClientKey, isMidtransProduction }: PaymentScreenProps) {
  const router = useRouter();
  const snapContainerRef = useRef<HTMLDivElement | null>(null);
  const embeddedSnapTokenRef = useRef<string | null>(null);
  const [summary, setSummary] = useState<PaymentSummary>(FALLBACK_SUMMARY);
  const [transaction, setTransaction] = useState<TransactionViewModel>({
    id: null,
    amount: null,
    status: null,
    qrisCode: null,
    qrImageDataUrl: null,
    snapToken: null,
    redirectUrl: null,
  });
  const [isPreparing, setIsPreparing] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Menyiapkan pembayaran Midtrans Snap...");
  const [autoPoll, setAutoPoll] = useState(true);
  const [isSnapScriptLoaded, setIsSnapScriptLoaded] = useState(false);
  const [snapScriptError, setSnapScriptError] = useState<string | null>(null);

  const resolvedMidtransClientKey = midtransClientKey ?? process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? null;
  const resolvedIsMidtransProduction = isMidtransProduction ?? process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
  const snapScriptSrc = resolvedIsMidtransProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  useEffect(() => {
    let isMounted = true;

    async function loadPaymentContext() {
      const nextSummary: PaymentSummary = {
        ...FALLBACK_SUMMARY,
        ...getSummaryFromDraft(),
      };

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
        // fallback summary
      }

      if (!isMounted) {
        return;
      }

      setSummary(nextSummary);

      try {
        const response = await fetch("/api/transactions/generate", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: nextSummary.total }),
        });

        const payload = await response.json().catch(() => null);
        const nextTransaction = response.ok ? mapTransaction(payload) : null;

        if (!isMounted) {
          return;
        }

        if (nextTransaction) {
          setTransaction(nextTransaction);
          const normalizedStatus = nextTransaction.status?.toUpperCase();
          if (normalizedStatus === "COMPLETED") {
            setStatusMessage("Pembayaran sudah selesai.");
            await lockCurrentWeeklyBox().catch((error) => {
              console.error("[lock weekly box after completed payment]", error);
            });
          } else if (normalizedStatus === "PENDING") {
            setStatusMessage("Checkout Midtrans siap digunakan. Pilih metode pembayaran di panel kanan.");
          } else {
            setStatusMessage("Checkout Midtrans siap digunakan. Pilih metode pembayaran di panel kanan.");
          }
        } else {
          const errorMessage =
            isRecord(payload) && typeof payload.error === "string"
              ? payload.error
              : "Gagal membuat transaksi pembayaran.";
          setStatusMessage(errorMessage);
        }
      } catch {
        if (isMounted) {
          setStatusMessage("Gagal menghubungkan ke layanan transaksi.");
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

  const handleCheckStatus = useCallback(async (silent = false) => {
    if (isPaying || !transaction.id) {
      return;
    }

    if (!silent) {
      setIsPaying(true);
      setStatusMessage("Mengecek status pembayaran...");
    }

    try {
      const response = await fetch(
        `/api/transactions/status/${encodeURIComponent(transaction.id)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        },
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (!silent) {
          const errorMessage =
            isRecord(payload) && typeof payload.error === "string"
              ? payload.error
              : "Gagal mengecek status pembayaran.";
          setStatusMessage(errorMessage);
        }
        return;
      }

      const latestTransaction = mapTransaction(payload);
      if (latestTransaction) {
        setTransaction((prev) => ({
          ...prev,
          ...latestTransaction,
          qrImageDataUrl: prev.qrImageDataUrl,
        }));
        if (latestTransaction.status?.toUpperCase() === "COMPLETED") {
          setAutoPoll(false);
          setStatusMessage("Pembayaran terverifikasi. Mengarahkan ke dashboard...");
          await lockCurrentWeeklyBox().catch((error) => {
            console.error("[lock weekly box after payment status check]", error);
          });
          router.push("/dashboard");
          return;
        }
      }

      if (!silent) setStatusMessage("Status transaksi masih PENDING. Selesaikan pembayaran lalu cek lagi.");
    } catch {
      if (!silent) setStatusMessage("Gagal mengecek status pembayaran.");
    } finally {
      if (!silent) setIsPaying(false);
    }
  }, [isPaying, router, transaction.id]);

  const canCheckStatus = !isPreparing && Boolean(transaction.id);

  useEffect(() => {
    if (!transaction.snapToken || !isSnapScriptLoaded || snapScriptError) {
      return;
    }

    if (embeddedSnapTokenRef.current === transaction.snapToken) {
      return;
    }

    if (!window.snap?.embed || !snapContainerRef.current) {
      setStatusMessage("Midtrans Snap belum siap dimuat.");
      return;
    }

    snapContainerRef.current.innerHTML = "";
    window.snap.embed(transaction.snapToken, {
      embedId: snapContainerRef.current.id,
      onSuccess: () => {
        setStatusMessage("Pembayaran berhasil diproses. Memeriksa status transaksi...");
        void handleCheckStatus(true);
      },
      onPending: () => {
        setStatusMessage("Pembayaran masih pending. Selesaikan proses di panel Midtrans.");
        void handleCheckStatus(true);
      },
      onError: () => {
        setStatusMessage("Checkout Midtrans mengalami kendala. Coba muat ulang atau gunakan tautan cadangan.");
      },
      onClose: () => {
        setStatusMessage("Checkout Midtrans ditutup. Kamu bisa lanjutkan pembayaran kapan saja.");
      },
    });
    embeddedSnapTokenRef.current = transaction.snapToken;
  }, [handleCheckStatus, isSnapScriptLoaded, snapScriptError, transaction.snapToken]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (canCheckStatus && transaction.status !== 'COMPLETED' && autoPoll) {
      intervalId = setInterval(() => {
        void handleCheckStatus(true);
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [canCheckStatus, transaction.status, autoPoll, handleCheckStatus]);

  return (
    <>
      {resolvedMidtransClientKey ? (
        <Script
          src={snapScriptSrc}
          data-client-key={resolvedMidtransClientKey}
          strategy="afterInteractive"
          onLoad={() => setIsSnapScriptLoaded(true)}
          onError={() => setSnapScriptError("Gagal memuat Snap.js dari Midtrans.")}
        />
      ) : null}
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
            Selesaikan checkout Midtrans di panel kanan lalu cek status pembayaran
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
              <span className="font-bold">Midtrans Snap</span>
            </div>

            <div className="rounded-2xl border border-[#dedede] bg-white p-5 text-center">
              <p className="text-[0.9rem] text-neutral-500">Checkout Midtrans dengan QRIS, bank transfer, dan metode aktif lainnya</p>
              <p className="mt-2 text-[1.45rem] font-extrabold text-[#12af80]">
                {formatCurrency(paymentAmount)}
              </p>

              <div className="mt-5">
                {transaction.snapToken ? (
                  <div className="mx-auto w-full overflow-hidden rounded-2xl border border-[#e1e1e1] bg-[#f8f8f8] p-2 text-left shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
                    <div
                      id="snap-container"
                      ref={snapContainerRef}
                      className="min-h-[560px] w-full"
                    />
                  </div>
                ) : (
                  <SnapPlaceholder
                    message={
                      snapScriptError ??
                      (resolvedMidtransClientKey
                        ? "Menunggu token Snap dari backend."
                        : "MIDTRANS_CLIENT_KEY belum diatur di server, jadi Snap belum dapat dimuat.")
                    }
                    action={
                      !resolvedMidtransClientKey && transaction.redirectUrl ? (
                        <a
                          href={transaction.redirectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-xl border border-[#12af80] px-4 py-2 text-sm font-semibold text-[#12af80] transition hover:bg-[#eefaf5]"
                        >
                          Buka halaman pembayaran Midtrans
                        </a>
                      ) : null
                    }
                  />
                )}
              </div>

              <p className="mt-4 text-[0.82rem] text-neutral-500">Token checkout berlaku selama 24 jam atau sesuai aturan Midtrans</p>
              {transaction.id ? (
                <p className="mt-1 px-2 text-[0.78rem] font-medium leading-snug text-neutral-400">
                  Nomor pesanan: {transaction.id}
                </p>
              ) : null}
              {transaction.status ? (
                <p className="mt-1 text-[0.78rem] font-semibold text-neutral-500">
                  Status: {transaction.status}
                </p>
              ) : null}
              {transaction.redirectUrl ? (
                <a
                  href={transaction.redirectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center justify-center rounded-xl border border-[#12af80] px-4 py-2 text-sm font-semibold text-[#12af80] transition hover:bg-[#eefaf5]"
                >
                  Buka halaman pembayaran Midtrans
                </a>
              ) : null}
            </div>

            <div className="mt-5 border-t border-[#d8d8d8] pt-5">
              <p className="text-[0.9rem] text-neutral-500">
                Setelah menyelesaikan pembayaran di Snap, klik tombol di bawah untuk cek status transaksi.
              </p>
              <p className="mt-2 min-h-5 text-[0.84rem] font-medium text-neutral-500">
                {isPreparing ? "Menghubungkan ke layanan transaksi..." : statusMessage}
              </p>

              <button
                type="button"
                disabled={!canCheckStatus || isPaying}
                onClick={() => handleCheckStatus(false)}
                className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#1db788] px-8 text-[1rem] font-semibold text-white shadow-[0_8px_18px_rgba(29,183,136,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#16a679] hover:shadow-[0_12px_22px_rgba(29,183,136,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPaying ? "Mengecek..." : "Cek Status Pembayaran"}
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
    </>
  );
}
