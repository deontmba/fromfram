import type { Metadata } from "next";
import { ManageSubscriptionScreen } from "@/components/subscription/manage-subscription-screen";

export const metadata: Metadata = {
  title: "Kelola Langganan | FromFram",
  description: "Kelola paket, jeda, atau berhenti berlangganan.",
};

export default function SubscriptionPage() {
  return <ManageSubscriptionScreen />;
}
