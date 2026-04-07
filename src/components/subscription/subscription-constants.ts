import {
  PauseOption,
  SubscriptionPlanKey,
  SubscriptionPlanOption,
} from "@/components/subscription/subscription-types";

export const DEFAULT_PREVIEW_PLAN: SubscriptionPlanKey = "monthly";
export const DEFAULT_PREVIEW_SERVINGS = 2;

export const PLAN_OPTIONS: SubscriptionPlanOption[] = [
  {
    key: "weekly",
    title: "Mingguan",
    priceLabel: "Rp 350.000",
    billingLabel: "/minggu",
    helperText: "Fleksibel",
    supportingText: "Bisa cancel kapan saja",
  },
  {
    key: "monthly",
    title: "Bulanan",
    priceLabel: "Rp 1.200.000",
    billingLabel: "/bulan",
    helperText: "Aktif saat ini",
    supportingText: "Pilihan paling praktis",
  },
  {
    key: "yearly",
    title: "Tahunan",
    priceLabel: "Rp 12.000.000",
    billingLabel: "/tahun",
    helperText: "Hemat 29%",
    supportingText: "Best value untuk jangka panjang",
    badgeLabel: "Hemat",
  },
];

export const SERVING_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export const PAUSE_OPTIONS: PauseOption[] = [
  {
    weeks: 1,
    label: "1 minggu",
    description: "Lanjut lagi minggu depan.",
  },
  {
    weeks: 2,
    label: "2 minggu",
    description: "Jeda singkat sampai dua minggu.",
  },
  {
    weeks: 3,
    label: "3 minggu",
    description: "Pause lebih lama tanpa kehilangan langganan.",
  },
  {
    weeks: 4,
    label: "4 minggu",
    description: "Batas maksimum pause sesuai aturan backend.",
  },
];
