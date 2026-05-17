import { Role } from '@prisma/client';

export interface UserBasic {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface UserWithProfile extends UserBasic {
  createdAt: Date;
  nutritionalProfile: NutritionalProfileData | null;
  addresses: AddressSummary[];
}

export interface NutritionalProfileData {
  id?: string;
  weight: number;
  height: number;
  dailyCalorieNeed: number;
  allergies: string | null;
  medicalNotes?: string | null;
}

export interface AddressSummary {
  id: string;
  label: string;
  recipientName: string | null;
  phoneNumber: string | null;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string | null;
  isDefault: boolean;
}