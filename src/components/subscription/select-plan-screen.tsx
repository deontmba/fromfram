"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  ensureMySubscription,
  type ApiPlanType,
} from "@/components/subscription/subscription-service";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import { CheckoutLayout, primaryButtonClass, secondaryButtonClass } from "@/components/subscription/checkout-layout";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MealPlan = {
  id: "basic" | "fitness" | "diet";
  name: string;
  desc: string;
  iconSrc: string;
  iconAlt: string;
};

type DurationPlan = {
  id: "weekly" | "monthly" | "yearly";
  name: string;
  basePrice: number;
  unit: string;
  popular?: boolean;
  benefits: string[];
};

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const mealPlans: MealPlan[] = [
  {
    id: "basic",
    name: "Basic",
    desc: "Gizi seimbang harian",
    iconSrc: "/icons/basic.svg",
    iconAlt: "Basic plan",
  },
  {
    id: "fitness",
    name: "Fitness",
    desc: "Tinggi protein",
    iconSrc: "/icons/fitness.svg",
    iconAlt: "Fitness plan",
  },
  {
    id: "diet",
    name: "Diet",
    desc: "Rendah kalori",
    iconSrc: "/icons/diet.svg",
    iconAlt: "Diet plan",
  },
];

const durationPlans: DurationPlan[] = [
  {
    id: "weekly",
    name: "Mingguan",
    basePrice: 350000,
    unit: "/minggu",
    benefits: ["7 hari meal kit", "Gratis ongkir", "Bisa skip minggu depan"],
  },
  {
    id: "monthly",
    name: "Bulanan",
    basePrice: 1200000,
    unit: "/bulan",
    popular: true,
    benefits: ["28 hari meal kit", "Gratis ongkir", "Layanan prioritas", "Lebih hemat dari mingguan"],
  },
  {
    id: "yearly",
    name: "Tahunan",
    basePrice: 12000000,
    unit: "/tahun",
    benefits: ["365 hari meal kit", "Gratis ongkir", "Layanan prioritas", "Hemat terbesar", "1 minggu gratis"],
  },
];

/** Harga = base + (porsi - 1) * 65% * base */
function calculatePrice(basePrice: number, servings: number): number {
  return basePrice + (servings - 1) * 0.65 * basePrice;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getSavingsLabel(plan: DurationPlan, servings: number): string {
  const price = calculatePrice(plan.basePrice, servings);
  if (plan.id === "weekly") {
    return "Fleksibel, bisa cancel kapan saja";
  }
  if (plan.id === "monthly") {
    const weeklyMonthEquiv = calculatePrice(350000, servings) * 4;
    const savePct = Math.round(((weeklyMonthEquiv - price) / weeklyMonthEquiv) * 100);
    return savePct > 0 ? `Hemat ${savePct}% dibanding paket mingguan` : "Hemat dibanding paket mingguan";
  }
  if (plan.id === "yearly") {
    const weeklyYearEquiv = calculatePrice(350000, servings) * 52;
    const savePct = Math.round(((weeklyYearEquiv - price) / weeklyYearEquiv) * 100);
    return savePct > 0 ? `Hemat ${savePct}% dibanding paket mingguan` : "Hemat dibanding paket mingguan";
  }
  return "";
}

function mapGoalsToMealCategory(goals: string[]): MealPlan["id"] {
  const g = goals[0]?.toLowerCase() ?? "";
  if (g.includes("loss") || g.includes("diet") || g.includes("kalori") || g.includes("berat")) {
    return "diet";
  }
  if (g.includes("gain") || g.includes("fitness") || g.includes("otot") || g.includes("protein") || g.includes("atlet")) {
    return "fitness";
  }
  return "basic";
}

function mapDietaryToMealCategory(dietary: string[]): MealPlan["id"] {
  const d = dietary[0]?.toLowerCase() ?? "";
  if (d.includes("diet") || d.includes("kalori") || d.includes("berat")) {
    return "diet";
  }
  if (d.includes("fitness") || d.includes("protein") || d.includes("atlet")) {
    return "fitness";
  }
  return "basic";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SelectPlanScreen() {
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<MealPlan["id"]>("basic");
  const [selectedDuration, setSelectedDuration] = useState<DurationPlan["id"]>("monthly");
  const [selectedServing, setSelectedServing] = useState<number>(2);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [personalizedLabel, setPersonalizedLabel] = useState<string | null>(null);

  /* ---------- fetch personalization on mount ---------- */
  useEffect(() => {
    let cancelled = false;

    async function loadPersonalization() {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) return;

        const json = (await res.json().catch(() => null)) as Record<string, any> | null;
        const user = json?.user ?? json?.data;
        if (!user || cancelled) return;

        const goals: string[] = user.personalization?.goals ?? [];
        const dietary: string[] = user.personalization?.dietaryPrefs ?? [];

        if (goals.length > 0) {
          const mapped = mapGoalsToMealCategory(goals);
          if (!cancelled) {
            setSelectedMeal(mapped);
            setPersonalizedLabel(
              `Berdasarkan tujuan "${goals[0]}", kami sarankan menu ini`,
            );
          }
        } else if (dietary.length > 0) {
          const mapped = mapDietaryToMealCategory(dietary);
          if (mapped && !cancelled) {
            setSelectedMeal(mapped);
            setPersonalizedLabel(
              `Berdasarkan preferensi diet Anda, kami sarankan menu ini`,
            );
          }
        }
      } catch {
        // silently fall back to default
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    }

    void loadPersonalization();
    return () => { cancelled = true; };
  }, []);

  const selectedDurationLabel = useMemo(
    () => durationPlans.find((item) => item.id === selectedDuration)?.name,
    [selectedDuration],
  );

  const selectedPlan = useMemo(
    () => durationPlans.find((item) => item.id === selectedDuration),
    [selectedDuration],
  );

  const currentPrice = useMemo(
    () => (selectedPlan ? calculatePrice(selectedPlan.basePrice, selectedServing) : 0),
    [selectedPlan, selectedServing],
  );

  function mapDurationToPlanType(duration: DurationPlan["id"]): ApiPlanType {
    if (duration === "weekly") return "MINGGUAN";
    if (duration === "yearly") return "TAHUNAN";
    return "BULANAN";
  }

  const handleContinue = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const draft = {
        mealCategory: selectedMeal,
        duration: selectedDuration,
        servings: selectedServing,
        price: currentPrice,
        savedAt: new Date().toISOString(),
      };
      sessionStorage.setItem("fromfram_subscription_draft", JSON.stringify(draft));

      await ensureMySubscription({
        mealCategory: selectedMeal,
        planType: mapDurationToPlanType(selectedDuration),
        servings: selectedServing,
      });

      router.push("/subscription/delivery-address");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyambungkan plan ke subscription. Coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMealName = mealPlans.find((item) => item.id === selectedMeal)?.name;
  const optionClass = (active: boolean) =>
    `rounded-2xl border bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13b987]/40 ${
      active ? "border-[#13b987] ring-1 ring-[#13b987] bg-[#f6fcf9]" : "border-neutral-200 hover:border-neutral-300"
    }`;

  return (
    <CheckoutLayout
      step="Paket"
      width="lg"
      title="Pilih paket langgananmu"
      subtitle="Atur jenis menu, jumlah porsi, dan durasi. Bisa berhenti kapan saja."
    >
      <div className="space-y-10 pb-28">
        <section aria-labelledby="meal-plan-title">
          <h2 id="meal-plan-title" className="text-base font-semibold text-neutral-900">
            Jenis menu
          </h2>
          {!isLoadingProfile && personalizedLabel ? (
            <p className="mt-1 text-sm text-[#07845e]">{personalizedLabel}</p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-labelledby="meal-plan-title">
            {mealPlans.map((plan) => {
              const active = plan.id === selectedMeal;
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedMeal(plan.id)}
                  className={`${optionClass(active)} flex items-center gap-4 p-4`}
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? "bg-[#13b987]" : "bg-neutral-100"}`}>
                    <Image
                      src={plan.iconSrc}
                      alt=""
                      width={22}
                      height={22}
                      className={active ? "brightness-0 invert" : "opacity-60 brightness-0"}
                    />
                  </span>
                  <span>
                    <span className="block font-semibold text-neutral-900">{plan.name}</span>
                    <span className="block text-sm text-neutral-500">{plan.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="serving-title">
          <h2 id="serving-title" className="text-base font-semibold text-neutral-900">
            Jumlah porsi per waktu makan
          </h2>
          <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-labelledby="serving-title">
            {[1, 2, 3, 4, 5, 6].map((serving) => {
              const active = serving === selectedServing;
              return (
                <button
                  key={serving}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedServing(serving)}
                  className={`h-11 min-w-[4.5rem] rounded-xl border px-4 text-[0.95rem] font-semibold transition ${
                    active
                      ? "border-[#13b987] bg-[#13b987] text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  {serving} orang
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="duration-title">
          <h2 id="duration-title" className="text-base font-semibold text-neutral-900">
            Durasi
          </h2>
          <p className="mt-1 text-sm text-neutral-500">Harga untuk {selectedServing} orang.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3" role="radiogroup" aria-labelledby="duration-title">
            {durationPlans.map((plan) => {
              const active = plan.id === selectedDuration;
              const price = calculatePrice(plan.basePrice, selectedServing);
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedDuration(plan.id)}
                  className={`${optionClass(active)} flex flex-col p-5`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-neutral-900">{plan.name}</span>
                    {plan.popular ? (
                      <span className="rounded-full bg-[#13b987] px-2.5 py-0.5 text-xs font-semibold text-white">Terpopuler</span>
                    ) : null}
                  </span>
                  <span className="mt-3 text-2xl font-bold tracking-tight text-neutral-900">{formatRupiah(price)}</span>
                  <span className="text-sm text-neutral-500">{plan.unit}</span>
                  <span className="mt-3 text-sm font-medium text-[#07845e]">{getSavingsLabel(plan, selectedServing)}</span>
                  <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2">
                        <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-[#13b987]" strokeWidth={2.5} />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </section>

        {errorMessage ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </div>

      {/* Sticky summary bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-neutral-500">
              {selectedMealName} · {selectedDurationLabel} · {selectedServing} orang
            </p>
            <p className="text-lg font-bold text-neutral-900">{formatRupiah(currentPrice)}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/dashboard" className={`${secondaryButtonClass} hidden sm:inline-flex`}>
              Batal
            </Link>
            <button type="button" onClick={handleContinue} disabled={isSubmitting} className={primaryButtonClass}>
              {isSubmitting ? "Menyimpan..." : "Lanjut"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Lanjut dengan paket ini?"
        message={`${selectedMealName}, ${selectedServing} orang, ${selectedDurationLabel}. Total ${formatRupiah(currentPrice)}. Berikutnya kamu mengisi alamat pengiriman.`}
        confirmLabel="Ya, lanjut"
        cancelLabel="Ubah"
        isConfirming={isSubmitting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
      />
    </CheckoutLayout>
  );
}
