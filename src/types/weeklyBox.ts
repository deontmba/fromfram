import { BoxStatus, DayOfWeek } from '@prisma/client';

export interface MealSelectionData {
  id: string;
  dayOfWeek: DayOfWeek;
  recipe: {
    id: string;
    name: string;
    description: string;
    calories: number;
    protein: number;
    imageUrl: string | null;
  };
}

export interface WeeklyBoxSummary {
  totalDays: number;
  selectedDays: number;
  remainingDays: number;
  canSelectMenu: boolean;
}

export interface WeeklyBoxData {
  id: string;
  weekStartDate: Date;
  weekEndDate: Date;
  selectionDeadline: Date;
  isAutoSelected: boolean;
  status: BoxStatus;
  mealSelections: MealSelectionData[];
  summary?: WeeklyBoxSummary;
}