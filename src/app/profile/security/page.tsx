import Link from "next/link";

export default function ProfileSecurityPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]"
      />

      <section className="relative mx-auto w-full max-w-[700px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-5 py-6 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8 sm:py-8">
        <Link
          href="/profile"
          className="inline-flex h-11 items-center rounded-2xl border border-neutral-300 bg-white px-4 text-[1rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          Kembali
        </Link>

        <div className="mt-6 rounded-[18px] border border-black/5 bg-white px-6 py-6 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold text-[#11af82]">Settings</p>
          <h1 className="mt-2 text-[1.6rem] font-bold tracking-[-0.02em] text-neutral-900">
            Privacy & security
          </h1>
          <div className="mt-4 space-y-4 text-[1rem] leading-7 text-neutral-600">
            <p>Langkah lanjutan yang masuk akal: ubah password, lihat sesi aktif, dan atur 2FA.</p>
            <p>Untuk sekarang, route ini tetap sederhana dan jelas saat dibuka dari halaman profile.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
