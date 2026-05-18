"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  ensureMySubscription,
  type ApiPlanType,
} from "@/components/subscription/subscription-service";

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
    benefits: ["28 hari meal kit", "Gratis ongkir", "Priority support", "Hemat vs mingguan"],
  },
  {
    id: "yearly",
    name: "Tahunan",
    basePrice: 12000000,
    unit: "/tahun",
    benefits: ["365 hari meal kit", "Gratis ongkir", "Priority support", "Hemat terbesar", "1 minggu gratis"],
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
    return savePct > 0 ? `Hemat ${savePct}% dari plan mingguan` : "Hemat dari plan mingguan";
  }
  if (plan.id === "yearly") {
    const weeklyYearEquiv = calculatePrice(350000, servings) * 52;
    const savePct = Math.round(((weeklyYearEquiv - price) / weeklyYearEquiv) * 100);
    return savePct > 0 ? `Hemat ${savePct}% dari plan mingguan` : "Hemat dari plan mingguan";
  }
  return "";
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SelectPlanScreen() {
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<MealPlan["id"]>("basic");
  const [selectedDuration, setSelectedDuration] = useState<DurationPlan["id"]>("monthly");
  const [selectedServing, setSelectedServing] = useState<number>(2);
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
              `Berdasarkan tujuan "${goals[0]}", kami merekomendasikan plan ini untuk Anda`,
            );
          }
        } else if (dietary.length > 0) {
          const mapped = mapDietaryToMealCategory(dietary);
          if (mapped && !cancelled) {
            setSelectedMeal(mapped);
            setPersonalizedLabel(
              `Berdasarkan preferensi diet Anda, kami merekomendasikan plan ini`,
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

  const handleContinue = async () => {
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

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:py-10">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#d4f8f5] via-[#f0f7f5] to-[#e8f9f7]" />
      <div className="absolute -top-40 -right-40 -z-10 h-96 w-96 rounded-full bg-gradient-to-br from-[#1db788]/40 to-[#0ea5a5]/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 -z-10 h-80 w-80 rounded-full bg-gradient-to-tr from-[#1db788]/25 to-transparent blur-3xl" />
      <div className="absolute top-1/2 right-1/4 -z-10 h-72 w-72 rounded-full bg-gradient-to-bl from-[#0ea5a5]/30 to-transparent blur-3xl" />
      <div className="absolute top-0 left-1/2 -z-10 h-96 w-96 rounded-full bg-gradient-to-br from-white/40 to-[#1db788]/5 blur-3xl" />

      <section className="mx-auto w-full max-w-[1020px] px-5 py-7 sm:px-8 sm:py-9">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 bg-gradient-to-r from-[#1db788] to-[#16a679] bg-clip-text text-transparent">
            <Image src="/icons/leaf-logo.svg" alt="FromFram logo" width={30} height={30} />
            <span className="text-[1.95rem] font-extrabold leading-none tracking-[-0.02em]">FromFram</span>
          </div>
          <h1 className="bg-gradient-to-r from-[#1db788] via-[#0ea5a5] to-[#1db788] bg-clip-text text-[2rem] font-bold leading-tight text-transparent sm:text-[2.35rem]">
            Atur Langganan Anda
          </h1>
          <p className="mt-3 text-[0.98rem] text-neutral-600 sm:text-[1rem]">
            Sesuaikan kategori meal plan, jumlah porsi, dan durasi berlangganan
          </p>
        </motion.header>

        <div className="space-y-12">
          {/* STEP 1: Meal Category */}
          <section aria-labelledby="meal-plan-title">
            <h2 id="meal-plan-title" className="mb-4 text-[1.35rem] font-semibold text-neutral-900">
              1. Pilih Kategori Meal Plan
            </h2>

            {/* Personalized recommendation banner */}
            {!isLoadingProfile && personalizedLabel ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mb-5 overflow-hidden rounded-2xl border border-[#1db788]/20 bg-gradient-to-r from-[#eafff5] to-[#d4f8f5] px-5 py-3.5"
              >
                <p className="flex items-center gap-2.5 text-[0.92rem] font-medium text-[#0f996f]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1db788] text-white">
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                  {personalizedLabel}
                </p>
              </motion.div>
            ) : null}

            <fieldset>
              <legend className="sr-only">Kategori meal plan</legend>
              <motion.div
                variants={cardContainerVariants}
                initial="hidden"
                animate="visible"
                className="grid gap-6 md:grid-cols-3"
              >
                {mealPlans.map((plan) => {
                  const active = plan.id === selectedMeal;
                  return (
                    <motion.button
                      key={plan.id}
                      variants={cardVariants}
                      whileHover={{ y: active ? 0 : -6, transition: { duration: 0.25 } }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => setSelectedMeal(plan.id)}
                      aria-pressed={active}
                      className={`group rounded-3xl border-2 px-7 py-6 text-center backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] outline outline-1 outline-white/40 ${
                        active
                          ? "border-[#1db788] bg-gradient-to-br from-[#1db788]/20 to-[#0ea5a5]/10 ring-2 ring-[#1db788] shadow-[0_15px_30px_rgba(29,183,136,0.25)]"
                          : "border-[#1db788]/30 bg-white/20 hover:border-[#1db788]/50 hover:bg-white/30 hover:shadow-[0_12px_25px_rgba(29,183,136,0.12)]"
                      }`}
                    >
                      <div
                        className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full backdrop-blur-sm transition-all ${
                          active
                            ? "bg-gradient-to-br from-[#1db788] to-[#0ea5a5] shadow-lg"
                            : "bg-white/30 group-hover:bg-white/50 group-hover:shadow-md"
                        }`}
                      >
                        <Image
                          src={plan.iconSrc}
                          alt={plan.iconAlt}
                          width={24}
                          height={24}
                          className={`${active ? "brightness-0 invert" : "brightness-0 saturate-0 opacity-60"}`}
                        />
                      </div>
                      <p className="text-[1.18rem] font-semibold leading-tight text-neutral-900">{plan.name}</p>
                      <p className="mt-1.5 text-[0.96rem] text-neutral-500">{plan.desc}</p>
                    </motion.button>
                  );
                })}
              </motion.div>
            </fieldset>
          </motion.section>

          {/* STEP 2: Porsi — dipindah sebelum durasi agar harga langsung reflect saat memilih plan */}
          <section aria-labelledby="serving-title">
            <h2 id="serving-title" className="mb-4 text-[1.35rem] font-semibold text-neutral-900">
              2. Pilih Jumlah Porsi
            </h2>
            <div className="grid gap-4 grid-cols-3 sm:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((serving) => {
                const active = serving === selectedServing;
                return (
                  <button
                    key={serving}
                    type="button"
                    onClick={() => setSelectedServing(serving)}
                    aria-pressed={active}
                    className={`rounded-3xl border-2 px-4 py-5 text-center backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] outline outline-1 outline-white/40 ${
                      active
                        ? "border-[#1db788] bg-gradient-to-br from-[#1db788]/20 to-[#0ea5a5]/10 ring-2 ring-[#1db788] shadow-[0_15px_30px_rgba(29,183,136,0.25)]"
                        : "border-[#1db788]/30 bg-white/20 hover:-translate-y-1 hover:border-[#1db788]/50 hover:bg-white/30 hover:shadow-[0_12px_25px_rgba(29,183,136,0.12)]"
                    }`}
                  >
                    <p className="text-[1.4rem] font-bold text-neutral-900">{serving}</p>
                    <p className="mt-0.5 text-[0.78rem] text-neutral-500">orang</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* STEP 3: Duration — harga sudah reflect porsi terpilih */}
          <section aria-labelledby="duration-title">
            <h2 id="duration-title" className="mb-1 text-[1.35rem] font-semibold text-neutral-900">
              3. Pilih Durasi Langganan
            </h2>
            <p className="mb-4 text-[0.9rem] text-neutral-500">
              Harga dihitung untuk{" "}
              <span className="font-semibold text-[#1db788]">{selectedServing} orang</span>
            </p>
            <fieldset>
              <legend className="sr-only">Durasi langganan</legend>
              <motion.div
                variants={cardContainerVariants}
                initial="hidden"
                animate="visible"
                className="grid gap-6 lg:grid-cols-3"
              >
                {durationPlans.map((plan) => {
                  const active = plan.id === selectedDuration;
                  const price = calculatePrice(plan.basePrice, selectedServing);
                  const savingsLabel = getSavingsLabel(plan, selectedServing);
                  return (
                    <motion.button
                      key={plan.id}
                      variants={cardVariants}
                      whileHover={{ y: active ? 0 : -6, transition: { duration: 0.25 } }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => setSelectedDuration(plan.id)}
                      aria-pressed={active}
                      className={`relative rounded-3xl border-2 px-6 pb-7 pt-6 text-left backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] outline outline-1 outline-white/40 ${
                        active
                          ? "border-[#1db788] bg-gradient-to-br from-[#1db788]/20 to-[#0ea5a5]/10 ring-2 ring-[#1db788] shadow-[0_18px_35px_rgba(29,183,136,0.28)]"
                          : "border-[#1db788]/30 bg-white/20 hover:border-[#1db788]/50 hover:bg-white/30 hover:shadow-[0_15px_30px_rgba(29,183,136,0.15)]"
                      }`}
                    >
                      {plan.popular ? (
                        <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#f35f61] to-[#e84c4c] px-4 py-1.5 text-[0.72rem] font-bold text-white shadow-lg backdrop-blur-sm">
                          ⭐ Terpopuler
                        </span>
                      ) : null}
                      <article>
                        <h3 className="text-center text-[1.1rem] font-semibold text-neutral-900">{plan.name}</h3>
                        <p className="mt-2 text-center">
                          <span className="block bg-gradient-to-r from-[#1db788] to-[#0ea5a5] bg-clip-text text-[1.75rem] font-bold leading-none text-transparent">
                            {formatRupiah(price)}
                          </span>
                          <span className="mt-1 block text-[0.9rem] font-medium text-neutral-500">{plan.unit}</span>
                        </p>
                        <p className="mt-3 text-center text-[0.9rem] text-neutral-500">{savingsLabel}</p>
                      </article>

                      <ul className="mt-4 space-y-2.5 text-[0.96rem] text-neutral-700">
                        {plan.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-center gap-2">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[#1db788]/30 to-[#0ea5a5]/20 text-[#1db788] backdrop-blur-sm">
                              <CheckIcon />
                            </span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </motion.div>
            </fieldset>
          </motion.section>
        </div>

        <footer className="mt-12 flex items-center justify-between gap-6">
          <Link
            href="/subscription"
            className="rounded-2xl border-2 border-[#1db788]/30 bg-white/20 px-7 py-3 text-[1rem] font-semibold text-neutral-700 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] outline outline-1 outline-white/40"
          >
            ← Kembali
          </Link>

          <p className="flex-1 text-center text-sm text-neutral-600">
            {mealPlans.find((item) => item.id === selectedMeal)?.name} · {selectedDurationLabel} · {selectedServing} orang ·{" "}
            <span className="font-semibold text-[#1db788]">{formatRupiah(currentPrice)}</span>
          </p>

          <button
            type="button"
            onClick={() => {
              void handleContinue();
            }}
            disabled={isSubmitting}
            className="rounded-2xl border-2 border-[#1db788] bg-gradient-to-r from-[#1db788] to-[#16a679] px-9 py-3 text-[1rem] font-semibold text-white shadow-[0_12px_25px_rgba(29,183,136,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(29,183,136,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] disabled:cursor-not-allowed disabled:opacity-60 outline outline-1 outline-white/50"
          >
            {isSubmitting ? "Menyambungkan..." : "Lanjutkan →"}
          </button>
        </motion.footer>

        {errorMessage ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center text-sm font-medium text-red-600"
          >
            {errorMessage}
          </motion.p>
        ) : null}
      </motion.section>
    </main>
  );
}
