import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personalization | FromFram",
  description: "Sesuaikan preferensi makanan dan gaya hidupmu bersama FromFram.",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <OnboardingFlow />
    </main>
  );
}
