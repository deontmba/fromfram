import type { Metadata } from "next";
import { ManageSubscriptionScreen } from "@/components/subscription/manage-subscription-screen";

export const metadata: Metadata = {
  title: "Kelola Subscription | FromFram",
  description: "Manage active subscription, serving size, and subscription actions.",
};

export default function SubscriptionPage() {
  return <ManageSubscriptionScreen />;
}
