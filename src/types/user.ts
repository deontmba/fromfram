export interface NutritionalProfileData {
  id?: string;
  weight: number;
  height: number;
  dailyCalorieNeed: number;
  allergies: string | null;
  medicalNotes?: string | null;
}
