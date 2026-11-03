"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type DayKey = "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU" | "MINGGU";
type MealType = "lunch" | "dinner";
type CategoryFilter = "all" | "tinggi-protein" | "rendah-karbo" | "sup-hangat";

type Recipe = {
  id: string;
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
  servings: number;
  imageUrl?: string;
  goalTags?: string[];
  dietaryTags?: string[];
  cookingTags?: string[];
  ingredients?: Array<{
    name: string;
    isAllergen: boolean;
    quantity: number;
    unit: string;
  }>;
};

type AddressData = {
  id: string;
  label: string;
  street: string;
  city: string;
  isDefault: boolean;
};

// addressSchedules keyed by DayOfWeek (SENIN…) → { LUNCH?: addressId, DINNER?: addressId }
type AddressScheduleMap = Record<string, { LUNCH?: string; DINNER?: string }>;

type MenuDay = {
  day: DayKey;
  date: Date;
  recipes: Recipe[];
};

type RecipeSelection = {
  recipeId: string;
  portions: number;
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

const mealTypes: Array<{ key: MealType; label: string }> = [
  { key: "lunch", label: "Makan Siang" },
  { key: "dinner", label: "Makan Malam" },
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

function getStartOfWeek(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function getEndOfWeek(date: Date) {
  const value = getStartOfWeek(date);
  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);
  return value;
}

function formatWeekRange(start: Date, end: Date) {
  return {
    start: start.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    end: end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
  };
}

function getAddressLabel(addressId: string | undefined, addresses: AddressData[]): string | null {
  if (!addressId) return null;
  const addr = addresses.find((a) => a.id === addressId);
  return addr ? addr.label : null;
}

function getAddressEmoji(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("kantor") || lower.includes("office") || lower.includes("kerja")) return "🏢";
  if (lower.includes("rumah") || lower.includes("home")) return "🏠";
  return "📍";
}

// ---------- Detail Modal ----------
function DetailModal({
  recipe,
  isSelected,
  onClose,
  onToggleSelect,
}: {
  recipe: Recipe;
  isSelected: boolean;
  onClose: () => void;
  onToggleSelect: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-[24px] border border-[#1db788]/30 bg-white shadow-2xl flex flex-col">
        {/* Image */}
        <div className="relative h-48 shrink-0 bg-gradient-to-br from-[#d4f8f5] to-[#e8f9f7] overflow-hidden">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ChefHatIcon />
            </div>
          )}
          <div className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {recipe.calories} kkal
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 left-3 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60 transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="text-2xl font-black leading-tight text-neutral-900">{recipe.name}</h3>
          {recipe.description && (
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{recipe.description}</p>
          )}

          {/* Nutrition grid */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">Informasi Nutrisi</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <NutriCell label="Kalori" value={`${recipe.calories}`} unit="kkal" color="text-orange-500" />
              <NutriCell label="Protein" value={`${recipe.protein}`} unit="g" color="text-blue-500" />
              {recipe.carbs !== undefined && (
                <NutriCell label="Karbo" value={`${recipe.carbs}`} unit="g" color="text-yellow-600" />
              )}
              {recipe.fat !== undefined && (
                <NutriCell label="Lemak" value={`${recipe.fat}`} unit="g" color="text-red-500" />
              )}
              {recipe.fiber !== undefined && (
                <NutriCell label="Serat" value={`${recipe.fiber}`} unit="g" color="text-green-600" />
              )}
              {recipe.sodium !== undefined && (
                <NutriCell label="Sodium" value={`${recipe.sodium}`} unit="mg" color="text-purple-500" />
              )}
              {recipe.sugar !== undefined && (
                <NutriCell label="Gula" value={`${recipe.sugar}`} unit="g" color="text-pink-500" />
              )}
            </div>
          </div>

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">🧪 Bahan Baku</p>
              <div className="flex flex-wrap gap-1.5">
                {recipe.ingredients.map((ing, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      ing.isAllergen
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-teal-50 text-teal-700 border border-teal-100"
                    }`}
                  >
                    {ing.isAllergen && <span title="Alergen">⚠️</span>}
                    {ing.name}{" "}
                    <span className="opacity-60">
                      ({ing.quantity}
                      {ing.unit})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="border-t border-gray-100 bg-white p-4">
          <button
            onClick={() => {
              onToggleSelect();
              onClose();
            }}
            className={`w-full rounded-xl py-3 font-bold text-white transition ${
              isSelected
                ? "bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600"
                : "bg-gradient-to-r from-[#1db788] to-[#16a679] hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            {isSelected ? "Batal Pilih" : "Pilih Menu Ini"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NutriCell({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={`text-lg font-black ${color}`}>
        {value}
        <span className="text-xs font-normal text-neutral-500 ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

// ---------- Menu Card ----------
function MenuCard({
  recipe,
  portions,
  maxPortions,
  onSelect,
  onOpenDetail,
}: {
  recipe: Recipe;
  portions: number;
  maxPortions: number;
  onSelect: (recipeId: string, portions: number) => void;
  onOpenDetail: (recipe: Recipe) => void;
}) {
  const isSelected = portions > 0;
  const isDisabled = !isSelected && maxPortions <= 0;

  return (
    <div
      className={`flex flex-col rounded-2xl border-2 bg-white shadow-sm transition overflow-hidden ${
        isSelected
          ? "border-[#1db788] shadow-[0_4px_16px_rgba(29,183,136,0.2)]"
          : isDisabled
          ? "border-white/20 opacity-50 cursor-not-allowed"
          : "border-[#1db788]/20 hover:border-[#1db788]/50 hover:-translate-y-0.5"
      }`}
    >
      {/* Image area */}
      <div className="relative h-36 shrink-0 overflow-hidden bg-gradient-to-br from-[#d4f8f5] to-[#e8f9f7]">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ChefHatIcon />
          </div>
        )}
        {/* Calorie badge top-right */}
        <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.65rem] font-bold text-white backdrop-blur-sm">
          {recipe.calories} kkal
        </div>
        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-2 left-2 rounded-full bg-[#1db788] px-2 py-0.5 text-[0.65rem] font-bold text-white">
            ✓ Dipilih
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <p className="line-clamp-2 text-sm font-bold leading-tight text-neutral-900">{recipe.name}</p>

        {recipe.description && (
          <p className="line-clamp-2 text-[0.7rem] leading-snug text-neutral-500">{recipe.description}</p>
        )}

        {/* Nutrition row */}
        <div className="flex items-center gap-1 mt-auto">
          <NutriBadge label="PROTEIN" value={recipe.protein} unit="g" color="text-blue-600" />
          {recipe.carbs !== undefined && (
            <NutriBadge label="KARBO" value={recipe.carbs} unit="g" color="text-yellow-600" />
          )}
          {recipe.fat !== undefined && (
            <NutriBadge label="LEMAK" value={recipe.fat} unit="g" color="text-red-500" />
          )}
        </div>

        {/* "Lihat Lebih Detail" */}
        <button
          type="button"
          onClick={() => onOpenDetail(recipe)}
          className="text-left text-[0.7rem] font-semibold text-[#0ea5a5] hover:underline"
        >
          Lihat Lebih Detail →
        </button>

        {/* Portion controls or select button */}
        {isSelected ? (
          <div className="rounded-lg border-2 border-[#1db788]/30 bg-[#f0fff9] p-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSelect(recipe.id, Math.max(0, portions - 1))}
                className="flex-1 rounded-md border border-[#1db788]/40 bg-white py-1.5 text-sm font-bold text-neutral-900 transition hover:bg-gray-50"
              >
                −
              </button>
              <input
                type="number"
                min="0"
                max={maxPortions}
                value={portions}
                onChange={(e) =>
                  onSelect(
                    recipe.id,
                    Math.max(0, Math.min(maxPortions, parseInt(e.target.value) || 0))
                  )
                }
                className="flex-1 rounded-md border border-[#1db788]/40 bg-white px-1 py-1.5 text-center text-sm font-bold text-neutral-900"
              />
              <button
                onClick={() => onSelect(recipe.id, Math.min(maxPortions, portions + 1))}
                disabled={portions >= maxPortions}
                className="flex-1 rounded-md border border-[#1db788]/40 bg-white py-1.5 text-sm font-bold text-neutral-900 transition hover:bg-gray-50 disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onSelect(recipe.id, 1)}
            className={`w-full rounded-xl py-2 text-sm font-bold text-white transition ${
              isDisabled
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-[#1db788] to-[#16a679] hover:shadow-md hover:-translate-y-0.5"
            }`}
          >
            Pilih Menu Ini
          </button>
        )}
      </div>
    </div>
  );
}

function NutriBadge({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex-1 rounded-lg bg-gray-50 px-1 py-1 text-center border border-gray-100">
      <p className="text-[0.55rem] font-bold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className={`text-xs font-black ${color}`}>
        {value}
        <span className="text-[0.55rem] font-normal text-neutral-400">{unit}</span>
      </p>
    </div>
  );
}

// ---------- Main Page ----------
export default function WeeklyMenuPage() {
  const router = useRouter();

  // Menu data
  const [weeklyMenu, setWeeklyMenu] = useState<MenuDay[]>([]);
  const [activeDay, setActiveDay] = useState<DayKey>("SENIN");
  const [activeMealType, setActiveMealType] = useState<MealType>("lunch");
  const [selectedByDay, setSelectedByDay] = useState<
    Partial<Record<DayKey, Partial<Record<MealType, RecipeSelection[]>>>>
  >({});
  const [servingSize, setServingSize] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuUnavailableMessage, setMenuUnavailableMessage] = useState<string | null>(null);
  const [weekRange, setWeekRange] = useState<{ start: string; end: string }>({ start: "", end: "" });

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  // Detail modal
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);

  // Receipt modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Address scheduling
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [addressSchedules, setAddressSchedules] = useState<AddressScheduleMap>({});
  const [isAddressPanelOpen, setIsAddressPanelOpen] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Fetch menu + subscription info
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/subscriptions/weekly-menu");
        const payload = (await response.json().catch(() => null)) as
          | WeeklyMenuResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          const message =
            payload && "error" in payload && payload.error
              ? payload.error
              : "Failed to fetch weekly menu";

          if (response.status === 404) {
            const currentWeekStart = getStartOfWeek(new Date());
            const currentWeekEnd = getEndOfWeek(new Date());

            setWeeklyMenu([]);
            setMenuUnavailableMessage("Ahli gizi kamu belum menyiapkan menu untuk minggu ini");
            setWeekRange(formatWeekRange(currentWeekStart, currentWeekEnd));

            const initialSelected: Partial<Record<DayKey, Partial<Record<MealType, RecipeSelection[]>>>> = {};
            daysOfWeek.forEach(({ key }) => {
              initialSelected[key] = { lunch: [], dinner: [] };
            });
            setSelectedByDay(initialSelected);
            return;
          }

          throw new Error(message);
        }

        if (!payload || !("menu" in payload) || !Array.isArray(payload.menu)) {
          throw new Error("Weekly menu response tidak valid.");
        }

        const data = payload as WeeklyMenuResponse;
        const menuWithDates = data.menu.map((m) => ({ ...m, date: new Date(m.date) }));
        setWeeklyMenu(menuWithDates);
        setMenuUnavailableMessage(null);

        const startDate = new Date(data.weekStartDate);
        const endDate = new Date(data.weekEndDate);
        setWeekRange(formatWeekRange(startDate, endDate));

        const subResponse = await fetch("/api/subscriptions/me");
        const subData = (await subResponse.json().catch(() => null)) as { servings?: number } | null;
        if (subData && subData.servings) {
          setServingSize(subData.servings);
        }

        const initialSelected: Partial<Record<DayKey, Partial<Record<MealType, RecipeSelection[]>>>> = {};
        daysOfWeek.forEach(({ key }) => {
          initialSelected[key] = { lunch: [], dinner: [] };
        });
        setSelectedByDay(initialSelected);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("[weekly-menu fetch error]", err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  // Fetch addresses and address schedules
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const [addrRes, schedRes] = await Promise.all([
          fetch("/api/profile/address"),
          fetch("/api/address-schedules"),
        ]);

        if (addrRes.ok) {
          const addrData = (await addrRes.json()) as AddressData[];
          setAddresses(Array.isArray(addrData) ? addrData : []);
        }

        if (schedRes.ok) {
          const schedData = (await schedRes.json()) as Array<{
            id: string;
            dayOfWeek: string;
            mealType: string;
            addressId: string;
          }>;

          const map: AddressScheduleMap = {};
          if (Array.isArray(schedData)) {
            schedData.forEach((s) => {
              if (!map[s.dayOfWeek]) map[s.dayOfWeek] = {};
              if (s.mealType === "LUNCH") map[s.dayOfWeek].LUNCH = s.addressId;
              if (s.mealType === "DINNER") map[s.dayOfWeek].DINNER = s.addressId;
            });
          }
          setAddressSchedules(map);
        }
      } catch (err) {
        console.error("[fetch addresses/schedules error]", err);
      }
    };

    void fetchAddresses();
  }, []);

  const handleAddressScheduleChange = useCallback(
    async (dayOfWeek: DayKey, addressId: string) => {
      setIsSavingSchedule(true);
      try {
        // Upsert LUNCH and DINNER for this day simultaneously
        await Promise.all([
          fetch("/api/address-schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dayOfWeek, mealType: "LUNCH", addressId }),
          }),
          fetch("/api/address-schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dayOfWeek, mealType: "DINNER", addressId }),
          }),
        ]);

        setAddressSchedules((prev) => ({
          ...prev,
          [dayOfWeek]: { LUNCH: addressId, DINNER: addressId },
        }));
      } catch (err) {
        console.error("[save address schedule error]", err);
      } finally {
        setIsSavingSchedule(false);
      }
    },
    []
  );

  const activeMenuDay = useMemo(() => {
    return weeklyMenu.find((m) => m.day === activeDay);
  }, [weeklyMenu, activeDay]);

  // Filtered recipes based on active category
  const filteredRecipes = useMemo(() => {
    const recipes = activeMenuDay?.recipes ?? [];
    if (categoryFilter === "all") return recipes;
    if (categoryFilter === "tinggi-protein") {
      return recipes.filter(
        (r) => (r.goalTags && r.goalTags.includes("tinggi-protein")) || r.protein > 25
      );
    }
    if (categoryFilter === "rendah-karbo") {
      return recipes.filter(
        (r) => (r.dietaryTags && r.dietaryTags.includes("rendah-karbo")) || (r.carbs !== undefined && r.carbs < 30)
      );
    }
    if (categoryFilter === "sup-hangat") {
      return recipes.filter(
        (r) =>
          (r.cookingTags && r.cookingTags.some((t) => t.toLowerCase().includes("sup"))) ||
          r.name.toLowerCase().includes("sup")
      );
    }
    return recipes;
  }, [activeMenuDay, categoryFilter]);

  const totalSelectedPortions = useMemo(() => {
    let total = 0;
    daysOfWeek.forEach(({ key }) => {
      const daySelections = selectedByDay[key];
      if (daySelections) {
        const lunchTotal = (daySelections.lunch || []).reduce((acc, sel) => acc + sel.portions, 0);
        const dinnerTotal = (daySelections.dinner || []).reduce((acc, sel) => acc + sel.portions, 0);
        total += lunchTotal + dinnerTotal;
      }
    });
    return total;
  }, [selectedByDay]);

  const totalRequiredPortions = useMemo(() => {
    return daysOfWeek.length * 2 * Math.max(1, servingSize);
  }, [servingSize]);

  const currentMealSelections = useMemo(() => {
    return selectedByDay[activeDay]?.[activeMealType] || [];
  }, [selectedByDay, activeDay, activeMealType]);

  const currentMealPortionsTotal = useMemo(() => {
    return currentMealSelections.reduce((acc, sel) => acc + sel.portions, 0);
  }, [currentMealSelections]);

  const progressPercent = Math.round(
    (totalSelectedPortions / Math.max(1, totalRequiredPortions)) * 100
  );
  const canContinue = totalSelectedPortions === totalRequiredPortions;

  const handleSelectRecipe = useCallback(
    (recipeId: string, portions: number) => {
      setSelectedByDay((prev) => {
        const daySelections = prev[activeDay] || { lunch: [], dinner: [] };
        const mealSelections = daySelections[activeMealType] || [];

        const existingIndex = mealSelections.findIndex((sel) => sel.recipeId === recipeId);

        let updated: RecipeSelection[];
        if (existingIndex >= 0) {
          updated = [...mealSelections];
          if (portions > 0) {
            updated[existingIndex] = { ...updated[existingIndex], portions };
          } else {
            updated.splice(existingIndex, 1);
          }
        } else {
          updated = [...mealSelections, { recipeId, portions }];
        }

        return {
          ...prev,
          [activeDay]: {
            ...daySelections,
            [activeMealType]: updated,
          },
        };
      });
    },
    [activeDay, activeMealType]
  );

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;

    try {
      const mealSelections: Array<{
        day: DayKey;
        mealType: "LUNCH" | "DINNER";
        serving?: number;
        recipeId: string;
      }> = [];

      daysOfWeek.forEach(({ key: day }) => {
        const daySelections = selectedByDay[day];
        if (daySelections) {
          mealTypes.forEach(({ key: mealType }) => {
            const meals = daySelections[mealType] || [];
            meals.forEach((meal) => {
              mealSelections.push({
                day,
                mealType: mealType.toUpperCase() as "LUNCH" | "DINNER",
                serving: meal.portions,
                recipeId: meal.recipeId,
              });
            });
          });
        }
      });

      const weekStartDate = weeklyMenu[0]?.date;
      if (!weekStartDate) throw new Error("Week start date tidak ditemukan.");

      const response = await fetch("/api/subscriptions/weekly-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealSelections,
          weekStartDate: weekStartDate.toISOString(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) throw new Error(payload?.error ?? "Failed to save meal selections");

      router.push("/subscription/payment");
    } catch (err) {
      console.error("[save meal selections error]", err);
      setError(err instanceof Error ? err.message : "Failed to save selections");
    }
  }, [canContinue, selectedByDay, weeklyMenu, router]);

  const receiptData = useMemo(() => {
    const data: Array<{
      dayLabel: string;
      lunch: Array<{ name: string; portions: number }>;
      dinner: Array<{ name: string; portions: number }>;
    }> = [];

    daysOfWeek.forEach(({ key: dayKey, label: dayLabel }) => {
      const dayMenu = weeklyMenu.find((m) => m.day === dayKey);
      const daySelections = selectedByDay[dayKey];

      if (!dayMenu || !daySelections) return;

      const getItems = (mealType: MealType) => {
        const selections = daySelections[mealType] || [];
        return selections
          .filter((s) => s.portions > 0)
          .map((s) => {
            const recipe = dayMenu.recipes.find((r) => r.id === s.recipeId);
            return { name: recipe?.name || "Menu tidak diketahui", portions: s.portions };
          });
      };

      const lunchItems = getItems("lunch");
      const dinnerItems = getItems("dinner");

      if (lunchItems.length > 0 || dinnerItems.length > 0) {
        data.push({ dayLabel, lunch: lunchItems, dinner: dinnerItems });
      }
    });

    return data;
  }, [selectedByDay, weeklyMenu]);

  // Compute address summary text for collapsed panel
  const addressSummaryText = useMemo(() => {
    if (addresses.length === 0) return null;

    const weekdays: DayKey[] = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"];
    const weekend: DayKey[] = ["SABTU", "MINGGU"];

    const weekdayAddrIds = weekdays
      .map((d) => addressSchedules[d]?.LUNCH)
      .filter(Boolean) as string[];
    const weekendAddrIds = weekend
      .map((d) => addressSchedules[d]?.LUNCH)
      .filter(Boolean) as string[];

    const allWeekdaySame =
      weekdayAddrIds.length === 5 && new Set(weekdayAddrIds).size === 1;
    const allWeekendSame =
      weekendAddrIds.length === 2 && new Set(weekendAddrIds).size === 1;

    const parts: string[] = [];
    if (allWeekdaySame) {
      const lbl = getAddressLabel(weekdayAddrIds[0], addresses);
      if (lbl) parts.push(`Sen–Jum: ${lbl}`);
    }
    if (allWeekendSame) {
      const lbl = getAddressLabel(weekendAddrIds[0], addresses);
      if (lbl) parts.push(`Sab–Min: ${lbl}`);
    }

    return parts.length > 0 ? parts.join(" | ") : null;
  }, [addresses, addressSchedules]);

  if (isLoading) {
    return (
      <main className="relative min-h-screen overflow-hidden flex items-center justify-center p-2 md:p-3">
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#d4f8f5] via-[#f0f7f5] to-[#e8f9f7]" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="relative min-h-screen overflow-hidden flex items-center justify-center p-2 md:p-3">
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#d4f8f5] via-[#f0f7f5] to-[#e8f9f7]" />
        <div className="relative z-10 rounded-2xl border-2 border-[#1db788]/50 bg-white/10 p-6 text-center backdrop-blur-md">
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gradient-to-r from-[#1db788] to-[#16a679] px-4 py-2 text-white font-semibold border-2 border-[#1db788] hover:shadow-lg"
          >
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#d4f8f5] via-[#f0f7f5] to-[#e8f9f7] p-2 md:p-3">
      {/* Background Ornaments */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#d4f8f5] via-[#f0f7f5] to-[#e8f9f7]" />
      <div className="absolute -top-40 -right-40 -z-10 h-96 w-96 rounded-full bg-gradient-to-br from-[#1db788]/40 to-[#0ea5a5]/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 -z-10 h-80 w-80 rounded-full bg-gradient-to-tr from-[#1db788]/25 to-transparent blur-3xl" />
      <div className="absolute top-1/2 right-1/4 -z-10 h-72 w-72 rounded-full bg-gradient-to-bl from-[#0ea5a5]/30 to-transparent blur-3xl" />

      {/* Modal Receipt */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-sm transition-all">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[28px] border border-[#1db788]/30 bg-white shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-[#1db788] to-[#0ea5a5] px-6 py-5 text-white shadow-sm">
              <h3 className="text-2xl font-black tracking-tight">Ringkasan Pesanan</h3>
              <p className="text-sm text-white/80 mt-1">
                Cek kembali menu pilihanmu sebelum lanjut pembayaran
              </p>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#f8fdfa]">
              {receiptData.length === 0 ? (
                <div className="text-center py-10 text-neutral-500">
                  Belum ada menu yang dipilih.
                </div>
              ) : (
                <div className="space-y-6">
                  {receiptData.map((dayData, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[#1db788]/20 bg-white p-4 shadow-sm"
                    >
                      <h4 className="mb-3 text-lg font-bold text-[#0ea5a5] border-b border-gray-100 pb-2">
                        {dayData.dayLabel}
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="rounded-xl bg-[#f0fbf7] p-3 border border-[#1db788]/10">
                          <p className="text-sm font-semibold text-neutral-700 mb-2">Makan Siang</p>
                          {dayData.lunch.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic">Belum ada pilihan</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {dayData.lunch.map((item, i) => (
                                <li key={i} className="flex justify-between items-start text-sm">
                                  <span className="text-neutral-600 pr-2 leading-tight">
                                    {item.name}
                                  </span>
                                  <span className="font-bold text-neutral-900 whitespace-nowrap">
                                    {item.portions}x
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="rounded-xl bg-[#f0fbf7] p-3 border border-[#1db788]/10">
                          <p className="text-sm font-semibold text-neutral-700 mb-2">Makan Malam</p>
                          {dayData.dinner.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic">Belum ada pilihan</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {dayData.dinner.map((item, i) => (
                                <li key={i} className="flex justify-between items-start text-sm">
                                  <span className="text-neutral-600 pr-2 leading-tight">
                                    {item.name}
                                  </span>
                                  <span className="font-bold text-neutral-900 whitespace-nowrap">
                                    {item.portions}x
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-white p-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="text-sm text-neutral-600 font-medium">
                Total Terpilih:{" "}
                <span className="font-bold text-[#1db788] text-lg">
                  {totalSelectedPortions}/{totalRequiredPortions}
                </span>{" "}
                porsi
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="flex-1 sm:flex-none rounded-xl border-2 border-gray-200 px-5 py-2.5 font-semibold text-neutral-600 hover:bg-gray-50 transition"
                >
                  Tutup
                </button>
                <button
                  disabled={!canContinue}
                  onClick={handleContinue}
                  className={`flex-1 sm:flex-none rounded-xl px-6 py-2.5 font-semibold text-white shadow-md transition ${
                    canContinue
                      ? "bg-gradient-to-r from-[#1db788] to-[#16a679] hover:-translate-y-0.5 hover:shadow-lg"
                      : "bg-gray-300 cursor-not-allowed opacity-70"
                  }`}
                >
                  Lanjut Pembayaran →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailRecipe && (
        <DetailModal
          recipe={detailRecipe}
          isSelected={
            !!(currentMealSelections.find((s) => s.recipeId === detailRecipe.id)?.portions ?? 0 > 0)
          }
          onClose={() => setDetailRecipe(null)}
          onToggleSelect={() => {
            const existing = currentMealSelections.find((s) => s.recipeId === detailRecipe.id);
            if (existing && existing.portions > 0) {
              handleSelectRecipe(detailRecipe.id, 0);
            } else {
              handleSelectRecipe(detailRecipe.id, 1);
            }
          }}
        />
      )}

      <section className="relative z-10 mx-auto flex min-h-[96vh] w-full max-w-[1400px] rounded-[28px] border-2 border-[#1db788]/50 bg-gradient-to-br from-white/30 to-[#f0fff9] backdrop-blur-md shadow-[0_12px_30px_rgba(29,183,136,0.15)] overflow-visible md:overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-full border-b border-[#1db788]/20 bg-gradient-to-br from-[#f0fff9] via-[#e6fff4] to-[#dcfff0] p-4 backdrop-blur-md md:w-[320px] md:border-b-0 md:border-r md:p-5 flex flex-col overflow-y-auto">
          <div className="mb-6 flex items-center gap-3">
            <Image src="/icons/leaf-logo.svg" alt="FromFram" width={30} height={30} />
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#1db788] to-[#16a679] bg-clip-text text-transparent">
              FromFram
            </span>
          </div>

          <h1 className="text-4xl font-black leading-none tracking-tight bg-gradient-to-r from-[#1db788] via-[#0ea5a5] to-[#1db788] bg-clip-text text-transparent">
            Pilih Menu
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {weekRange.start} - {weekRange.end}
          </p>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm text-neutral-700">
              <span className="font-semibold">
                {totalSelectedPortions}/{totalRequiredPortions} porsi
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/20 backdrop-blur-sm">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1db788] via-[#0ea5a5] via-[#84cc16] to-[#1db788] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Address Schedule Panel */}
          {addresses.length > 0 && (
            <div className="mt-4 rounded-2xl border-2 border-[#1db788]/30 bg-white/20 backdrop-blur-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setIsAddressPanelOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-bold text-neutral-800">📍 Alamat Pengiriman Pintar</p>
                  {!isAddressPanelOpen && addressSummaryText && (
                    <p className="text-xs text-neutral-500 mt-0.5">{addressSummaryText}</p>
                  )}
                </div>
                <span className="text-xs font-semibold text-[#0ea5a5]">
                  {isAddressPanelOpen ? "Tutup" : "Kelola"}
                </span>
              </button>

              {isAddressPanelOpen && (
                <div className="border-t border-[#1db788]/20 px-4 pb-4 pt-3 space-y-2">
                  <p className="text-xs text-neutral-500 mb-2">
                    Pilih alamat pengiriman untuk setiap hari
                  </p>
                  {daysOfWeek.map(({ key, label }) => {
                    const currentAddrId = addressSchedules[key]?.LUNCH;
                    const currentLabel = getAddressLabel(currentAddrId, addresses);
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-12 text-xs font-bold text-neutral-600 shrink-0">
                          {label}
                        </span>
                        {currentLabel && (
                          <span className="text-xs text-[#1db788] font-semibold shrink-0">
                            {getAddressEmoji(currentLabel)} {currentLabel}
                          </span>
                        )}
                        <select
                          value={currentAddrId ?? ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              void handleAddressScheduleChange(key, e.target.value);
                            }
                          }}
                          disabled={isSavingSchedule}
                          className="ml-auto min-w-0 flex-1 rounded-lg border border-[#1db788]/30 bg-white px-2 py-1 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#1db788]/40 disabled:opacity-50"
                        >
                          <option value="">Pilih alamat</option>
                          {addresses.map((addr) => (
                            <option key={addr.id} value={addr.id}>
                              {addr.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                  {isSavingSchedule && (
                    <p className="text-xs text-[#1db788] text-center animate-pulse">Menyimpan…</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Day list */}
          <div className="mt-4 flex-1 space-y-2.5 pb-6">
            {daysOfWeek.map(({ key, label }, idx) => {
              const isActive = key === activeDay;
              const daySelections = selectedByDay[key] || { lunch: [], dinner: [] };
              const lunchTotal = (daySelections.lunch || []).reduce(
                (acc, sel) => acc + sel.portions,
                0
              );
              const dinnerTotal = (daySelections.dinner || []).reduce(
                (acc, sel) => acc + sel.portions,
                0
              );
              const dayTotal = lunchTotal + dinnerTotal;
              const dayRequired = 2 * Math.max(1, servingSize);
              const dayProgress = Math.min(1, dayTotal / dayRequired);
              const dayDate = weeklyMenu[idx]?.date;
              const dateStr = dayDate
                ? dayDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                : "";

              // Address badge for this day
              const dayAddrId = addressSchedules[key]?.LUNCH;
              const dayAddrLabel = getAddressLabel(dayAddrId, addresses);

              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setActiveDay(key)}
                    className={`w-full rounded-2xl border-4 px-4 py-3 text-left transition outline outline-1 ${
                      dayProgress >= 1
                        ? "border-[#0ea5a5] bg-[#0ea5a5] text-white shadow-[0_8px_18px_rgba(14,165,165,0.18)]"
                        : isActive
                        ? "border-[#1db788] bg-[#1db788] text-white shadow-[0_8px_18px_rgba(29,183,136,0.28)]"
                        : "border-[#1db788]/30 bg-white/10 text-neutral-700 hover:-translate-y-1 hover:border-[#1db788]/50 hover:bg-white/12"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-lg font-bold ${
                            dayProgress >= 1 || isActive ? "text-white" : "text-neutral-900"
                          }`}
                        >
                          {label}
                        </p>
                        <p
                          className={`text-xs ${
                            dayProgress >= 1 || isActive ? "text-white/85" : "text-neutral-600"
                          }`}
                        >
                          {dateStr}
                        </p>
                        <p
                          className={`text-sm ${
                            dayProgress >= 1 || isActive ? "text-white/85" : "text-neutral-600"
                          }`}
                        >
                          {dayTotal}/{dayRequired} porsi
                        </p>
                        {dayAddrLabel && (
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${
                              dayProgress >= 1 || isActive
                                ? "bg-white/20 text-white"
                                : "bg-[#1db788]/10 text-[#1db788]"
                            }`}
                          >
                            {getAddressEmoji(dayAddrLabel)} {dayAddrLabel}
                          </span>
                        )}
                      </div>
                      <span
                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          dayProgress >= 1
                            ? "border-[#0ea5a5] bg-white"
                            : isActive
                            ? "border-[#1db788] bg-white"
                            : "border-[#1db788]/30 bg-transparent"
                        }`}
                      >
                        {dayProgress >= 1 && (
                          <svg
                            className="h-3.5 w-3.5 text-[#0ea5a5]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                    </div>
                  </button>

                  {isActive && (
                    <div className="mt-2 space-y-2 rounded-2xl border-2 border-[#1db788]/40 bg-white/10 p-3 backdrop-blur-md">
                      {mealTypes.map(({ key: mealKey, label: mealLabel }) => {
                        const mealTotal = (daySelections[mealKey] || []).reduce(
                          (acc, sel) => acc + sel.portions,
                          0
                        );
                        const mealProgress = Math.min(1, mealTotal / Math.max(1, servingSize));
                        const mealClass =
                          mealProgress >= 1
                            ? "border-[#0ea5a5] bg-[#0ea5a5] text-white"
                            : activeMealType === mealKey
                            ? "border-[#1db788] bg-[#1db788] text-white"
                            : "border-[#1db788]/30 bg-white/10 text-neutral-700 hover:border-[#1db788]/50";

                        return (
                          <button
                            key={mealKey}
                            type="button"
                            onClick={() => setActiveMealType(mealKey)}
                            className={`w-full rounded-xl border-2 px-3 py-2 text-sm font-semibold transition outline outline-1 outline-white/40 ${mealClass}`}
                          >
                            {mealLabel} {mealProgress > 0 ? `(${mealTotal}/${servingSize})` : ""}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom actions */}
          <div className="mt-auto pt-4 border-t border-[#1db788]/20 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(true)}
              className="w-full rounded-2xl border-2 border-[#0ea5a5] bg-white px-4 py-2.5 text-sm font-bold text-[#0ea5a5] transition hover:bg-[#f0fbf7] outline outline-1 outline-white/40"
            >
              Lihat Ringkasan Pesanan
            </button>

            <button
              type="button"
              disabled={!canContinue}
              onClick={handleContinue}
              className={`w-full rounded-2xl border-2 px-4 py-3 text-base font-semibold backdrop-blur-md transition outline outline-1 outline-white/40 ${
                canContinue
                  ? "border-[#1db788] bg-gradient-to-r from-[#1db788] to-[#16a679] text-white shadow-[0_12px_25px_rgba(29,183,136,0.35)] hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(29,183,136,0.4)]"
                  : "border-white/20 cursor-not-allowed bg-white/10 text-neutral-500"
              }`}
            >
              Lanjut Pembayaran →
            </button>

            <Link
              href="/subscription/delivery-address"
              className="text-center text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              ← Kembali
            </Link>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="relative flex-1 bg-[#ecfdf3] backdrop-blur-md flex flex-col">
          <header className="bg-gradient-to-r from-[#1db788] via-[#0ea5a5] to-[#1db788] px-6 py-5 text-white md:px-8 shrink-0">
            <p className="text-sm text-white/85">Pilih menu untuk</p>
            <h2 className="text-4xl font-black leading-none tracking-tight">
              {menuUnavailableMessage
                ? "Menu Minggu Ini"
                : daysOfWeek.find(({ key }) => key === activeDay)?.label}
            </h2>
            <p className="mt-1 text-sm text-white/75">
              {menuUnavailableMessage
                ? weekRange.start && weekRange.end
                  ? `${weekRange.start} - ${weekRange.end}`
                  : ""
                : activeMenuDay?.date.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
            </p>

            {!menuUnavailableMessage && (
              <div className="mt-4 rounded-lg bg-white/10 px-3 py-2 border border-white/20">
                <p className="text-xs text-white/80">
                  <span className="font-semibold">Info:</span> Anda dapat memilih menu sebanyak{" "}
                  <span className="font-bold">{servingSize} porsi</span> untuk setiap waktu makan
                  (Siang &amp; Malam)
                </p>
              </div>
            )}
          </header>

          {/* Category filter tabs */}
          {!menuUnavailableMessage && (
            <div className="flex gap-2 overflow-x-auto px-5 pt-4 pb-2 shrink-0 no-scrollbar">
              {(
                [
                  { key: "all", label: `Semua Menu (${activeMenuDay?.recipes.length ?? 0})` },
                  { key: "tinggi-protein", label: "Tinggi Protein" },
                  { key: "rendah-karbo", label: "Rendah Karbo" },
                  { key: "sup-hangat", label: "Sup & Hangat" },
                ] as Array<{ key: CategoryFilter; label: string }>
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryFilter(key)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    categoryFilter === key
                      ? "bg-[#1db788] text-white shadow"
                      : "bg-white/60 text-neutral-600 hover:bg-white/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 relative pb-20">
              {menuUnavailableMessage ? (
                <div className="col-span-full flex min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-[#1db788]/40 bg-white/40 px-6 py-10 text-center shadow-sm backdrop-blur-sm">
                  <div className="max-w-lg">
                    <p className="text-2xl font-black tracking-tight text-neutral-900">
                      {menuUnavailableMessage}
                    </p>
                    <p className="mt-2 text-sm text-neutral-600">
                      Coba lagi nanti atau kembali setelah ahli gizi menambahkan menu untuk minggu
                      ini.
                    </p>
                  </div>
                </div>
              ) : filteredRecipes.length > 0 ? (
                filteredRecipes.map((recipe) => {
                  const recipeSelection = currentMealSelections.find(
                    (sel) => sel.recipeId === recipe.id
                  );
                  const portions = recipeSelection?.portions ?? 0;
                  const maxPortions = servingSize - (currentMealPortionsTotal - portions);

                  return (
                    <MenuCard
                      key={recipe.id}
                      recipe={recipe}
                      portions={portions}
                      maxPortions={maxPortions}
                      onSelect={handleSelectRecipe}
                      onOpenDetail={setDetailRecipe}
                    />
                  );
                })
              ) : (
                <div className="col-span-full flex items-center justify-center p-8 text-neutral-600">
                  {categoryFilter === "all"
                    ? "Tidak ada menu tersedia untuk hari ini"
                    : "Tidak ada menu yang cocok dengan filter ini"}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
