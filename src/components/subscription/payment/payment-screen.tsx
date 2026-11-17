"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import { Check, CreditCard } from "lucide-react";
import {
  CheckoutLayout,
  cardClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/subscription/checkout-layout";

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
      pay: (token: string, options: { onSuccess?: () => void; onPending?: () => void; onError?: () => void; onClose?: () => void }) => void;
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
  "Layanan prioritas",
];

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function formatCurrency(amount: number) {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amount)}`;
}

function normalizePlanKey(value: unknown): PlanKey | null {
  const v = pickString(value)?.toLowerCase();
  if (!v) return null;
  if (["mingguan", "weekly", "week"].includes(v)) return "weekly";
  if (["bulanan", "monthly", "month"].includes(v)) return "monthly";
  if (["tahunan", "yearly", "annual", "year"].includes(v)) return "yearly";
  return null;
}

function getSummaryFromDraft(): Partial<PaymentSummary> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem("fromfram_subscription_draft");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { duration?: PlanKey; servings?: number };
    if (!parsed.duration || !(parsed.duration in PLAN_CONFIG)) return {};
    return {
      ...PLAN_CONFIG[parsed.duration],
      servingLabel:
        typeof parsed.servings === "number" ? `${parsed.servings} orang` : undefined,
    };
  } catch {
    return {};
  }
}

function mapSubscriptionToSummary(payload: unknown): Partial<PaymentSummary> {
  const root = toRecord(payload);
  if (!root) return {};
  const rec =
    toRecord(root.subscription) ??
    toRecord(toRecord(root.data)?.subscription) ??
    toRecord(root.data) ??
    root;
  const planKey =
    normalizePlanKey(
      pickString(rec.planType, rec.planName, rec.plan),
    ) ?? "monthly";
  const servings = pickNumber(rec.servings, rec.servingSize);
  return {
    planLabel: PLAN_CONFIG[planKey].planLabel,
    durationLabel: PLAN_CONFIG[planKey].durationLabel,
    subtotal: PLAN_CONFIG[planKey].subtotal,
    discount: PLAN_CONFIG[planKey].discount,
    total: PLAN_CONFIG[planKey].total,
    servingLabel: servings ? `${servings} orang` : undefined,
  };
}

function mapTransaction(payload: unknown): TransactionViewModel | null {
  const root = toRecord(payload);
  if (!root) return null;
  const record =
    toRecord(root.transaction) ??
    toRecord(toRecord(root.data)?.transaction) ??
    toRecord(root.data) ??
    root;
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
    qrImageDataUrl: pickString(root?.qrImageDataUrl, record.qrImageDataUrl),
    snapToken: pickString(root?.snapToken, record.snapToken, record.qrisCode),
    redirectUrl: pickString(root?.redirectUrl, record.redirectUrl),
  };
}

function getDefaultAddressLabel(payload: unknown): string | null {
  const root = toRecord(payload);
  if (!root) return null;
  const candidates = [root.address, root.addresses, root.data];
  let list: unknown[] = [];
  for (const c of candidates) {
    if (Array.isArray(c)) { list = c; break; }
    if (isRecord(c)) { list = [c]; break; }
  }
  const addresses = list.map(toRecord).filter(Boolean) as Record<string, unknown>[];
  const def = addresses.find((a) => a.isDefault === true) ?? addresses[0];
  return pickString(def?.label);
}

async function lockCurrentWeeklyBox() {
  const res = await fetch("/api/weekly-boxes/current/lock", {
    method: "PATCH",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "Gagal mengunci weekly box.",
    );
  }
  return payload;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SnapPlaceholder({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-8 text-center">
      <div className="max-w-sm">
        <p className="font-semibold text-neutral-900">Pembayaran belum siap</p>
        <p className="mt-2 text-sm leading-6 text-neutral-500">{message}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function PaymentScreen({ midtransClientKey, isMidtransProduction }: PaymentScreenProps) {
  const router = useRouter();
  const snapContainerRef = useRef<HTMLDivElement | null>(null);
  const embeddedSnapTokenRef = useRef<string | null>(null);
  const snapScriptLoaded = useRef(false);
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
  const [isOpening, setIsOpening] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Menyiapkan pembayaran...");
  const [autoPoll, setAutoPoll] = useState(true);
  const [isSnapScriptLoaded, setIsSnapScriptLoaded] = useState(false);
  const [snapScriptError, setSnapScriptError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const snapToken = transaction.snapToken;
  const canPay = !isPreparing && Boolean(transaction.snapToken);
  const paymentAmount = transaction.amount ?? summary.total;

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const resolvedMidtransClientKey = midtransClientKey ?? process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? null;
  const resolvedIsMidtransProduction = isMidtransProduction ?? process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
  const snapScriptSrc = resolvedIsMidtransProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  // Load Snap.js script
  useEffect(() => {
    if (snapScriptLoaded.current) return;
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
    const scriptSrc = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    document.body.appendChild(script);
    snapScriptLoaded.current = true;
  }, []);

  // Load summary + generate token
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const nextSummary: PaymentSummary = { ...FALLBACK_SUMMARY, ...getSummaryFromDraft() };

      try {
        const [subRes, addrRes] = await Promise.allSettled([
          fetch("/api/subscriptions/me", { cache: "no-store" }),
          fetch("/api/profile/address", { cache: "no-store" }),
        ]);

        if (subRes.status === "fulfilled" && subRes.value.ok) {
          const data = await subRes.value.json().catch(() => null);
          Object.assign(nextSummary, mapSubscriptionToSummary(data));
        }

        if (addrRes.status === "fulfilled" && addrRes.value.ok) {
          const data = await addrRes.value.json().catch(() => null);
          nextSummary.addressLabel = getDefaultAddressLabel(data) ?? nextSummary.addressLabel;
        }
      } catch { /* pakai fallback */ }

      if (!isMounted) return;
      setSummary(nextSummary);

      try {
        const res = await fetch("/api/transactions/generate", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: nextSummary.total }),
        });

        const payload = await res.json().catch(() => null);

        if (!isMounted) return;

        const nextTransaction = mapTransaction(payload);
        if (nextTransaction) {
          setTransaction(nextTransaction);
          const normalizedStatus = nextTransaction.status?.toUpperCase();
          if (normalizedStatus === "COMPLETED") {
            setStatusMessage("Pembayaran sudah selesai.");
            await lockCurrentWeeklyBox().catch((error) => {
              console.error("[lock weekly box after completed payment]", error);
            });
          } else if (normalizedStatus === "PENDING") {
            setStatusMessage("Pilih metode pembayaran untuk menyelesaikan pesanan.");
          } else {
            setStatusMessage("Pilih metode pembayaran untuk menyelesaikan pesanan.");
          }
        } else {
          const errMsg =
            isRecord(payload) && typeof payload.error === "string"
              ? payload.error
              : "Gagal membuat transaksi pembayaran.";
          setStatusMessage(errMsg);
        }
      } catch {
        if (isMounted) setStatusMessage("Gagal menghubungkan ke layanan transaksi.");
      } finally {
        if (isMounted) setIsPreparing(false);
      }
    }

    void init();
    return () => { isMounted = false; };
  }, []);

  const handleOpenSnap = useCallback(async () => {
    if (!snapToken || isOpening) return;

    if (!window.snap) {
      setStatusMessage("Snap.js belum siap, coba lagi sebentar.");
      return;
    }

    setIsOpening(true);
    setStatusMessage("Membuka halaman pembayaran...");

    window.snap.pay(snapToken, {
      onSuccess: async () => {
        setStatusMessage("Pembayaran berhasil!");
        await lockCurrentWeeklyBox().catch(console.error);
        setShowSuccessModal(true);
      },
      onPending: () => {
        setStatusMessage("Pembayaran sedang diproses. Kami akan konfirmasi segera.");
        setIsOpening(false);
      },
      onError: () => {
        setStatusMessage("Pembayaran gagal. Silakan coba lagi.");
        setIsOpening(false);
      },
      onClose: () => {
        setStatusMessage("Popup ditutup. Klik tombol untuk membuka kembali.");
        setIsOpening(false);
      },
    });
  }, [snapToken, isOpening, router, setShowSuccessModal]);

  const summaryRows = useMemo(
    () => [
      { label: "Paket", value: summary.planLabel },
      { label: "Porsi", value: summary.servingLabel },
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
          setStatusMessage("Pembayaran terverifikasi.");
          await lockCurrentWeeklyBox().catch((error) => {
            console.error("[lock weekly box after payment status check]", error);
          });
          setShowSuccessModal(true);
          return;
        }
      }

      if (!silent) setStatusMessage("Status transaksi masih PENDING. Selesaikan pembayaran lalu cek lagi.");
    } catch {
      if (!silent) setStatusMessage("Gagal mengecek status pembayaran.");
    } finally {
      if (!silent) setIsPaying(false);
    }
  }, [isPaying, router, transaction.id, setShowSuccessModal]);

  const canCheckStatus = !isPreparing && Boolean(transaction.id);

  useEffect(() => {
    if (!transaction.snapToken || !isSnapScriptLoaded || snapScriptError) {
      return;
    }

    if (embeddedSnapTokenRef.current === transaction.snapToken) {
      return;
    }

    if (!window.snap?.embed || !snapContainerRef.current) {
      setStatusMessage("Pembayaran belum siap dimuat.");
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
        setStatusMessage("Pembayaran mengalami kendala. Muat ulang halaman atau buka di tab baru.");
      },
      onClose: () => {
        setStatusMessage("Pembayaran ditutup. Kamu bisa melanjutkannya kapan saja.");
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

  if (!isMounted) {
    return (
      <CheckoutLayout step="Bayar" width="lg" title="Pembayaran">
        <div className="h-96 animate-pulse rounded-2xl bg-neutral-200/70" />
      </CheckoutLayout>
    );
  }

  const statusLabels: Record<string, string> = { PENDING: "Menunggu pembayaran", COMPLETED: "Lunas", FAILED: "Gagal" };

  return (
    <>
      {resolvedMidtransClientKey ? (
        <Script
          src={snapScriptSrc}
          data-client-key={resolvedMidtransClientKey}
          strategy="afterInteractive"
          onLoad={() => setIsSnapScriptLoaded(true)}
          onError={() => setSnapScriptError("Gagal memuat halaman pembayaran.")}
        />
      ) : null}

      <CheckoutLayout
        step="Bayar"
        width="lg"
        title="Pembayaran"
        subtitle="Pilih metode pembayaran di bawah. Langganan aktif begitu pembayaran berhasil."
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Payment */}
          <section className={cardClass}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-neutral-900">Metode pembayaran</h2>
              <span className="text-sm text-neutral-500">QRIS, e-wallet, transfer bank</span>
            </div>

            <div className="mt-4">
              {transaction.snapToken ? (
                <div className="overflow-hidden rounded-xl border border-neutral-200">
                  <div id="snap-container" ref={snapContainerRef} className="min-h-[560px] w-full" />
                </div>
              ) : (
                <SnapPlaceholder
                  message={
                    snapScriptError ??
                    (resolvedMidtransClientKey
                      ? "Menyiapkan pembayaran..."
                      : "Pembayaran belum bisa dimuat. Hubungi kami jika ini terus terjadi.")
                  }
                  action={
                    !resolvedMidtransClientKey && transaction.redirectUrl ? (
                      <a href={transaction.redirectUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                        Buka halaman pembayaran
                      </a>
                    ) : null
                  }
                />
              )}
            </div>

            <p className="mt-4 text-sm text-neutral-500" aria-live="polite">
              {isPreparing ? "Menyiapkan pembayaran..." : statusMessage}
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={!canPay || isOpening}
                onClick={handleOpenSnap}
                className={`${primaryButtonClass} sm:flex-1`}
              >
                <CreditCard aria-hidden="true" className="h-4 w-4" />
                {isPreparing ? "Menyiapkan..." : isOpening ? "Membuka..." : "Bayar sekarang"}
              </button>
              {transaction.redirectUrl ? (
                <a href={transaction.redirectUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                  Buka di tab baru
                </a>
              ) : null}
            </div>
          </section>

          {/* Order summary */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <section className={cardClass}>
              <h2 className="text-base font-semibold text-neutral-900">Ringkasan pesanan</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{row.label}</dt>
                    <dd className="text-right font-medium text-neutral-900">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <dl className="mt-4 space-y-2.5 border-t border-neutral-100 pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Subtotal</dt>
                  <dd className="font-medium text-neutral-900">{formatCurrency(summary.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Diskon</dt>
                  <dd className="font-medium text-[#07845e]">
                    {summary.discount > 0 ? `- ${formatCurrency(summary.discount)}` : formatCurrency(0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-neutral-100 pt-3">
                  <dt className="font-semibold text-neutral-900">Total</dt>
                  <dd className="text-lg font-bold text-neutral-900">{formatCurrency(summary.total)}</dd>
                </div>
              </dl>

              <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-[#13b987]" strokeWidth={2.5} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </section>

            {transaction.id ? (
              <p className="px-1 text-xs leading-5 text-neutral-400">
                No. pesanan {transaction.id}
                {transaction.status ? ` · ${statusLabels[transaction.status] ?? transaction.status}` : ""}
                <br />
                Halaman pembayaran berlaku 24 jam.
              </p>
            ) : null}

            <Link href="/subscription/weekly-menu" className="block px-1 text-sm text-neutral-500 hover:text-neutral-800">
              Kembali ke pilihan menu
            </Link>
          </aside>
        </div>
      </CheckoutLayout>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-neutral-900/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Pembayaran berhasil" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#effaf5] text-[#13b987]">
              <Check aria-hidden="true" className="h-7 w-7" strokeWidth={3} />
            </div>
            <h3 className="mt-4 text-xl font-bold text-neutral-900">Pembayaran berhasil</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Langgananmu sudah aktif. Lihat jadwal pengiriman dan menu di dashboard.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard?payment_success=true")}
              className={`${primaryButtonClass} mt-6 w-full`}
            >
              Ke dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
