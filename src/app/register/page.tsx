import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthScreen mode="signup" />
    </Suspense>
  );
}