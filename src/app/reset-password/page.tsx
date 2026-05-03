// src/app/reset-password/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-500 font-medium mb-4">Token tidak ditemukan.</p>
        <Link href="/forgot-password" className="text-[#13af82] font-semibold">Request ulang link reset</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      return setError("Password minimal 8 karakter.");
    }
    if (password !== confirmPassword) {
      return setError("Konfirmasi password tidak cocok.");
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mereset password");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="rounded-2xl border border-[#a7e8d0] bg-[#eafff5] px-5 py-4">
          <p className="text-[1.05rem] font-bold text-[#0d7a56]">Password Berhasil Diubah! 🎉</p>
          <p className="text-sm text-[#12b886] mt-1">Kamu akan diarahkan ke halaman login...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block space-y-2">
        <span className="block text-[1.08rem] font-semibold text-neutral-800">Password Baru</span>
        <span className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-3 text-neutral-400 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)] transition focus-within:border-[#18b887] border-neutral-300`}>
          <LockIcon />
          <input
            type="password"
            placeholder="Minimal 8 karakter"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent text-[1.02rem] text-neutral-700 outline-none placeholder:text-neutral-400"
          />
        </span>
      </label>

      <label className="block space-y-2">
        <span className="block text-[1.08rem] font-semibold text-neutral-800">Konfirmasi Password Baru</span>
        <span className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-3 text-neutral-400 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)] transition focus-within:border-[#18b887] border-neutral-300`}>
          <LockIcon />
          <input
            type="password"
            placeholder="Ulangi password baru"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-transparent text-[1.02rem] text-neutral-700 outline-none placeholder:text-neutral-400"
          />
        </span>
      </label>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-3 h-14 w-full rounded-2xl bg-[#1abb89] text-[1.15rem] font-bold text-white shadow-[0_8px_16px_rgba(18,168,123,0.35)] transition hover:bg-[#15a97b] active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "Menyimpan..." : "Simpan Password Baru"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6 flex flex-col justify-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]" />

      <section className="relative mx-auto w-full max-w-[460px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-7 py-10 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">Buat Password Baru</h1>
          <p className="text-[1.05rem] text-neutral-500">
            Pastikan password baru kamu mudah diingat namun sulit ditebak oleh orang lain.
          </p>
        </div>

        <Suspense fallback={<p className="text-center text-neutral-500">Memuat data...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}