"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ensureMySubscription,
  type ApiPlanType,
} from "@/components/subscription/subscription-service";

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
  price: string;
  unit: string;
  savings: string;
  popular?: boolean;
  benefits: string[];
};

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
    price: "Rp 350.000",
    unit: "",
    savings: "Fleksibel, bisa cancel kapan saja",
    benefits: ["7 hari meal kit", "Gratis ongkir", "Bisa skip minggu depan"],
  },
  {
    id: "monthly",
    name: "Bulanan",
    price: "Rp 1.200.000",
    unit: "",
    savings: "Hemat 14% dari plan mingguan",
    popular: true,
    benefits: ["28 hari meal kit", "Gratis ongkir", "Priority support", "Discount 14%"],
  },
  {
    id: "yearly",
    name: "Tahunan",
    price: "Rp 12.000.000",
    unit: "",
    savings: "Hemat 29% dari plan mingguan",
    benefits: ["365 hari meal kit", "Gratis ongkir", "Priority support", "Discount 29%", "1 minggu gratis"],
  },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SelectPlanScreen() {
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<MealPlan["id"]>("basic");
  const [selectedDuration, setSelectedDuration] = useState<DurationPlan["id"]>("monthly");
  const [selectedServing, setSelectedServing] = useState<number>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedDurationLabel = useMemo(
    () => durationPlans.find((item) => item.id === selectedDuration)?.name,
    [selectedDuration],
  );

  function mapDurationToPlanType(duration: DurationPlan["id"]): ApiPlanType {
    if (duration === "weekly") {
      return "MINGGUAN";
    }

    if (duration === "yearly") {
      return "TAHUNAN";
    }

    return "BULANAN";
  }

  const handleContinue = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const draft = {
        mealCategory: selectedMeal,
        duration: selectedDuration,
        servings: selectedServing,
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
            Sesuaikan kategori meal plan dan durasi berlangganan
          </p>
        </header>

        <div className="space-y-12">
          <section aria-labelledby="meal-plan-title">
            <h2 id="meal-plan-title" className="mb-4 text-[1.35rem] font-semibold text-neutral-900">
              Pilih Kategori Meal Plan
            </h2>
            <fieldset>
              <legend className="sr-only">Kategori meal plan</legend>
              <div className="grid gap-6 md:grid-cols-3">
                {mealPlans.map((plan) => {
                  const active = plan.id === selectedMeal;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedMeal(plan.id)}
                      aria-pressed={active}
                      className={`group rounded-3xl border-2 px-7 py-6 text-center backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] outline outline-1 outline-white/40 ${
                        active
                          ? "border-[#1db788] bg-gradient-to-br from-[#1db788]/20 to-[#0ea5a5]/10 ring-2 ring-[#1db788] shadow-[0_15px_30px_rgba(29,183,136,0.25)]"
                          : "border-[#1db788]/30 bg-white/20 hover:-translate-y-1 hover:border-[#1db788]/50 hover:bg-white/30 hover:shadow-[0_12px_25px_rgba(29,183,136,0.12)]"
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
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </section>

          <section aria-labelledby="duration-title">
            <h2 id="duration-title" className="mb-4 text-[1.35rem] font-semibold text-neutral-900">
              Pilih Durasi Langganan
            </h2>
            <fieldset>
              <legend className="sr-only">Durasi langganan</legend>
              <div className="grid gap-6 lg:grid-cols-3">
                {durationPlans.map((plan) => {
                  const active = plan.id === selectedDuration;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedDuration(plan.id)}
                      aria-pressed={active}
                      className={`relative rounded-3xl border-2 px-6 pb-7 pt-6 text-left backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] outline outline-1 outline-white/40 ${
                        active
                          ? "border-[#1db788] bg-gradient-to-br from-[#1db788]/20 to-[#0ea5a5]/10 ring-2 ring-[#1db788] shadow-[0_18px_35px_rgba(29,183,136,0.28)]"
                          : "border-[#1db788]/30 bg-white/20 hover:-translate-y-1 hover:border-[#1db788]/50 hover:bg-white/30 hover:shadow-[0_15px_30px_rgba(29,183,136,0.15)]"
                      }`}
                    >
                      {plan.popular ? (
                        <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#f35f61] to-[#e84c4c] px-4 py-1.5 text-[0.72rem] font-bold text-white shadow-lg backdrop-blur-sm">
                          ⭐ Terpopuler
                        </span>
                      ) : null}
                      <article>
                        <h3 className="text-center text-[1.1rem] font-semibold text-neutral-900">{plan.name}</h3>
                        <p className="mt-2 text-center text-[1.05rem] font-bold leading-tight">
                          <span className="block bg-gradient-to-r from-[#1db788] to-[#0ea5a5] bg-clip-text text-[1.75rem] leading-none text-transparent">{plan.price}</span>
                          <span className="mt-1 block text-[0.96rem] font-medium text-neutral-600">{plan.unit}</span>
                        </p>
                        <p className="mt-3 text-center text-[0.95rem] text-neutral-500">{plan.savings}</p>
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
              </div>
            </fieldset>
          </section>
        </div>

        <section aria-labelledby="serving-title" className="mt-9">
          <h2 id="serving-title" className="mb-4 text-[1.35rem] font-semibold text-neutral-900">
            Pilih Porsi
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((serving) => {
              const active = serving === selectedServing;

              return (
                <button
                  key={serving}
                  type="button"
                  onClick={() => setSelectedServing(serving)}
                  aria-pressed={active}
                  className={`rounded-3xl border-2 px-6 py-5 text-left backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] outline outline-1 outline-white/40 ${
                    active
                      ? "border-[#1db788] bg-gradient-to-br from-[#1db788]/20 to-[#0ea5a5]/10 ring-2 ring-[#1db788] shadow-[0_15px_30px_rgba(29,183,136,0.25)]"
                      : "border-[#1db788]/30 bg-white/20 hover:-translate-y-1 hover:border-[#1db788]/50 hover:bg-white/30 hover:shadow-[0_12px_25px_rgba(29,183,136,0.12)]"
                  }`}
                >
                  <p className="text-[1.1rem] font-semibold text-neutral-900">{serving} orang</p>
                  <p className="mt-1 text-sm text-neutral-500">Jumlah porsi subscription</p>
                </button>
              );
            })}
          </div>
        </section>

        <footer className="mt-12 flex items-center justify-between gap-6">
          <Link
            href="/subscription"
            className="rounded-2xl border-2 border-[#1db788]/30 bg-white/20 px-7 py-3 text-[1rem] font-semibold text-neutral-700 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] outline outline-1 outline-white/40"
          >
            ← Kembali
          </Link>

          <p className="flex-1 text-center text-sm text-neutral-600">
            {mealPlans.find((item) => item.id === selectedMeal)?.name} · {selectedDurationLabel} · {selectedServing} orang
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
        </footer>

        {errorMessage ? (
          <p className="mt-4 text-center text-sm font-medium text-red-600">{errorMessage}</p>
        ) : null}
      </section>
    </main>
  );
}
