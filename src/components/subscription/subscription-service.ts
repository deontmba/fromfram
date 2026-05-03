const SUBSCRIPTION_BASE_PATH = "/api/subscriptions/me";
const SUBSCRIPTION_COLLECTION_PATH = "/api/subscriptions";

export type MealCategory = "basic" | "fitness" | "diet";
export type ApiPlanType = "MINGGUAN" | "BULANAN" | "TAHUNAN";

type ApiActionResponse = {
  message?: string;
  error?: string;
  note?: string;
  subscription?: unknown;
  resumeDate?: string;
  [key: string]: unknown;
};

type ApiRequestErrorPayload = {
  error?: string;
  message?: string;
  note?: string;
  [key: string]: unknown;
};

export class ApiRequestError extends Error {
  status: number;
  payload: ApiRequestErrorPayload | null;

  constructor(message: string, status: number, payload: ApiRequestErrorPayload | null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

type SubscriptionCollectionItem = {
  goal?: {
    id?: string;
    name?: string;
  };
};

type GoalCollectionItem = {
  id?: string;
  name?: string;
};

type EnsureSubscriptionPayload = {
  mealCategory: MealCategory;
  planType: ApiPlanType;
  servings: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildErrorMessage(payload: unknown, fallbackMessage: string) {
  if (isRecord(payload)) {
    const message =
      (typeof payload.error === "string" && payload.error) ||
      (typeof payload.message === "string" && payload.message) ||
      fallbackMessage;

    return message;
  }

  return fallbackMessage;
}

async function requestJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as T | ApiRequestErrorPayload | null;

  if (!response.ok) {
    throw new ApiRequestError(
      buildErrorMessage(payload, `Request failed with status ${response.status}`),
      response.status,
      isRecord(payload) ? payload : null,
    );
  }

  return payload as T;
}

function buildResumeDate(weeks: number) {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + weeks * 7);
  return nextDate.toISOString();
}

export async function getMySubscription(signal?: AbortSignal) {
  return requestJson<unknown>(SUBSCRIPTION_BASE_PATH, {
    method: "GET",
    signal,
  });
}

export async function createMySubscription(payload: {
  goalId: string;
  planType: ApiPlanType;
  servings: number;
}) {
  return requestJson<unknown>(SUBSCRIPTION_COLLECTION_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function pauseMySubscription(weeks: number) {
  return requestJson<ApiActionResponse>(`${SUBSCRIPTION_BASE_PATH}/pause`, {
    method: "PATCH",
    body: JSON.stringify({
      resumeDate: buildResumeDate(weeks),
    }),
  });
}

export async function updateMySubscription(payload: {
  goalId: string;
  planType: ApiPlanType;
  servings: number;
}) {
  return requestJson<ApiActionResponse>(SUBSCRIPTION_BASE_PATH, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function resumeMySubscription() {
  return requestJson<ApiActionResponse>(`${SUBSCRIPTION_BASE_PATH}/resume`, {
    method: "PATCH",
  });
}

export async function cancelMySubscription() {
  return requestJson<ApiActionResponse>(`${SUBSCRIPTION_BASE_PATH}/cancel`, {
    method: "PATCH",
  });
}

export async function skipWeeklyBox(weeklyBoxId: string) {
  return requestJson<ApiActionResponse>(`/api/weekly-boxes/${weeklyBoxId}/skip`, {
    method: "PATCH",
  });
}

function normalizeText(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function extractGoalsFromSubscriptions(payload: unknown) {
  if (!isRecord(payload)) {
    return [] as Array<{ id: string; name: string }>;
  }

  const candidates = Array.isArray(payload.data)
    ? (payload.data as SubscriptionCollectionItem[])
    : [];
  const directGoals = Array.isArray(payload.goals)
    ? (payload.goals as GoalCollectionItem[])
    : [];

  const goalsMap = new Map<string, string>();

  for (const goal of directGoals) {
    if (typeof goal.id === "string" && goal.id.length > 0 && typeof goal.name === "string") {
      goalsMap.set(goal.id, goal.name);
    }
  }

  for (const candidate of candidates) {
    const goalId = candidate?.goal?.id;
    const goalName = candidate?.goal?.name;

    if (typeof goalId === "string" && goalId.length > 0 && typeof goalName === "string") {
      goalsMap.set(goalId, goalName);
    }
  }

  return Array.from(goalsMap.entries()).map(([id, name]) => ({ id, name }));
}

function pickGoalIdByCategory(
  goals: Array<{ id: string; name: string }>,
  mealCategory: MealCategory,
) {
  const keywordByCategory: Record<MealCategory, string[]> = {
    basic: ["maintain", "maintenance", "maintain berat", "maintain berat badan"],
    fitness: ["bulking", "atlet", "athlete", "muscle"],
    diet: ["diet", "penurunan", "turun berat", "weight loss"],
  };

  const keywords = keywordByCategory[mealCategory];

  for (const goal of goals) {
    const goalName = normalizeText(goal.name);
    if (keywords.some((keyword) => goalName.includes(keyword))) {
      return goal.id;
    }
  }

  return goals[0]?.id ?? null;
}

async function getAllSubscriptions() {
  return requestJson<unknown>(SUBSCRIPTION_COLLECTION_PATH, {
    method: "GET",
  });
}

async function resolveGoalIdForCategory(mealCategory: MealCategory) {
  const subscriptionsPayload = await getAllSubscriptions();
  const goals = extractGoalsFromSubscriptions(subscriptionsPayload);

  if (!goals.length) {
    return null;
  }

  return pickGoalIdByCategory(goals, mealCategory);
}

export async function ensureMySubscription(payload: EnsureSubscriptionPayload) {
  const goalId = await resolveGoalIdForCategory(payload.mealCategory);
  if (!goalId) {
    throw new Error("Goal belum tersedia. Hubungi admin untuk menyiapkan goal subscription.");
  }

  try {
    await getMySubscription();
    await updateMySubscription({
      goalId,
      planType: payload.planType,
      servings: payload.servings,
    });

    return {
      created: false,
      updated: true,
    };
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 404) {
      throw error;
    }
  }

  await createMySubscription({
    goalId,
    planType: payload.planType,
    servings: payload.servings,
  });

  return {
    created: true,
  };
}
