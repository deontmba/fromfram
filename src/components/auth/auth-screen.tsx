import Link from "next/link";
import type { ReactNode } from "react";

type AuthMode = "signup" | "login";

type AuthScreenProps = {
  mode: AuthMode;
};

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M4 4h16v16H4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m22 7-10 6L2 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LeafLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7 text-white">
      <path
        d="M20 4S13 3 8.5 7.5C5 11 5 16 5 16s5 0 8.5-3.5C18 8 20 4 20 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20c1.5-2.5 3.4-4.4 5.8-5.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InputField({
  label,
  placeholder,
  icon,
  type = "text",
}: {
  label: string;
  placeholder: string;
  icon: ReactNode;
  type?: "text" | "email" | "password";
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-[1.08rem] font-semibold text-neutral-800">{label}</span>
      <span className="flex h-14 items-center gap-3 rounded-2xl border border-neutral-300 bg-white px-3 text-neutral-400 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)] transition focus-within:border-[#18b887]">
        {icon}
        <input
          type={type}
          placeholder={placeholder}
          className="w-full bg-transparent text-[1.02rem] text-neutral-700 outline-none placeholder:text-neutral-400"
        />
      </span>
    </label>
  );
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const isSignup = mode === "signup";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]"
      />

      <section className="relative mx-auto w-full max-w-[460px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-7 py-10 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8">
        <div className="mb-9 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#19ba89]">
              <LeafLogo />
            </div>
            <h1 className="text-5xl font-bold tracking-[-0.03em] text-[#13a981]">FromFram</h1>
          </div>
          <p className="text-[1.1rem] leading-none text-neutral-500">
            Fresh meals, delivered daily
          </p>
        </div>

        <form className="space-y-5">
          {isSignup ? (
            <InputField
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              icon={<UserIcon />}
            />
          ) : null}

          <InputField
            label="Email"
            type="email"
            placeholder="nama@email.com"
            icon={<MailIcon />}
          />

          <InputField
            label="Password"
            type="password"
            placeholder={isSignup ? "Minimal 8 karakter" : "Masukkan password"}
            icon={<LockIcon />}
          />

          {!isSignup ? (
            <div className="flex items-center justify-between pt-1 text-[1.05rem]">
              <label className="inline-flex items-center gap-2 text-neutral-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-400 accent-[#1abb89]"
                />
                <span className="font-semibold">Ingat saya</span>
              </label>
              <button
                type="button"
                className="font-semibold text-[#13af82] transition hover:text-[#0f8d68]"
              >
                Lupa password?
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="mt-3 h-14 w-full rounded-2xl bg-[#1abb89] text-[1.15rem] font-bold text-white shadow-[0_8px_16px_rgba(18,168,123,0.35)] transition hover:bg-[#15a97b]"
          >
            {isSignup ? "Lanjutkan" : "Masuk"}
          </button>
        </form>

        <div className="pt-7 text-center text-[1.1rem] text-neutral-500">
          {isSignup ? "Sudah punya akun? " : "Belum punya akun? "}
          <Link
            href={isSignup ? "/login" : "/register"}
            className="font-bold text-[#11af82] transition hover:text-[#0e8e68]"
          >
            {isSignup ? "Masuk" : "Daftar sekarang"}
          </Link>
        </div>
      </section>
    </main>
  );
}
