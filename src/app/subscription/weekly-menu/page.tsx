"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, MapPin, Minus, Plus, Sparkles, UtensilsCrossed, X } from "lucide-react";
import {
  CheckoutLayout,
  cardClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/subscription/checkout-layout";

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

function RecipeImage({ recipe, sizes }: { recipe: Recipe; sizes: string }) {
  return recipe.imageUrl ? (
    <Image src={recipe.imageUrl} alt={recipe.name} fill sizes={sizes} className="object-cover" />
  ) : (
    <div className="flex h-full items-center justify-center text-neutral-400">
      <UtensilsCrossed aria-hidden="true" className="h-8 w-8" />
    </div>
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
  const nutrients: Array<[string, number | undefined, string]> = [
    ["Kalori", recipe.calories, "kkal"],
    ["Protein", recipe.protein, "g"],
    ["Karbo", recipe.carbs, "g"],
    ["Lemak", recipe.fat, "g"],
    ["Serat", recipe.fiber, "g"],
    ["Gula", recipe.sugar, "g"],
    ["Natrium", recipe.sodium, "mg"],
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-900/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={recipe.name} className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative h-52 shrink-0 bg-neutral-100">
          <RecipeImage recipe={recipe} sizes="512px" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-neutral-700 shadow transition hover:bg-white"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="text-xl font-bold leading-tight text-neutral-900">{recipe.name}</h3>
          {recipe.description ? <p className="mt-2 text-sm leading-6 text-neutral-600">{recipe.description}</p> : null}

          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-neutral-400">Nilai gizi per porsi</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {nutrients
              .filter(([, value]) => value !== undefined)
              .map(([label, value, unit]) => (
                <div key={label} className="rounded-xl bg-neutral-50 px-3 py-2">
                  <dt className="text-xs text-neutral-500">{label}</dt>
                  <dd className="text-sm font-semibold text-neutral-900">
                    {value} <span className="font-normal text-neutral-500">{unit}</span>
                  </dd>
                </div>
              ))}
          </dl>

          {recipe.ingredients && recipe.ingredients.length > 0 ? (
            <>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-neutral-400">Bahan</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {recipe.ingredients.map((ing, i) => (
                  <li
                    key={i}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      ing.isAllergen ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {ing.name} {ing.quantity} {ing.unit}
                    {ing.isAllergen ? <span className="ml-1 font-semibold">(alergen)</span> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="border-t border-neutral-100 p-4">
          <button
            type="button"
            onClick={() => {
              onToggleSelect();
              onClose();
            }}
            className={`h-11 w-full rounded-xl text-[0.95rem] font-semibold transition ${
              isSelected
                ? "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                : "bg-[#13b987] text-white hover:bg-[#0f996f]"
            }`}
          >
            {isSelected ? "Batal pilih" : "Pilih menu ini"}
          </button>
        </div>
      </div>
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
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white transition ${
        isSelected
          ? "border-[#13b987] ring-1 ring-[#13b987]"
          : isDisabled
            ? "border-neutral-200 opacity-50"
            : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
      }`}
    >
      <button type="button" onClick={() => onOpenDetail(recipe)} className="relative aspect-[4/3] w-full bg-neutral-100 text-left" aria-label={`Detail ${recipe.name}`}>
        <RecipeImage recipe={recipe} sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw" />
        {isSelected ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#13b987] px-2 py-0.5 text-xs font-semibold text-white">
            <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
            {portions} porsi
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">{recipe.name}</h3>
        <p className="mt-1 text-xs text-neutral-500">
          {recipe.calories} kkal · {recipe.protein} g protein
        </p>
        <button type="button" onClick={() => onOpenDetail(recipe)} className="mt-1 w-fit text-xs font-medium text-[#07845e] hover:underline">
          Lihat detail
        </button>

        <div className="mt-auto pt-3">
          {isSelected ? (
            <div className="flex items-center justify-between rounded-xl border border-neutral-200">
              <button
                type="button"
                aria-label="Kurangi porsi"
                onClick={() => onSelect(recipe.id, Math.max(0, portions - 1))}
                className="grid h-9 w-10 place-items-center text-neutral-700 transition hover:bg-neutral-50"
              >
                <Minus aria-hidden="true" className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-neutral-900">{portions}</span>
              <button
                type="button"
                aria-label="Tambah porsi"
                onClick={() => onSelect(recipe.id, Math.min(maxPortions, portions + 1))}
                disabled={portions >= maxPortions}
                className="grid h-9 w-10 place-items-center text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-30"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(recipe.id, 1)}
              className="h-9 w-full rounded-xl bg-[#13b987] text-sm font-semibold text-white transition hover:bg-[#0f996f] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              Pilih Menu Ini
            </button>
          )}
        </div>
      </div>
    </article>
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
              : "Gagal memuat menu mingguan";

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
          const addrJson = await addrRes.json();
          const addrData = Array.isArray(addrJson)
            ? addrJson
            : Array.isArray(addrJson?.data)
            ? addrJson.data
            : [];
          setAddresses(addrData);
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

  /** Fill every slot that is still short of portions, rotating recipes so the week is varied. */
  const handleAutoFill = useCallback(() => {
    const perMeal = Math.max(1, servingSize);
    setSelectedByDay((prev) => {
      const next = { ...prev };
      weeklyMenu.forEach((dayMenu, dayIdx) => {
        if (dayMenu.recipes.length === 0) return;
        const daySel: Partial<Record<MealType, RecipeSelection[]>> = {
          lunch: [...(prev[dayMenu.day]?.lunch ?? [])],
          dinner: [...(prev[dayMenu.day]?.dinner ?? [])],
        };
        mealTypes.forEach(({ key }, mealIdx) => {
          const list = daySel[key] ?? [];
          const missing = perMeal - list.reduce((n, sel) => n + sel.portions, 0);
          if (missing <= 0) return;
          const recipe = dayMenu.recipes[(dayIdx * 2 + mealIdx) % dayMenu.recipes.length];
          const existing = list.findIndex((sel) => sel.recipeId === recipe.id);
          if (existing >= 0) list[existing] = { ...list[existing], portions: list[existing].portions + missing };
          else list.push({ recipeId: recipe.id, portions: missing });
          daySel[key] = list;
        });
        next[dayMenu.day] = daySel;
      });
      return next;
    });
  }, [weeklyMenu, servingSize]);

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
      if (!weekStartDate) throw new Error("Tanggal awal pekan tidak ditemukan.");

      const response = await fetch("/api/subscriptions/weekly-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealSelections,
          weekStartDate: weekStartDate.toISOString(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) throw new Error(payload?.error ?? "Gagal menyimpan pilihan menu");

      router.push("/subscription/payment");
    } catch (err) {
      console.error("[save meal selections error]", err);
      setError(err instanceof Error ? err.message : "Gagal menyimpan pilihan menu");
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
      <CheckoutLayout step="Menu" width="xl" title="Pilih menu minggu ini">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-60 animate-pulse rounded-2xl bg-neutral-200/70" />
          ))}
        </div>
      </CheckoutLayout>
    );
  }

  if (error) {
    return (
      <CheckoutLayout step="Menu" title="Pilih menu minggu ini">
        <div className={`${cardClass} text-center`}>
          <p className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className={`${primaryButtonClass} mt-5`}>
            Coba lagi
          </button>
        </div>
      </CheckoutLayout>
    );
  }

  const activeDayLabel = daysOfWeek.find(({ key }) => key === activeDay)?.label;
  const activeDaySelections = selectedByDay[activeDay] || { lunch: [], dinner: [] };

  return (
    <CheckoutLayout
      step="Menu"
      width="xl"
      title="Pilih menu minggu ini"
      subtitle={`${weekRange.start} - ${weekRange.end} · ${servingSize} porsi untuk setiap makan siang dan makan malam`}
    >
      {/* Receipt modal */}
      {isReceiptModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsReceiptModalOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Ringkasan pesanan" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Ringkasan pesanan</h3>
                <p className="mt-1 text-sm text-neutral-500">Cek lagi menu pilihanmu sebelum bayar.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                aria-label="Tutup"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {receiptData.length === 0 ? (
                <p className="py-10 text-center text-neutral-500">Belum ada menu yang dipilih.</p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {receiptData.map((dayData) => (
                    <div key={dayData.dayLabel} className="grid gap-3 py-4 sm:grid-cols-[6rem_1fr_1fr]">
                      <p className="font-semibold text-neutral-900">{dayData.dayLabel}</p>
                      {(["lunch", "dinner"] as const).map((meal) => (
                        <div key={meal}>
                          <p className="text-xs font-medium text-neutral-400">{meal === "lunch" ? "Siang" : "Malam"}</p>
                          {dayData[meal].length === 0 ? (
                            <p className="text-sm text-neutral-400">Belum dipilih</p>
                          ) : (
                            dayData[meal].map((item, i) => (
                              <p key={i} className="text-sm text-neutral-700">
                                {item.name} <span className="text-neutral-400">x{item.portions}</span>
                              </p>
                            ))
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-600">
                <span className="font-semibold text-neutral-900">
                  {totalSelectedPortions}/{totalRequiredPortions}
                </span>{" "}
                porsi terpilih
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsReceiptModalOpen(false)} className={secondaryButtonClass}>
                  Tutup
                </button>
                <button type="button" disabled={!canContinue} onClick={handleContinue} className={primaryButtonClass}>
                  Lanjut bayar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailRecipe && (
        <DetailModal
          recipe={detailRecipe}
          isSelected={(currentMealSelections.find((s) => s.recipeId === detailRecipe.id)?.portions ?? 0) > 0}
          onClose={() => setDetailRecipe(null)}
          onToggleSelect={() => {
            const existing = currentMealSelections.find((s) => s.recipeId === detailRecipe.id);
            handleSelectRecipe(detailRecipe.id, existing && existing.portions > 0 ? 0 : 1);
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className={cardClass}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-neutral-900">
                {totalSelectedPortions}/{totalRequiredPortions} porsi
              </span>
              <span className="text-neutral-500">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-[#13b987] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>

            <ul className="mt-5 space-y-1">
              {daysOfWeek.map(({ key, label }, idx) => {
                const isActive = key === activeDay;
                const daySelections = selectedByDay[key] || { lunch: [], dinner: [] };
                const dayTotal =
                  (daySelections.lunch || []).reduce((acc, sel) => acc + sel.portions, 0) +
                  (daySelections.dinner || []).reduce((acc, sel) => acc + sel.portions, 0);
                const dayRequired = 2 * Math.max(1, servingSize);
                const done = dayTotal >= dayRequired;
                const dayDate = weeklyMenu[idx]?.date;
                const dayAddrLabel = getAddressLabel(addressSchedules[key]?.LUNCH, addresses);

                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setActiveDay(key)}
                      aria-current={isActive ? "true" : undefined}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        isActive ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className={`block text-xs ${isActive ? "text-white/70" : "text-neutral-500"}`}>
                          {dayDate ? dayDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : ""}
                          {dayAddrLabel ? ` · ${dayAddrLabel}` : ""}
                        </span>
                      </span>
                      {done ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#13b987] text-white">
                          <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className={`text-xs font-medium ${isActive ? "text-white/80" : "text-neutral-500"}`}>
                          {dayTotal}/{dayRequired}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Address per day */}
          <div className={cardClass}>
            {addresses.length === 0 ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-neutral-600">Belum ada alamat tersimpan.</p>
                <Link href="/subscription/delivery-address" className="text-sm font-semibold text-[#07845e] hover:underline">
                  Tambah
                </Link>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsAddressPanelOpen((v) => !v)}
                  aria-expanded={isAddressPanelOpen}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="flex items-center gap-2">
                    <MapPin aria-hidden="true" className="h-4 w-4 text-[#13b987]" />
                    <span>
                      <span className="block text-sm font-semibold text-neutral-900">Alamat per hari</span>
                      <span className="block text-xs text-neutral-500">{addressSummaryText || `${addresses.length} alamat tersimpan`}</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[#07845e]">{isAddressPanelOpen ? "Tutup" : "Atur"}</span>
                </button>

                {isAddressPanelOpen && (
                  <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
                    {daysOfWeek.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2">
                        <span className="w-14 shrink-0 text-xs font-medium text-neutral-600">{label}</span>
                        <select
                          value={addressSchedules[key]?.LUNCH ?? ""}
                          onChange={(e) => {
                            if (e.target.value) void handleAddressScheduleChange(key, e.target.value);
                          }}
                          disabled={isSavingSchedule}
                          className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-2 text-xs text-neutral-800 outline-none focus:border-[#13b987] disabled:opacity-50"
                        >
                          <option value="">Pilih alamat</option>
                          {addresses.map((addr) => (
                            <option key={addr.id} value={addr.id}>
                              {addr.label} ({addr.city})
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <Link href="/subscription/delivery-address" className="block pt-1 text-xs font-semibold text-[#07845e] hover:underline">
                      Tambah alamat
                    </Link>
                    {isSavingSchedule ? <p className="text-xs text-neutral-500">Menyimpan...</p> : null}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            {!canContinue ? (
              <button type="button" onClick={handleAutoFill} className={`${secondaryButtonClass} w-full`}>
                <Sparkles aria-hidden="true" className="h-4 w-4" />
                Pilihkan sisa menu otomatis
              </button>
            ) : null}
            <button type="button" onClick={() => setIsReceiptModalOpen(true)} className={`${secondaryButtonClass} w-full`}>
              Lihat ringkasan
            </button>
            <button type="button" disabled={!canContinue} onClick={handleContinue} className={`${primaryButtonClass} w-full`}>
              Lanjut Pembayaran
            </button>
            <Link href="/subscription/delivery-address" className="block pt-1 text-center text-sm text-neutral-500 hover:text-neutral-800">
              Kembali ke alamat
            </Link>
          </div>
        </aside>

        {/* ── Menu grid ───────────────────────────────────────── */}
        <section className="min-w-0">
          {menuUnavailableMessage ? (
            <div className={`${cardClass} py-16 text-center`}>
              <p className="text-lg font-semibold text-neutral-900">{menuUnavailableMessage}</p>
              <p className="mt-2 text-sm text-neutral-500">Ahli gizi kami sedang menyiapkan menu. Coba lagi nanti.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">{activeDayLabel}</h2>
                  <p className="text-sm text-neutral-500">
                    {activeMenuDay?.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
                <div className="inline-flex rounded-xl bg-neutral-100 p-1" role="tablist" aria-label="Waktu makan">
                  {mealTypes.map(({ key: mealKey, label: mealLabel }) => {
                    const mealTotal = (activeDaySelections[mealKey] || []).reduce((acc, sel) => acc + sel.portions, 0);
                    const active = activeMealType === mealKey;
                    return (
                      <button
                        key={mealKey}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveMealType(mealKey)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                        }`}
                      >
                        {mealLabel}
                        <span className={`ml-1.5 text-xs ${mealTotal >= servingSize ? "text-[#07845e]" : "text-neutral-400"}`}>
                          {mealTotal}/{servingSize}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                {(
                  [
                    { key: "all", label: `Semua (${activeMenuDay?.recipes.length ?? 0})` },
                    { key: "tinggi-protein", label: "Tinggi protein" },
                    { key: "rendah-karbo", label: "Rendah karbo" },
                    { key: "sup-hangat", label: "Sup" },
                  ] as Array<{ key: CategoryFilter; label: string }>
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategoryFilter(key)}
                    aria-pressed={categoryFilter === key}
                    className={`h-9 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition ${
                      categoryFilter === key
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filteredRecipes.length > 0 ? (
                  filteredRecipes.map((recipe) => {
                    const portions = currentMealSelections.find((sel) => sel.recipeId === recipe.id)?.portions ?? 0;
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
                  <p className="col-span-full py-12 text-center text-neutral-500">
                    {categoryFilter === "all" ? "Belum ada menu untuk hari ini." : "Tidak ada menu yang cocok dengan filter ini."}
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </CheckoutLayout>
  );
}
