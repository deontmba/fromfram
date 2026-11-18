export type DeliveryStatusTone = "active" | "scheduled" | "completed";

export type DeliveryTimelineState = "completed" | "current" | "upcoming";

export type DeliveryTimelineStep = {
  id: string;
  label: string;
  timeLabel: string;
  state: DeliveryTimelineState;
};

export type DeliverySummaryItem = {
  id: string;
  dayLabel: string;
  dateLabel: string;
  menuName: string;
  mealType?: string;
  statusLabel: string;
  statusTone: DeliveryStatusTone;
};

export type ActiveDelivery = DeliverySummaryItem & {
  addressLabel: string;
  etaTitle: string;
  etaWindow: string;
  timeline: DeliveryTimelineStep[];
};

export type DeliveryTrackingViewModel = {
  periodLabel: string;
  todayDelivery: ActiveDelivery | null;
  upcomingDeliveries: DeliverySummaryItem[];
  recentDeliveries: DeliverySummaryItem[];
  infoBullets: string[];
  emptyStateTitle: string;
  emptyStateDescription: string;
  errorMessage?: string;
};
