"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMySubscription } from "@/components/subscription/subscription-service";

type MealPlanId = "basic" | "fitness" | "diet";
type DurationPlanId = "weekly" | "monthly" | "yearly";

const mealPlans = [
  {
    id: "basic" as const,
    name: "Basic",
    description: "Gizi seimbang harian",
    iconSrc: "/icons/basic.svg",
    iconAlt: "Basic plan",
  },
  {
    id: "fitness" as const,
    name: "Fitness",
    description: "Tinggi protein",
    iconSrc: "/icons/fitness.svg",
    iconAlt: "Fitness plan",
  },
  {
    id: "diet" as const,
    name: "Diet",
    description: "Rendah kalori",
    iconSrc: "/icons/diet.svg",
    iconAlt: "Diet plan",
  },
];

const durationPlans = [
  {
    id: "weekly" as const,
    name: "Mingguan",
    price: "Rp 350.000",
    unit: "/minggu",
    helperText: "Fleksibel, bisa cancel kapan saja",
  },
  {
    id: "monthly" as const,
    name: "Bulanan",
    price: "Rp 1.200.000",
    unit: "/bulan",
    helperText: "Hemat 14% dari plan mingguan",
    badge: "Terpopuler",
  },
  {
    id: "yearly" as const,
    name: "Tahunan",
    price: "Rp 12.000.000",
    unit: "/tahun",
    helperText: "Hemat 29% dari plan mingguan",
    badge: "Hemat",
  },
];

export function SelectPlanScreen() {
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<MealPlanId>("basic");
  const [selectedDuration, setSelectedDuration] = useState<DurationPlanId>("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedMealPlan =
    mealPlans.find((plan) => plan.id === selectedMeal) ?? mealPlans[0];
  const selectedDurationPlan =
    durationPlans.find((plan) => plan.id === selectedDuration) ?? durationPlans[1];

  async function handleContinue() {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await createMySubscription({
        mealCategory: selectedMeal,
        planType:
          selectedDuration === "weekly"
            ? "MINGGUAN"
            : selectedDuration === "monthly"
              ? "BULANAN"
              : "TAHUNAN",
        servings: selectedMeal === "fitness" ? 3 : selectedMeal === "diet" ? 1 : 2,
      });

      router.push("/subscription");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal membuat subscription. Coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]"
      />

      <section className="relative mx-auto w-full max-w-[940px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-5 py-6 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-2xl border border-neutral-300 bg-white px-4 text-[1rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Kembali
          </Link>

          <div className="flex items-center gap-2 text-[#13a981]">
            <Image src="/icons/leaf-logo.svg" alt="FromFram logo" width={26} height={26} />
            <span className="text-[1.5rem] font-bold tracking-[-0.03em]">FromFram</span>
          </div>
        </div>

        <div className="mt-6 rounded-[18px] border border-black/5 bg-white px-6 py-6 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold text-[#11af82]">Subscription</p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-[-0.02em] text-neutral-900">
            Select plan
          </h1>
          <p className="mt-2 text-[1rem] text-neutral-500">
            Pilih kategori meal plan dan durasi langganan dengan tampilan yang langsung terbaca.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <h2 className="text-[1.2rem] font-semibold text-neutral-900">Meal plan</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {mealPlans.map((plan) => {
                  const isActive = selectedMeal === plan.id;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedMeal(plan.id)}
                      className={`rounded-2xl border px-5 py-5 text-left transition ${
                        isActive
                          ? "border-[#1abb89] bg-[#e8f8f0] shadow-[0_8px_16px_rgba(18,168,123,0.12)]"
                          : "border-neutral-200 bg-[#fafafa] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${
                            isActive ? "bg-[#1abb89]" : "bg-[#ececec]"
                          }`}
                        >
                          <Image
                            src={plan.iconSrc}
                            alt={plan.iconAlt}
                            width={22}
                            height={22}
                            className={isActive ? "brightness-0 invert" : "opacity-70"}
                          />
                        </div>
                        <div>
                          <p className="text-[1.08rem] font-semibold text-neutral-900">
                            {plan.name}
                          </p>
                          <p className="mt-1 text-sm text-neutral-500">{plan.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-[1.2rem] font-semibold text-neutral-900">Durasi langganan</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {durationPlans.map((plan) => {
                  const isActive = selectedDuration === plan.id;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedDuration(plan.id)}
                      className={`rounded-2xl border px-5 py-5 text-left transition ${
                        isActive
                          ? "border-[#1abb89] bg-[#e8f8f0] shadow-[0_8px_16px_rgba(18,168,123,0.12)]"
                          : "border-neutral-200 bg-[#fafafa] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[1.08rem] font-semibold text-neutral-900">
                            {plan.name}
                          </p>
                          <p className="mt-2 text-[1.35rem] font-bold text-neutral-900">
                            {plan.price}
                          </p>
                          <p className="mt-1 text-sm text-neutral-500">{plan.unit}</p>
                        </div>
                        {plan.badge ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#109f78]">
                            {plan.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-4 text-sm text-neutral-600">{plan.helperText}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[#e8f8f0] px-5 py-4">
            <p className="text-sm font-semibold text-[#109f78]">Pilihan aktif</p>
            <p className="mt-2 text-[1.2rem] font-semibold text-neutral-900">
              {selectedMealPlan.name} - {selectedDurationPlan.name}
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Saat menekan tombol lanjutkan, pilihan ini akan membuat subscription baru untuk akun
              yang sedang login.
            </p>
          </div>

          {errorMessage ? (
            <p className="mt-5 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 text-[1rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleContinue}
              disabled={isSubmitting}
              className="h-11 rounded-2xl bg-[#1abb89] px-6 text-[1rem] font-semibold text-white shadow-[0_8px_16px_rgba(18,168,123,0.28)] transition hover:bg-[#15a97b] disabled:opacity-60"
            >
              {isSubmitting ? "Memproses..." : "Lanjutkan"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
