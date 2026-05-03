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
    unit: "/minggu",
    savings: "Fleksibel, bisa cancel kapan saja",
    benefits: ["7 hari meal kit", "Gratis ongkir", "Bisa skip minggu depan"],
  },
  {
    id: "monthly",
    name: "Bulanan",
    price: "Rp 1.200.000",
    unit: "/bulan",
    savings: "Hemat 14% dari plan mingguan",
    popular: true,
    benefits: ["28 hari meal kit", "Gratis ongkir", "Priority support", "Discount 14%"],
  },
  {
    id: "yearly",
    name: "Tahunan",
    price: "Rp 12.000.000",
    unit: "/tahun",
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
    <main className="min-h-screen bg-[#ececec] px-5 py-8 sm:py-10">
      <section className="mx-auto w-full max-w-[1020px] rounded-[28px] border border-[#e4e4e4] bg-[#f4f4f4] px-5 py-7 shadow-[0_14px_36px_rgba(0,0,0,0.08)] sm:px-8 sm:py-9">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 text-[#10b981]">
            <Image src="/icons/leaf-logo.svg" alt="FromFram logo" width={30} height={30} />
            <span className="text-[1.95rem] font-extrabold leading-none tracking-[-0.02em]">FromFram</span>
          </div>
          <h1 className="text-[2rem] font-bold leading-tight text-neutral-900 sm:text-[2.35rem]">
            Atur Langganan Anda
          </h1>
          <p className="mt-2 text-[0.98rem] text-neutral-500 sm:text-[1rem]">
            Sesuaikan kategori meal plan dan durasi berlangganan
          </p>
        </header>

        <div className="space-y-9">
          <section aria-labelledby="meal-plan-title">
            <h2 id="meal-plan-title" className="mb-4 text-[1.35rem] font-semibold text-neutral-900">
              Pilih Kategori Meal Plan
            </h2>
            <fieldset>
              <legend className="sr-only">Kategori meal plan</legend>
              <div className="grid gap-3 md:grid-cols-3">
                {mealPlans.map((plan) => {
                  const active = plan.id === selectedMeal;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedMeal(plan.id)}
                      aria-pressed={active}
                      className={`group rounded-2xl border bg-[#f8f8f8] px-6 py-5 text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] ${
                        active
                          ? "border-[#1db788] ring-1 ring-[#1db788] shadow-[0_10px_20px_rgba(29,183,136,0.16)]"
                          : "border-[#d7d7d7] hover:-translate-y-0.5 hover:border-[#9ed8c4] hover:shadow-[0_8px_18px_rgba(0,0,0,0.09)]"
                      }`}
                    >
                      <div
                        className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full transition-colors ${
                          active
                            ? "bg-[#1db788]"
                            : "bg-[#ececec] group-hover:bg-[#e6f5ef]"
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
              <div className="grid gap-4 lg:grid-cols-3">
                {durationPlans.map((plan) => {
                  const active = plan.id === selectedDuration;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedDuration(plan.id)}
                      aria-pressed={active}
                      className={`relative rounded-2xl border bg-[#f8f8f8] px-5 pb-6 pt-5 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] ${
                        active
                          ? "border-[#1db788] ring-1 ring-[#1db788] shadow-[0_12px_22px_rgba(29,183,136,0.18)]"
                          : "border-[#d7d7d7] hover:-translate-y-0.5 hover:border-[#9ed8c4] hover:shadow-[0_9px_20px_rgba(0,0,0,0.09)]"
                      }`}
                    >
                      {plan.popular ? (
                        <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f35f61] px-4 py-1 text-[0.72rem] font-bold text-white shadow-sm">
                          Terpopuler
                        </span>
                      ) : null}
                      <article>
                        <h3 className="text-center text-[1.1rem] font-semibold text-neutral-900">{plan.name}</h3>
                        <p className="mt-2 text-center text-[1.05rem] font-bold leading-tight text-[#14a67e]">
                          <span className="block text-[1.75rem] leading-none">{plan.price}</span>
                          <span className="mt-1 block text-[0.96rem] font-medium text-neutral-500">{plan.unit}</span>
                        </p>
                        <p className="mt-3 text-center text-[0.95rem] text-neutral-500">{plan.savings}</p>
                      </article>

                      <ul className="mt-4 space-y-2.5 text-[0.96rem] text-neutral-700">
                        {plan.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-center gap-2">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#d9f2e8] text-[#14a67e]">
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((serving) => {
              const active = serving === selectedServing;

              return (
                <button
                  key={serving}
                  type="button"
                  onClick={() => setSelectedServing(serving)}
                  aria-pressed={active}
                  className={`rounded-2xl border px-5 py-4 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] ${
                    active
                      ? "border-[#1db788] bg-[#eaf8f1] ring-1 ring-[#1db788] shadow-[0_10px_20px_rgba(29,183,136,0.16)]"
                      : "border-[#d7d7d7] bg-[#f8f8f8] hover:-translate-y-0.5 hover:border-[#9ed8c4] hover:shadow-[0_8px_18px_rgba(0,0,0,0.09)]"
                  }`}
                >
                  <p className="text-[1.1rem] font-semibold text-neutral-900">{serving} orang</p>
                  <p className="mt-1 text-sm text-neutral-500">Jumlah porsi subscription</p>
                </button>
              );
            })}
          </div>
        </section>

        <footer className="mt-9 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Pilihan aktif: {mealPlans.find((item) => item.id === selectedMeal)?.name} · {selectedDurationLabel} · {selectedServing} orang
          </p>

          <Link
            href="/subscription"
            className="rounded-2xl border border-[#cfcfcf] bg-[#f8f8f8] px-6 py-2.5 text-[1rem] font-semibold text-neutral-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8]"
          >
            Kembali
          </Link>

          <button
            type="button"
            onClick={() => {
              void handleContinue();
            }}
            disabled={isSubmitting}
            className="rounded-2xl bg-[#1db788] px-8 py-2.5 text-[1rem] font-semibold text-white shadow-[0_8px_18px_rgba(29,183,136,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#16a679] hover:shadow-[0_12px_22px_rgba(29,183,136,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Menyambungkan..." : "Lanjutkan"}
          </button>
        </footer>

        {errorMessage ? (
          <p className="mt-4 text-center text-sm font-medium text-red-600">{errorMessage}</p>
        ) : null}
      </section>
    </main>
  );
}
