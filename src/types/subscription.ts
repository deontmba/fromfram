import { PlanType, SubscriptionStatus } from '@prisma/client';

export interface GoalData {
  id: string;
  name: string;
  description: string;
  minCalories: number;
  maxCalories: number;
}

export interface SubscriptionData {
  id: string;
  planType: PlanType;
  servings: number;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  pausedUntil: Date | null;
  goal: GoalData;
}