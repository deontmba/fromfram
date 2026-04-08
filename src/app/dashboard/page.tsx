"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Member");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok || !isMounted) {
          return;
        }

        setUserName(data.user?.name ?? "Member");
        setUserEmail(data.user?.email ?? "");
      } catch {
        // Dashboard tetap bisa dirender meskipun request profil gagal.
      }
    }

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const cards = [
    {
      href: "/subscription/select-plan",
      title: "Buat Subscription",
      description: "Mulai langganan baru dengan memilih meal category, durasi, dan servings.",
    },
    {
      href: "/subscription",
      title: "Kelola Subscription",
      description: "Pause, resume, skip weekly box, atau atur status langganan aktif.",
    },
    {
      href: "/profile",
      title: "Kelola Profil",
      description: "Lihat halaman profile, kesehatan, alamat, serta pengaturan akun.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-4 py-8 text-zinc-900 md:px-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#14b885] via-[#58d49f] to-[#d8f8ea] p-8 text-white shadow-[0_24px_52px_rgba(16,185,129,0.2)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Dashboard</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em]">
                Selamat datang, {userName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
                {userEmail
                  ? `Akun aktif: ${userEmail}.`
                  : "Gunakan dashboard ini untuk masuk ke flow subscription dan profile."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-white/30 bg-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Homepage
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-[1.6rem] border border-zinc-200 bg-white p-6 shadow-[0_16px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-emerald-200"
            >
              <p className="text-xl font-semibold text-zinc-900">{card.title}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{card.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
