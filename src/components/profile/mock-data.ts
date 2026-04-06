export type ProfileDetails = {
  fullName: string;
  email: string;
  phoneNumber: string;
  memberLabel: string;
  joinedAt: string;
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
  recipientName: string;
  phoneNumber: string;
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
  phoneNumber: "+62 812 3456 7890",
  memberLabel: "Premium Member",
  joinedAt: "Joined Oct 2023",
};

export const healthMockData: HealthProfile = {
  weight: "65",
  height: "168",
  allergies: "Kacang, Seafood",
  medicalNotes: "Kurangi gula dan hindari makanan terlalu pedas pada malam hari.",
  goals: "Weight Loss",
  dietPreference: "Rendah Karbohidrat",
};

export const addressMockData: Address[] = [
  {
    id: "home-address",
    label: "Rumah",
    recipientName: "Aisha Rahman",
    phoneNumber: "+62 812 3456 7890",
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
    recipientName: "Aisha Rahman",
    phoneNumber: "+62 812 3456 7890",
    street: "Gedung Karya Lt. 5, Jl. MH Thamrin",
    city: "Jakarta Pusat",
    province: "DKI Jakarta",
    postalCode: "10350",
    notes: "Titip ke resepsionis saat jam kerja.",
    isDefault: false,
  },
];

export function getEmptyAddressDraft(profile = profileMockData): AddressDraft {
  return {
    label: "",
    recipientName: profile.fullName,
    phoneNumber: profile.phoneNumber,
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
