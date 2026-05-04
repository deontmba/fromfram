"use client";

import Link from "next/link";
import { useState } from "react";

function LeafLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7 text-white">
      <path d="M20 4S13 3 8.5 7.5C5 11 5 16 5 16s5 0 8.5-3.5C18 8 20 4 20 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20c1.5-2.5 3.4-4.4 5.8-5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m22 7-10 6L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Email wajib diisi.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim permintaan.");
      } else {
        setMessage(data.message || "Link reset password telah dikirim ke email Anda.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]" />

      <section className="relative mx-auto mt-10 w-full max-w-[460px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-7 py-10 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8">
        <div className="mb-9 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#19ba89]">
              <LeafLogo />
            </div>
            <h1 className="text-4xl font-bold tracking-[-0.03em] text-[#13a981]">Lupa Password</h1>
          </div>
          <p className="text-[1.05rem] leading-snug text-neutral-500">
            Masukkan email Anda, dan kami akan mengirimkan link untuk mereset password Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block space-y-2">
            <span className="block text-[1.08rem] font-semibold text-neutral-800">Email Anda</span>
            <span className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-3 text-neutral-400 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)] transition focus-within:border-[#18b887] ${error ? "border-red-400" : "border-neutral-300"}`}>
              <MailIcon />
              <input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-[1.02rem] text-neutral-700 outline-none placeholder:text-neutral-400"
              />
            </span>
            {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          </label>

          {message && (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 border border-green-200">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-3 h-14 w-full rounded-2xl bg-[#1abb89] text-[1.15rem] font-bold text-white shadow-[0_8px_16px_rgba(18,168,123,0.35)] transition hover:bg-[#15a97b] disabled:opacity-60"
          >
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>
        </form>

        <div className="pt-7 text-center text-[1.1rem] text-neutral-500">
          <Link href="/login" className="font-bold text-[#11af82] transition hover:text-[#0e8e68]">
            Kembali ke halaman Login
          </Link>
        </div>
      </section>
    </main>
  );
}
