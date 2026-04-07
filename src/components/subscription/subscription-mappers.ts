import {
  DEFAULT_PREVIEW_PLAN,
  DEFAULT_PREVIEW_SERVINGS,
  PLAN_OPTIONS,
} from "@/components/subscription/subscription-constants";
import {
  ManageSubscriptionViewModel,
  SubscriptionPlanKey,
  SubscriptionStatusKey,
} from "@/components/subscription/subscription-types";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmedValue = value.trim();

      if (trimmedValue) {
        return trimmedValue;
      }
    }
  }

  return null;
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const normalizedValue = value.replace(/[^\d.-]/g, "");
      const parsedValue = Number.parseFloat(normalizedValue);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return null;
}

function getNestedValue(record: Record<string, unknown>, path: string[]) {
  let currentValue: unknown = record;

  for (const key of path) {
    if (!isRecord(currentValue) || !(key in currentValue)) {
      return null;
    }

    currentValue = currentValue[key];
  }

  return currentValue;
}

function getPlanOption(planKey: SubscriptionPlanKey) {
  return PLAN_OPTIONS.find((plan) => plan.key === planKey) ?? PLAN_OPTIONS[1];
}

function normalizePlanKey(value: unknown): SubscriptionPlanKey | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["mingguan", "weekly", "week"].includes(normalizedValue)) {
    return "weekly";
  }

  if (["bulanan", "monthly", "month"].includes(normalizedValue)) {
    return "monthly";
  }

  if (["tahunan", "yearly", "annual", "year"].includes(normalizedValue)) {
    return "yearly";
  }

  return null;
}

function normalizeStatus(value: unknown): SubscriptionStatusKey {
  if (typeof value !== "string") {
    return "unknown";
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "active") {
    return "active";
  }

  if (normalizedValue === "paused") {
    return "paused";
  }

  if (["cancelled", "canceled"].includes(normalizedValue)) {
    return "cancelled";
  }

  return "unknown";
}

function getStatusLabel(status: SubscriptionStatusKey) {
  if (status === "active") {
    return "ACTIVE";
  }

  if (status === "paused") {
    return "PAUSED";
  }

  if (status === "cancelled") {
    return "CANCELLED";
  }

  return "UNKNOWN";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateLabel(value: unknown, fallback = "Belum tersedia") {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return fallback;
  }

  const dateValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return fallback;
  }

  return dateFormatter.format(dateValue);
}

function addBillingCycle(startDate: Date, planKey: SubscriptionPlanKey) {
  const nextDate = new Date(startDate);

  if (planKey === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
    return nextDate;
  }

  if (planKey === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }

  nextDate.setFullYear(nextDate.getFullYear() + 1);
  return nextDate;
}

function unwrapSubscriptionPayload(payload: unknown) {
  const rootRecord = toRecord(payload);

  if (!rootRecord) {
    return {};
  }

  const subscriptionRecord = toRecord(rootRecord.subscription);

  if (subscriptionRecord) {
    return subscriptionRecord;
  }

  const dataRecord = toRecord(rootRecord.data);

  if (dataRecord) {
    const nestedSubscriptionRecord = toRecord(dataRecord.subscription);

    if (nestedSubscriptionRecord) {
      return nestedSubscriptionRecord;
    }

    return dataRecord;
  }

  return rootRecord;
}

function extractAddressLabel(record: Record<string, unknown>) {
  const addressCandidates = [
    record.shippingAddress,
    record.address,
    record.deliveryAddress,
    getNestedValue(record, ["user", "defaultAddress"]),
    getNestedValue(record, ["user", "address"]),
  ];

  for (const candidate of addressCandidates) {
    if (typeof candidate === "string") {
      const trimmedCandidate = candidate.trim();

      if (trimmedCandidate) {
        return trimmedCandidate;
      }
    }

    const addressRecord = toRecord(candidate);

    if (!addressRecord) {
      continue;
    }

    const joinedAddress = [
      pickString(addressRecord.label),
      pickString(
        addressRecord.street,
        addressRecord.addressLine1,
        addressRecord.address,
        addressRecord.line1,
      ),
      pickString(addressRecord.city),
      pickString(addressRecord.province, addressRecord.state),
      pickString(addressRecord.postalCode, addressRecord.zipCode),
    ]
      .filter(Boolean)
      .join(", ");

    if (joinedAddress) {
      return joinedAddress;
    }
  }

  return "Alamat belum tersedia";
}

function extractSkippableWeeklyBoxId(record: Record<string, unknown>) {
  const directId = pickString(
    record.skippableWeeklyBoxId,
    record.weeklyBoxId,
    record.currentWeeklyBoxId,
    record.nextWeeklyBoxId,
    getNestedValue(record, ["weeklyBox", "id"]),
    getNestedValue(record, ["nextWeeklyBox", "id"]),
  );

  if (directId) {
    return directId;
  }

  const weeklyBoxes = Array.isArray(record.weeklyBoxes) ? record.weeklyBoxes : [];

  for (const weeklyBox of weeklyBoxes) {
    const weeklyBoxRecord = toRecord(weeklyBox);

    if (!weeklyBoxRecord) {
      continue;
    }

    const weeklyBoxStatus = pickString(weeklyBoxRecord.status)?.toLowerCase();

    if (!weeklyBoxStatus || ["pending_selection", "selection_locked", "pending"].includes(weeklyBoxStatus)) {
      return pickString(weeklyBoxRecord.id);
    }
  }

  return null;
}

export function createPreviewSubscriptionViewModel(): ManageSubscriptionViewModel {
  const planOption = getPlanOption(DEFAULT_PREVIEW_PLAN);

  return {
    id: null,
    planKey: DEFAULT_PREVIEW_PLAN,
    planLabel: `${planOption.title} Plan`,
    priceLabel: planOption.priceLabel,
    billingLabel: planOption.billingLabel,
    status: "active",
    statusLabel: "ACTIVE",
    servingCount: DEFAULT_PREVIEW_SERVINGS,
    servingLabel: `${DEFAULT_PREVIEW_SERVINGS} orang`,
    startDateLabel: "6 Mar 2026",
    nextBillingLabel: "6 Apr 2026",
    shippingAddressLabel: "Jl. Sudirman No. 123, Jakarta Selatan, DKI Jakarta 12190",
    shippingAddressMissing: false,
    pausedUntilLabel: null,
    skippableWeeklyBoxId: null,
    isPreview: true,
  };
}

export function mapSubscriptionResponseToViewModel(payload: unknown): ManageSubscriptionViewModel {
  const record = unwrapSubscriptionPayload(payload);
  const inferredPlanKey =
    normalizePlanKey(
      pickString(
        record.planType,
        record.planName,
        record.plan,
        getNestedValue(record, ["plan", "type"]),
        getNestedValue(record, ["plan", "name"]),
      ),
    ) ?? DEFAULT_PREVIEW_PLAN;
  const planOption = getPlanOption(inferredPlanKey);
  const formattedPrice =
    pickNumber(
      record.price,
      record.amount,
      record.totalPrice,
      getNestedValue(record, ["plan", "price"]),
    ) ?? null;
  const servingCount =
    pickNumber(
      record.servings,
      record.servingSize,
      record.servingCount,
      getNestedValue(record, ["plan", "servings"]),
    ) ?? DEFAULT_PREVIEW_SERVINGS;
  const status = normalizeStatus(record.status);
  const startDateValue = pickString(
    record.startDate,
    record.startedAt,
    record.createdAt,
    getNestedValue(record, ["dates", "start"]),
  );
  const nextBillingValue = pickString(
    record.nextBillingDate,
    record.nextBillingAt,
    record.renewalDate,
    record.endDate,
    getNestedValue(record, ["dates", "nextBilling"]),
  );
  const pausedUntilValue = pickString(record.pausedUntil, record.resumeDate);
  const startDate = startDateValue ? new Date(startDateValue) : null;
  const inferredNextBillingDate =
    nextBillingValue ||
    (startDate && !Number.isNaN(startDate.getTime())
      ? addBillingCycle(startDate, inferredPlanKey).toISOString()
      : null);
  const shippingAddressLabel = extractAddressLabel(record);

  return {
    id: pickString(record.id),
    planKey: inferredPlanKey,
    planLabel: pickString(record.planLabel, record.planName) ?? `${planOption.title} Plan`,
    priceLabel: formattedPrice ? formatCurrency(formattedPrice) : planOption.priceLabel,
    billingLabel: planOption.billingLabel,
    status,
    statusLabel: getStatusLabel(status),
    servingCount,
    servingLabel: `${servingCount} orang`,
    startDateLabel: formatDateLabel(startDateValue),
    nextBillingLabel: formatDateLabel(inferredNextBillingDate),
    shippingAddressLabel,
    shippingAddressMissing: shippingAddressLabel === "Alamat belum tersedia",
    pausedUntilLabel: pausedUntilValue ? formatDateLabel(pausedUntilValue) : null,
    skippableWeeklyBoxId: extractSkippableWeeklyBoxId(record),
    isPreview: false,
  };
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Terjadi kesalahan yang belum teridentifikasi.";
}
