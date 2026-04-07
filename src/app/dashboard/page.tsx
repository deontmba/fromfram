"use client";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#eceded]">
      <h1 className="text-3xl font-bold text-[#13a981]">Logged in</h1>
      <button
        onClick={handleLogout}
        className="rounded-xl bg-[#1abb89] px-6 py-3 font-semibold text-white hover:bg-[#15a97b]"
      >
        Logout
      </button>
    </main>
  );
}