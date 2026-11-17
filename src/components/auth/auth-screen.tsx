"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";

type AuthMode = "signup" | "login";
type AuthScreenProps = { mode: AuthMode };

// ============================================================
// INPUT FIELD
// ============================================================

function InputField({
  label, placeholder, type = "text", value, onChange, error, autoComplete, trailing
}: {
  label: string;
  placeholder: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  trailing?: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-neutral-700">{label}</span>
      <span
        className={`flex h-11 items-center rounded-xl border bg-white px-3.5 transition focus-within:border-[#13b987] focus-within:ring-2 focus-within:ring-[#13b987]/20 ${
          error ? "border-red-400" : "border-neutral-300"
        }`}
      >
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[0.95rem] text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        {trailing}
      </span>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </label>
  );
}

function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={shown ? "Sembunyikan password" : "Tampilkan password"}
      className="ml-2 text-neutral-400 transition hover:text-neutral-600"
    >
      {shown ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
    </button>
  );
}

// ============================================================
// MAIN AUTH SCREEN
// ============================================================

export function AuthScreen({ mode }: AuthScreenProps) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = !isSignup && searchParams.get("registered") === "1";

  // Animasi mount
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => (isSignup ? "" : searchParams.get("email") ?? ""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
        setGlobalError(data.error ?? "Something went wrong.");
        return;
      }

      if (isSignup) {
        router.push(`/login?registered=1&email=${encodeURIComponent(email)}`);
      } else {
        const role = data.user?.role;
        if (role === "ADMIN") {
          router.push("/admin");
        } else if (role === "NUTRITIONIST") {
          router.push("/nutritionist");
        } else {
          if (data.user?.hasCompletedOnboarding) {
            router.push("/dashboard");
          } else {
            router.push("/onboarding");
          }
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

  return (
    <main className="flex min-h-screen w-full bg-white">
      {/* Left visual side */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative hidden w-1/2 bg-neutral-900 lg:block"
      >
        <Image
          src="/images/makanan1.png"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 max-w-xl p-12">
          <p className="text-2xl font-semibold leading-snug text-white">
            {isSignup
              ? "Mulai hidup sehatmu dengan meal kit yang disusun ahli gizi."
              : "Kesehatan bukan hanya tentang apa yang Anda makan, tetapi apa yang Anda pikirkan dan katakan."}
          </p>
        </div>
      </motion.div>

      {/* Right form side */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 12 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex w-full flex-col px-5 py-6 sm:px-10 lg:w-1/2"
      >
        <BrandMark />

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <header className="mb-8">
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-neutral-900">
              {isSignup ? "Buat akun baru" : "Selamat datang kembali"}
            </h1>
            <p className="mt-2 text-[0.95rem] text-neutral-500">
              {isSignup ? "Daftar untuk mulai berlangganan meal kit sehat." : "Masuk ke akun FromFram kamu."}
            </p>
          </header>

          {justRegistered && (
            <p role="status" className="mb-5 rounded-xl border border-[#13b987]/30 bg-[#effaf5] px-4 py-3 text-sm text-[#07845e]">
              Akun berhasil dibuat. Silakan masuk untuk melanjutkan.
            </p>
          )}

          <form
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            {isSignup && (
              <InputField
                label="Nama lengkap"
                placeholder="Nama kamu"
                autoComplete="name"
                value={name}
                onChange={setName}
                error={fieldErrors.name}
              />
            )}
            <InputField
              label="Email"
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              error={fieldErrors.email}
            />
            <InputField
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder={isSignup ? "Minimal 8 karakter" : "Masukkan password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={setPassword}
              error={fieldErrors.password}
              trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
            />
            {isSignup && (
              <InputField
                label="Konfirmasi password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Ulangi password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                error={fieldErrors.confirmPassword}
                trailing={
                  <PasswordToggle shown={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                }
              />
            )}

            {!isSignup && (
              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2 text-neutral-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 accent-[#13b987]"
                  />
                  Ingat saya
                </label>
                <Link href="/forgot-password" className="font-medium text-neutral-600 transition hover:text-[#0f996f] hover:underline">
                  Lupa password?
                </Link>
              </div>
            )}

            {globalError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {globalError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full cursor-pointer rounded-xl bg-[#13b987] text-[0.95rem] font-semibold text-white transition hover:bg-[#0f996f] disabled:opacity-60"
            >
              {loading ? "Memproses..." : isSignup ? "Daftar" : "Masuk"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-xs text-neutral-400">atau</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-neutral-300 bg-white text-[0.95rem] font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            <Image src="/icons/google.svg" alt="" width={18} height={18} />
            {isSignup ? "Daftar dengan Google" : "Masuk dengan Google"}
          </button>

          <p className="mt-8 text-center text-sm text-neutral-500">
            {isSignup ? "Sudah punya akun? " : "Belum punya akun? "}
            <Link
              href={isSignup ? "/login" : "/register"}
              className="font-semibold text-[#0f996f] transition hover:underline"
            >
              {isSignup ? "Masuk" : "Daftar sekarang"}
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
