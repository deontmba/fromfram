export type ProfileDetails = {
  fullName: string;
  email: string;
  phoneNumber: string;
  memberLabel: string;
  joinedAt: string;
  gender: string;
  age: string;
  isSubscribed: boolean;
  avatarUrl?: string;
};

export type HealthProfile = {
  weight: string;
  height: string;
  allergies: string;
  medicalNotes: string;
  goals: string;
  dietPreference: string;
};

export type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
  isDefault: boolean;
};

export type AddressDraft = Omit<Address, "id">;

export const profileMockData: ProfileDetails = {
  fullName: "Aisha Rahman",
  email: "aisha@example.com",
  phoneNumber: "",
  memberLabel: "Reguler",
  joinedAt: "Joined Oct 2023",
  gender: "",
  age: "",
  isSubscribed: false,
};

export const healthMockData: HealthProfile = {
  weight: "",
  height: "",
  allergies: "",
  medicalNotes: "",
  goals: "",
  dietPreference: "",
};

export const addressMockData: Address[] = [
  {
    id: "home-address",
    label: "Rumah",
    street: "Jl. Sudirman No. 123, Lt. 2",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    postalCode: "12190",
    notes: "Dekat lobi utama, hubungi sebelum sampai.",
    isDefault: true,
  },
  {
    id: "office-address",
    label: "Kantor",
    street: "Gedung Karya Lt. 5, Jl. MH Thamrin",
    city: "Jakarta Pusat",
    province: "DKI Jakarta",
    postalCode: "10350",
    notes: "Titip ke resepsionis saat jam kerja.",
    isDefault: false,
  },
];

export function getEmptyAddressDraft(): AddressDraft {
  return {
    label: "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    notes: "",
    isDefault: false,
  };
}

export function createAddressId() {
  return `address-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function calculateBmi(weight: string, height: string) {
  const weightValue = Number.parseFloat(weight);
  const heightValue = Number.parseFloat(height);

  if (!weightValue || !heightValue) {
    return {
      value: "0.0",
      label: "Belum lengkap",
    };
  }

  const heightInMeters = heightValue / 100;
  const bmiValue = weightValue / (heightInMeters * heightInMeters);

  if (bmiValue < 18.5) {
    return { value: bmiValue.toFixed(1), label: "Underweight" };
  }

  if (bmiValue < 25) {
    return { value: bmiValue.toFixed(1), label: "Normal" };
  }

  if (bmiValue < 30) {
    return { value: bmiValue.toFixed(1), label: "Overweight" };
  }

  return { value: bmiValue.toFixed(1), label: "Obese" };
}
