import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LANDING_ROUTES } from "@/lib/constants/landing";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasExistingSubscription(payload: unknown): boolean {
  if (payload === null || payload === undefined) return false;

  const subscription =
    isRecord(payload) && "data" in payload
      ? payload.data
      : isRecord(payload) && "subscription" in payload
        ? payload.subscription
        : payload;

  if (!isRecord(subscription)) return false;

  if (typeof subscription.id === "string" && subscription.id.trim().length > 0) {
    return true;
  }

  return ["planId", "plan", "status", "startDate", "endDate", "currentPeriodEnd"].some(
    (key) => subscription[key] !== null && subscription[key] !== undefined,
  );
}

export function useCtaNavigation() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const navigate = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setShowAlert(false);

    try {
      let authResponse: Response;

      try {
        authResponse = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
      } catch {
        setShowAlert(true);
        return;
      }

      const authData = await authResponse.json().catch(() => null);

      if (!authResponse.ok || !authData?.user?.id) {
        setShowAlert(true);
        return;
      }

      let subscriptionResponse: Response;

      try {
        subscriptionResponse = await fetch("/api/subscriptions/me", {
          cache: "no-store",
          credentials: "include",
        });
      } catch {
        router.push(LANDING_ROUTES.selectPlan);
        return;
      }

      if (subscriptionResponse.status === 404) {
        router.push(LANDING_ROUTES.selectPlan);
        return;
      }

      const subscriptionData = await subscriptionResponse.json().catch(() => null);

      if (!subscriptionResponse.ok) {
        router.push(LANDING_ROUTES.selectPlan);
        return;
      }

      router.push(
        hasExistingSubscription(subscriptionData)
          ? LANDING_ROUTES.dashboard
          : LANDING_ROUTES.selectPlan,
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, router]);

  return { navigate, isLoading, showAlert, setShowAlert };
}