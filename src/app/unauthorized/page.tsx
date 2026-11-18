import Link from "next/link";
import type { Metadata } from "next";
import { BrandMark } from "@/components/ui/brand-mark";

export const metadata: Metadata = {
  title: "Akses ditolak | FromFram",
};

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f7f7f5] px-5 py-6">
      <BrandMark />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0f8f69]">Akses ditolak</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900">Halaman ini bukan untuk akunmu</h1>
        <p className="mt-3 text-[0.95rem] leading-7 text-neutral-500">
          Halaman ini hanya bisa dibuka oleh tim FromFram. Kalau menurutmu ini keliru, coba masuk dengan akun lain.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#13b987] px-6 text-[0.95rem] font-semibold text-white transition hover:bg-[#0f996f]"
          >
            Ke dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-white px-6 text-[0.95rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Masuk dengan akun lain
          </Link>
        </div>
      </div>
    </main>
  );
}
