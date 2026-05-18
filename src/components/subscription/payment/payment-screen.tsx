"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Deklarasi global untuk Snap.js
declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

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
    ...PLAN_CONFIG[planKey],
    ...(servings ? { servingLabel: `${servings} orang` } : {}),
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PaymentScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<PaymentSummary>(FALLBACK_SUMMARY);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Menyiapkan pembayaran...");
  const snapScriptLoaded = useRef(false);

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

        if (res.ok && isRecord(payload) && typeof payload.snapToken === "string") {
          setSnapToken(payload.snapToken);
          const txId = pickString(
            toRecord(payload.transaction)?.id,
            payload.transactionId,
          );
          setTransactionId(txId);
          setStatusMessage("Klik tombol di bawah untuk membuka halaman pembayaran.");
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
        setStatusMessage("Pembayaran berhasil! Mengarahkan ke dashboard...");
        await lockCurrentWeeklyBox().catch(console.error);
        router.push("/dashboard");
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
  }, [snapToken, isOpening, router]);

  const summaryRows = useMemo(
    () => [
      { label: "Plan", value: summary.planLabel },
      { label: "Serving Size", value: summary.servingLabel },
      { label: "Durasi", value: summary.durationLabel },
      { label: "Alamat", value: summary.addressLabel },
    ],
    [summary],
  );

  const canPay = !isPreparing && Boolean(snapToken);

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
            Pilih metode pembayaran favoritmu
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          {/* Ringkasan Pesanan */}
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

          {/* Panel Pembayaran */}
          <section className="rounded-2xl border border-[#e0e0e0] bg-[#f8f8f8] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.08)] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <PaymentIcon />
              <h2 className="text-[1.15rem] font-bold text-neutral-900">Metode Pembayaran</h2>
            </div>

            {/* Info metode yang tersedia */}
            <div className="mb-5 rounded-2xl border border-[#dedede] bg-white p-5">
              <p className="mb-3 text-[0.88rem] text-neutral-500">Tersedia via Midtrans:</p>
              <div className="flex flex-wrap gap-2">
                {["Transfer Bank", "QRIS", "GoPay", "OVO", "Kartu Kredit", "Indomaret", "Alfamart"].map(
                  (method) => (
                    <span
                      key={method}
                      className="rounded-lg border border-[#d4f0e5] bg-[#f0faf6] px-3 py-1 text-[0.82rem] font-medium text-[#12a880]"
                    >
                      {method}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Total & tombol bayar */}
            <div className="rounded-2xl border border-[#dedede] bg-white p-5 text-center">
              <p className="text-[0.9rem] text-neutral-500">Total pembayaran</p>
              <p className="mt-2 text-[1.8rem] font-extrabold text-[#12af80]">
                {formatCurrency(summary.total)}
              </p>

              {transactionId && (
                <p className="mt-2 text-[0.78rem] text-neutral-400">
                  ID Transaksi: {transactionId}
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-[#d8d8d8] pt-5">
              <p className="min-h-5 text-[0.84rem] font-medium text-neutral-500">
                {isPreparing ? "Menyiapkan sesi pembayaran..." : statusMessage}
              </p>

              <button
                type="button"
                disabled={!canPay || isOpening}
                onClick={handleOpenSnap}
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1db788] px-8 text-[1rem] font-semibold text-white shadow-[0_8px_18px_rgba(29,183,136,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#16a679] hover:shadow-[0_12px_22px_rgba(29,183,136,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PaymentIcon />
                {isPreparing ? "Menyiapkan..." : isOpening ? "Membuka..." : "Bayar Sekarang"}
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