"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LeafLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7 text-white">
      <path d="M20 4S13 3 8.5 7.5C5 11 5 16 5 16s5 0 8.5-3.5C18 8 20 4 20 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20c1.5-2.5 3.4-4.4 5.8-5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

import { Suspense } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token reset password tidak ditemukan.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (!password || !confirmPassword) {
      setError("Kedua kolom password wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mereset password.");
      } else {
        setMessage("Password Anda berhasil direset!");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative mx-auto mt-10 w-full max-w-[460px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-7 py-10 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8">
      <div className="mb-9 flex flex-col items-center text-center">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[#19ba89]">
            <LeafLogo />
          </div>
          <h1 className="text-4xl font-bold tracking-[-0.03em] text-[#13a981]">Buat Password Baru</h1>
        </div>
        <p className="text-[1.05rem] leading-snug text-neutral-500">
          Silakan masukkan password baru Anda di bawah ini.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block space-y-2">
          <span className="block text-[1.08rem] font-semibold text-neutral-800">Password Baru</span>
          <span className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-3 text-neutral-400 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)] transition focus-within:border-[#18b887] ${error && error.includes("karakter") ? "border-red-400" : "border-neutral-300"}`}>
            <LockIcon />
            <input
              type="password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-[1.02rem] text-neutral-700 outline-none placeholder:text-neutral-400"
            />
          </span>
        </label>

        <label className="block space-y-2">
          <span className="block text-[1.08rem] font-semibold text-neutral-800">Konfirmasi Password</span>
          <span className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-3 text-neutral-400 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)] transition focus-within:border-[#18b887] ${error && error.includes("cocok") ? "border-red-400" : "border-neutral-300"}`}>
            <LockIcon />
            <input
              type="password"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent text-[1.02rem] text-neutral-700 outline-none placeholder:text-neutral-400"
            />
          </span>
        </label>

        {error && <p className="text-sm font-medium text-red-500">{error}</p>}

        {message && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 border border-green-200">
            {message} Mengarahkan ke halaman login...
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !token}
          className="mt-3 h-14 w-full rounded-2xl bg-[#1abb89] text-[1.15rem] font-bold text-white shadow-[0_8px_16px_rgba(18,168,123,0.35)] transition hover:bg-[#15a97b] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Memproses..." : "Simpan Password Baru"}
        </button>
      </form>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]" />
      <Suspense fallback={<div className="text-center mt-20">Memuat...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
