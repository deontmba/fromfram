"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";

type AuthMode = "signup" | "login";
type AuthScreenProps = { mode: AuthMode };

// ============================================================
// ICONS
// ============================================================

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
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

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function LeafLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7 text-white">
      <path d="M20 4S13 3 8.5 7.5C5 11 5 16 5 16s5 0 8.5-3.5C18 8 20 4 20 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20c1.5-2.5 3.4-4.4 5.8-5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}



function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-12 w-12 text-[#12b886]">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="m8 12 3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EnvelopeOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-12 w-12 text-[#12b886]">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============================================================
// INPUT FIELD
// ============================================================

function InputField({
  label, placeholder, icon, type = "text", value, onChange, error, rightIcon
}: {
  label: string;
  placeholder: string;
  icon: ReactNode;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (v: string) => void;
  error?: string;
  rightIcon?: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-[1.08rem] font-semibold text-neutral-800">{label}</span>
      <span className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-3 text-neutral-400 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)] transition focus-within:border-[#18b887] ${error ? "border-red-400" : "border-neutral-300"}`}>
        {icon}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[1.02rem] text-neutral-700 outline-none placeholder:text-neutral-400"
        />
        {rightIcon}
      </span>
      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
    </label>
  );
}

// ============================================================
// EMAIL SENT SCREEN
// ============================================================

function EmailSentScreen({ email }: { email: string }) {
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  async function handleResend() {
    setResending(true);
    setResendMessage("");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResendMessage("Email verifikasi sudah dikirim ulang. Cek inbox kamu!");
    } catch {
      setResendMessage("Gagal mengirim ulang. Coba lagi beberapa saat.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      className="flex flex-col items-center text-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <EnvelopeOpenIcon />
      <h2 className="mt-4 text-[1.5rem] font-bold tracking-[-0.02em] text-neutral-900">
        Cek email kamu!
      </h2>
      <p className="mt-3 text-[1rem] leading-relaxed text-neutral-500">
        Kami sudah mengirim link verifikasi ke{" "}
        <span className="font-semibold text-neutral-700">{email}</span>.
        Klik link tersebut untuk mengaktifkan akun kamu.
      </p>
      <p className="mt-2 text-sm text-neutral-400">
        Link berlaku selama 24 jam. Cek folder spam jika tidak masuk inbox.
      </p>

      <div className="mt-6 w-full rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-left">
        <p className="text-sm font-semibold text-neutral-700">Tidak dapat email?</p>
        <p className="mt-1 text-sm text-neutral-500">
          Pastikan email yang dimasukkan benar, lalu klik kirim ulang.
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="mt-3 h-10 w-full rounded-xl bg-[#eafff5] text-sm font-bold text-[#12b886] transition hover:bg-[#d5f5e8] disabled:opacity-60"
        >
          {resending ? "Mengirim..." : "Kirim ulang email verifikasi"}
        </button>
        {resendMessage && (
          <p className="mt-2 text-sm font-medium text-[#12b886]">{resendMessage}</p>
        )}
      </div>

      <Link
        href="/login"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#13af82] transition hover:text-[#0f8d68]"
      >
        <ArrowLeftIcon />
        Kembali ke halaman login
      </Link>
    </div>
  );
}

// ============================================================
// EMAIL NOT VERIFIED BANNER
// ============================================================

function EmailNotVerifiedBanner({
  email,
  onResent,
}: {
  email: string;
  onResent: () => void;
}) {
  const [resending, setResending] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      onResent();
    } catch {
      // silent fail
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#fecdd3] bg-[#fff1f3] px-4 py-4">
      <p className="text-sm font-bold text-[#be123c]">Email belum diverifikasi</p>
      <p className="mt-1 text-sm text-neutral-600">
        Cek inbox email kamu dan klik link verifikasi yang sudah dikirim.
      </p>
      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        className="mt-3 h-9 w-full rounded-xl bg-white text-sm font-bold text-[#be123c] shadow-sm transition hover:bg-red-50 disabled:opacity-60"
      >
        {resending ? "Mengirim..." : "Kirim ulang email verifikasi"}
      </button>
    </div>
  );
}

// ============================================================
// MAIN AUTH SCREEN
// ============================================================

export function AuthScreen({ mode }: AuthScreenProps) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const searchParams = useSearchParams();

  // Animasi mount
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showNotVerified, setShowNotVerified] = useState(false);
  const [resentSuccess, setResentSuccess] = useState(false);

  const verified = searchParams.get("verified");

  function validate() {
    const errors: Record<string, string> = {};
    if (isSignup && !name.trim())
      errors.name = "Nama lengkap wajib diisi.";
    if (!email.trim())
      errors.email = "Email wajib diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Format email tidak valid.";
    if (!password)
      errors.password = "Password wajib diisi.";
    else if (isSignup && password.length < 8)
      errors.password = "Password minimal 8 karakter.";

    if (isSignup) {
      if (!confirmPassword)
        errors.confirmPassword = "Konfirmasi password wajib diisi.";
      else if (password !== confirmPassword)
        errors.confirmPassword = "Password tidak cocok.";
    }

    return errors;
  }

  async function handleSubmit() {
    setGlobalError("");
    setShowNotVerified(false);
    setResentSuccess(false);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const endpoint = isSignup ? "/api/auth/register" : "/api/auth/login";
      const body = isSignup
        ? { name, email, password }
        : { email, password, rememberMe };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setShowNotVerified(true);
          return;
        }
        setGlobalError(data.error ?? "Something went wrong.");
        return;
      }

      if (isSignup) {
        router.push("/login");
      } else {
        const role = data.user?.role;
        if (role === "ADMIN") {
          router.push("/admin");
        } else if (role === "NUTRITIONIST") {
          router.push("/nutritionist");
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setGlobalError("Network error, please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = "/api/auth/google";
  }

  // ── Email sent screen ──
  if (registeredEmail) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]" />
        <section className="relative mx-auto w-full max-w-[460px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-7 py-10 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8">
          <EmailSentScreen email={registeredEmail} />
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]" />

      <section className="relative mx-auto w-full max-w-[460px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-7 py-10 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8">
        <Link
          href="/"
          className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm transition hover:bg-neutral-50 hover:text-neutral-800"
        >
          <ArrowLeftIcon />
        </Link>
        <div className="mb-9 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#19ba89]">
              <LeafLogo />
            </div>
            <h1 className="text-5xl font-bold tracking-[-0.03em] text-[#13a981]">FromFram</h1>
          </div>
          <p className="text-[1.1rem] leading-none text-neutral-500">
            {isSignup ? "Buat akun baru" : "Selamat datang kembali"}
          </p>
        </div>

        {/* Banner: verified success */}
        {verified === "success" && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#a7e8d0] bg-[#eafff5] px-4 py-3">
            <CheckCircleIcon />
            <div>
              <p className="text-sm font-bold text-[#0d7a56]">Email berhasil diverifikasi! 🎉</p>
              <p className="text-sm text-[#12b886]">Akun kamu sudah aktif. Silakan login.</p>
            </div>
          </div>
        )}

        {/* Banner: resent success */}
        {resentSuccess && (
          <div className="mb-5 rounded-2xl border border-[#a7e8d0] bg-[#eafff5] px-4 py-3">
            <p className="text-sm font-bold text-[#0d7a56]">Email verifikasi sudah dikirim ulang!</p>
            <p className="text-sm text-[#12b886]">Cek inbox atau folder spam kamu.</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-5">
          {isSignup && (
            <InputField
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              icon={<UserIcon />}
              value={name}
              onChange={setName}
              error={fieldErrors.name}
            />
          )}

          <InputField
            label="Email"
            type="email"
            placeholder="nama@email.com"
            icon={<MailIcon />}
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
          />

          <InputField
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder={isSignup ? "Minimal 8 karakter" : "Masukkan password"}
            icon={<LockIcon />}
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            rightIcon={
              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                className="text-neutral-400 hover:text-neutral-600 transition"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />

          {isSignup && (
            <InputField
              label="Konfirmasi Password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Masukkan ulang password"
              icon={<LockIcon />}
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={fieldErrors.confirmPassword}
              rightIcon={
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                  className="text-neutral-400 hover:text-neutral-600 transition"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />
          )}

          {!isSignup && (
            <div className="flex items-center justify-between pt-1 text-[1.05rem]">
              <label className="inline-flex cursor-pointer items-center gap-2 text-neutral-800">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-400 accent-[#1abb89]"
                />
                <span className="font-semibold">Ingat saya</span>
              </label>
              <Link href="/forgot-password" className="font-semibold text-[#13af82] transition hover:text-[#0f8d68]">
                Lupa password?
              </Link>
            </div>
          )}

          {/* Email not verified banner */}
          {showNotVerified && (
            <EmailNotVerifiedBanner
              email={email}
              onResent={() => {
                setShowNotVerified(false);
                setResentSuccess(true);
              }}
            />
          )}

          {/* Global error */}
          {globalError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {globalError}
            </p>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-3 h-14 w-full rounded-2xl bg-[#1abb89] text-[1.15rem] font-bold text-white shadow-[0_8px_16px_rgba(18,168,123,0.35)] transition hover:bg-[#15a97b] active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Memproses..." : isSignup ? "Daftar" : "Masuk"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-300" />
            <span className="text-sm text-neutral-400">atau</span>
            <div className="h-px flex-1 bg-neutral-300" />
          </div>

          {/* Google SSO — di bawah form */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-neutral-300 bg-white text-[1.02rem] font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 hover:shadow-md active:scale-[0.98]"
          >
            <GoogleIcon />
            {isSignup ? "Daftar dengan Google" : "Masuk dengan Google"}
          </button>


        </div>

        {/* Switch mode */}
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
