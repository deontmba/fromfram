
"use client";

import Link from "next/link";
import { useState } from "react";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m22 7-10 6L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M15 18 9 12l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengirim email");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6 flex flex-col justify-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]" />

      <div className="relative mx-auto mb-4 w-full max-w-[460px]">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-600 shadow-sm transition hover:bg-neutral-50"
        >
          <ArrowLeftIcon />
          Kembali ke Login
        </Link>
      </div>

      <section className="relative mx-auto w-full max-w-[460px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-7 py-10 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">Lupa Password?</h1>
          <p className="text-[1.05rem] text-neutral-500">
            Masukkan email yang terdaftar. Kami akan mengirimkan link untuk mereset password kamu.
          </p>
        </div>

        {success ? (
          <div className="rounded-2xl border border-[#a7e8d0] bg-[#eafff5] px-5 py-4 text-center">
            <p className="text-[1.05rem] font-bold text-[#0d7a56] mb-1">Email Terkirim! 🎉</p>
            <p className="text-sm text-[#12b886]">
              Silakan cek inbox atau folder spam email kamu untuk instruksi selanjutnya.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block space-y-2">
              <span className="block text-[1.08rem] font-semibold text-neutral-800">Email</span>
              <span className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-3 text-neutral-400 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)] transition focus-within:border-[#18b887] border-neutral-300`}>
                <MailIcon />
                <input
                  type="email"
                  placeholder="nama@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              disabled={loading || !email}
              className="mt-3 h-14 w-full rounded-2xl bg-[#1abb89] text-[1.15rem] font-bold text-white shadow-[0_8px_16px_rgba(18,168,123,0.35)] transition hover:bg-[#15a97b] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}