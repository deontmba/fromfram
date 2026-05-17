export interface WeeklyMenuData {
  id: string;
  recipeId: string;
  weekStartDate: Date;
}

export interface WeeklyMenuGrouped {
  weekStartDate: string;
  weekEndDate: string;
  isActiveWeek: boolean;
  menus: Array<{
    id: string;
    recipeName: string;
    calories: number;
    protein: number;
    suitableGoals: string[];
  }>;
}