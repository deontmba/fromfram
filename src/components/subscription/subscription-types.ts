export type SubscriptionPlanKey = "weekly" | "monthly" | "yearly";

export type SubscriptionStatusKey = "active" | "paused" | "cancelled" | "unknown";

export type FeedbackTone = "success" | "error" | "info";

export interface SubscriptionPlanOption {
  key: SubscriptionPlanKey;
  title: string;
  priceLabel: string;
  billingLabel: string;
  helperText: string;
  supportingText: string;
  badgeLabel?: string;
}

export interface PauseOption {
  weeks: number;
  label: string;
  description: string;
}

export interface FeedbackState {
  tone: FeedbackTone;
  message: string;
  note?: string;
}

export interface ManageSubscriptionViewModel {
  id: string | null;
  planKey: SubscriptionPlanKey;
  planLabel: string;
  priceLabel: string;
  billingLabel: string;
  status: SubscriptionStatusKey;
  statusLabel: string;
  servingCount: number;
  servingLabel: string;
  startDateLabel: string;
  nextBillingLabel: string;
  shippingAddressLabel: string;
  shippingAddressMissing: boolean;
  pausedUntilLabel: string | null;
  skippableWeeklyBoxId: string | null;
  isPreview: boolean;
}

export interface ApiActionResponse {
  message?: string;
  error?: string;
  note?: string;
  subscription?: unknown;
  resumeDate?: string;
  [key: string]: unknown;
}

export interface ApiRequestErrorPayload {
  error?: string;
  message?: string;
  note?: string;
  [key: string]: unknown;
}
