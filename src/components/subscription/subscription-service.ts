const SUBSCRIPTION_BASE_PATH = "/api/subscriptions/me";
const SUBSCRIPTION_COLLECTION_PATH = "/api/subscriptions";

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

class ApiRequestError extends Error {
  status: number;
  payload: ApiRequestErrorPayload | null;

  constructor(message: string, status: number, payload: ApiRequestErrorPayload | null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

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
  mealCategory: "basic" | "fitness" | "diet";
  planType: "MINGGUAN" | "BULANAN" | "TAHUNAN";
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
  planType: "MINGGUAN" | "BULANAN" | "TAHUNAN";
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
