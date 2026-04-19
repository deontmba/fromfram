"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type DayKey = "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU" | "MINGGU";

type Recipe = {
  id: string;
  name: string;
  description?: string;
  calories: number;
  protein: number;
  servings: number;
  imageUrl?: string;
};

type MenuDay = {
  day: DayKey;
  date: Date;
  recipes: Recipe[];
};

type WeeklyMenuResponse = {
  weekStartDate: string;
  weekEndDate: string;
  menu: Array<{
    day: DayKey;
    date: string;
    recipes: Recipe[];
  }>;
};

const daysOfWeek: Array<{ key: DayKey; label: string }> = [
  { key: "SENIN", label: "Senin" },
  { key: "SELASA", label: "Selasa" },
  { key: "RABU", label: "Rabu" },
  { key: "KAMIS", label: "Kamis" },
  { key: "JUMAT", label: "Jumat" },
  { key: "SABTU", label: "Sabtu" },
  { key: "MINGGU", label: "Minggu" },
];

function ChefHatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-10 w-10 text-neutral-500">
      <path
        d="M7.5 10.5A3.5 3.5 0 0 1 8 3.6a4.5 4.5 0 0 1 8 .8 3.4 3.4 0 0 1 .8-.1 3.7 3.7 0 0 1 .6 7.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.3 11.6h7.4v6H8.3zM8.3 17.6h7.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4l2.8 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function WeeklyMenuPage() {
  const [weeklyMenu, setWeeklyMenu] = useState<MenuDay[]>([]);
  const [activeDay, setActiveDay] = useState<DayKey>("SENIN");
  const [selectedByDay, setSelectedByDay] = useState<Partial<Record<DayKey, string>>>({});
  const [hoveredRecipe, setHoveredRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekRange, setWeekRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  // Fetch menu dari API
  useEffect(() => {
    const fetchWeeklyMenu = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/subscriptions/weekly-menu");

        if (!response.ok) {
          throw new Error("Failed to fetch weekly menu");
        }

        const data = (await response.json()) as WeeklyMenuResponse;

        // Parse dates
        const menuWithDates = data.menu.map((m) => ({
          ...m,
          date: new Date(m.date),
        }));

        setWeeklyMenu(menuWithDates);

        // Format range untuk display
        const startDate = new Date(data.weekStartDate);
        const endDate = new Date(data.weekEndDate);
        setWeekRange({
          start: startDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
          end: endDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
        });

        // Init selectedByDay
        const initialSelected: Partial<Record<DayKey, string>> = {};
        daysOfWeek.forEach(({ key }) => {
          initialSelected[key] = "";
        });
        setSelectedByDay(initialSelected);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("[weekly-menu fetch error]", err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchWeeklyMenu();
  }, []);

  const activeMenuDay = useMemo(() => {
    return weeklyMenu.find((m) => m.day === activeDay);
  }, [weeklyMenu, activeDay]);

  const selectedCount = useMemo(() => {
    return daysOfWeek.reduce((acc, { key }) => (selectedByDay[key] ? acc + 1 : acc), 0);
  }, [selectedByDay]);

  const progressPercent = Math.round((selectedCount / daysOfWeek.length) * 100);
  const canContinue = selectedCount === daysOfWeek.length;

  const handleSelectRecipe = useCallback((recipeId: string) => {
    setSelectedByDay((prev) => ({
      ...prev,
      [activeDay]: recipeId,
    }));
  }, [activeDay]);

  const handleContinue = useCallback(async () => {
  if (!canContinue) return;

  // POST meal selections ke API
  try {
    /* TEMPORARY DEMO WORKAROUND:
      Skip saving meal selections for now because
      POST /api/subscriptions/weekly-menu can fail when
      no matching PENDING_SELECTION WeeklyBox exists.

      const mealSelections = daysOfWeek
        .map(({ key }) => ({
          day: key,
          recipeId: selectedByDay[key],
        }))
        .filter((m) => m.recipeId);

      const response = await fetch("/api/subscriptions/weekly-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealSelections,
          weekStartDate: weeklyMenu[0]?.date,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save meal selections");
      } 
    */

      // Redirect ke payment
    window.location.href = "/subscription/payment"; 
  } catch (err) {
    console.error("[save meal selections error]", err); 
    setError(err instanceof Error ? err.message : "Failed to save selections"); 
  }
  }, [canContinue, selectedByDay, weeklyMenu]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#efefef]">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#17b487]/20 border-t-[#17b487]" />
          <p className="text-neutral-600">Memuat menu mingguan...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#efefef]">
        <div className="rounded-2xl bg-white p-6 text-center shadow-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-[#17b487] px-4 py-2 text-white"
          >
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#efefef] p-2 md:p-3">
      <section className="mx-auto flex min-h-[96vh] w-full max-w-[1400px] overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08]">
        {/* SIDEBAR */}
        <aside className="w-full border-b border-black/5 bg-[#f3f3f3] p-4 md:w-[320px] md:border-b-0 md:border-r md:p-5">
          <div className="mb-6 flex items-center gap-3">
            <Image src="/icons/leaf-logo.svg" alt="FromFram" width={30} height={30} />
            <span className="text-3xl font-extrabold tracking-tight text-[#15b184]">FromFram</span>
          </div>

          <h1 className="text-4xl font-black leading-none tracking-tight text-neutral-900">Pilih Menu</h1>
          <p className="mt-2 text-sm text-neutral-500">
            {weekRange.start} - {weekRange.end}
          </p>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm text-neutral-700">
              <span className="font-semibold">
                {selectedCount}/{daysOfWeek.length} hari
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-[#17b487] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Day Buttons */}
          <div className="mt-6 space-y-2.5">
            {daysOfWeek.map(({ key, label }, idx) => {
              const isActive = key === activeDay;
              const isSelected = Boolean(selectedByDay[key]);
              const dayDate = weeklyMenu[idx]?.date;
              const dateStr = dayDate
                ? dayDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                : "";

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveDay(key)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-[#17b487] bg-gradient-to-r from-[#17b487] to-[#149f8f] text-white shadow-[0_8px_18px_rgba(20,159,143,0.28)]"
                      : "border-black/10 bg-white hover:border-[#17b487]/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{label}</p>
                      <p className={`text-xs ${isActive ? "text-white/85" : "text-neutral-500"}`}>
                        {dateStr}
                      </p>
                      <p className={`text-sm ${isActive ? "text-white/85" : "text-neutral-500"}`}>
                        {isSelected ? "✓ Sudah dipilih" : "Belum dipilih"}
                      </p>
                    </div>
                    <span
                      className={`mt-1 h-5 w-5 rounded-full border ${
                        isActive
                          ? "border-white/80"
                          : isSelected
                            ? "border-[#17b487] bg-[#17b487]"
                            : "border-neutral-300"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA Buttons */}
          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            className={`mt-5 w-full rounded-2xl px-4 py-3 text-base font-semibold transition ${
              canContinue
                ? "bg-white text-neutral-700 shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
                : "cursor-not-allowed bg-neutral-200 text-neutral-400"
            }`}
          >
            Lanjut Pembayaran →
          </button>

          <Link
            href="/subscription/delivery-address"
            className="mt-3 block text-center text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Kembali
          </Link>
        </aside>

        {/* MAIN CONTENT */}
        <div className="relative flex-1 bg-[#f6f6f6]">
          <header className="bg-gradient-to-r from-[#18b887] to-[#139f95] px-6 py-5 text-white md:px-8">
            <p className="text-sm text-white/85">Pilih menu untuk</p>
            <h2 className="text-4xl font-black leading-none tracking-tight">
              {daysOfWeek.find(({ key }) => key === activeDay)?.label}
            </h2>
            <p className="mt-1 text-sm text-white/75">
              {activeMenuDay?.date.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </header>

          {/* Menu Grid */}
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {activeMenuDay?.recipes.map((recipe) => {
              const selected = selectedByDay[activeDay] === recipe.id;

              return (
                <div
                  key={recipe.id}
                  onMouseEnter={() => setHoveredRecipe(recipe)}
                  onMouseLeave={() => setHoveredRecipe(null)}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectRecipe(recipe.id)}
                    className={`w-full rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 ${
                      selected
                        ? "border-[#17b487] ring-1 ring-[#17b487] shadow-[0_8px_18px_rgba(23,180,135,0.22)]"
                        : "border-black/10 hover:border-[#17b487]/45"
                    }`}
                  >
                    {/* Menu Image / Icon */}
                    <div className="mb-3 grid h-32 place-items-center rounded-xl border border-black/10 bg-neutral-100">
                      {recipe.imageUrl ? (
                        <Image
                          src={recipe.imageUrl}
                          alt={recipe.name}
                          width={120}
                          height={120}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ChefHatIcon />
                      )}
                    </div>

                    {/* Name */}
                    <p className="line-clamp-2 text-lg font-bold leading-tight text-neutral-900">
                      {recipe.name}
                    </p>

                    {/* Quick Nutrients */}
                    <div className="mt-2 space-y-1 text-xs text-neutral-500">
                      <p className="flex items-center gap-1">
                        <span className="inline-block h-1 w-1 rounded-full bg-[#17b487]" />
                        {recipe.calories} cal
                      </p>
                      <p className="flex items-center gap-1">
                        <span className="inline-block h-1 w-1 rounded-full bg-[#17b487]" />
                        {recipe.protein}g protein
                      </p>
                    </div>
                  </button>

                  {/* Hover Detail Popup */}
                  {hoveredRecipe?.id === recipe.id && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform rounded-lg border border-black/10 bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all">
                      <p className="mb-2 font-bold text-neutral-900">{recipe.name}</p>
                      {recipe.description && (
                        <p className="mb-3 text-xs text-neutral-600">{recipe.description}</p>
                      )}
                      <div className="space-y-2 border-t border-black/10 pt-2">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-neutral-600">Kalori:</span>
                          <span className="font-semibold text-neutral-900">{recipe.calories} kcal</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-neutral-600">Protein:</span>
                          <span className="font-semibold text-neutral-900">{recipe.protein}g</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-neutral-600">Porsi:</span>
                          <span className="font-semibold text-neutral-900">{recipe.servings}</span>
                        </div>
                      </div>
                      <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!activeMenuDay?.recipes.length && (
            <div className="flex items-center justify-center p-8 text-neutral-500">
              Tidak ada menu tersedia untuk hari ini
            </div>
          )}
        </div>
      </section>
    </main>
  );
}