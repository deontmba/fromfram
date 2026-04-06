import Link from "next/link";
import { ReactNode, SVGProps } from "react";
import {
  FeedbackState,
  FeedbackTone,
  SubscriptionStatusKey,
} from "@/components/subscription/subscription-types";

export function SubscriptionPageShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-zinc-900">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1dbb87] via-[#52d39d] to-[#d5f8ea] pb-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.2),transparent_32%)]" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 md:px-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/90 transition hover:text-white"
          >
            <ArrowLeftIcon className="size-4" />
            Dashboard
          </Link>

          <div className="mt-4 flex items-center gap-3 text-white">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <GearIcon className="size-5" />
            </div>
            <h1 className="text-2xl font-semibold md:text-3xl">Kelola Subscription</h1>
          </div>
        </div>
      </div>

      <div className="relative z-10 -mt-16 px-4 pb-14 md:px-8">
        <div className="mx-auto max-w-5xl space-y-6">{children}</div>
      </div>
    </main>
  );
}

export function SurfaceCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-[1.75rem] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-zinc-100 md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  icon,
  title,
  badge,
}: {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      </div>
      {badge}
    </div>
  );
}

export function SectionBadge({
  label,
  tone = "info",
}: {
  label: string;
  tone?: FeedbackTone;
}) {
  const toneClassName =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "error"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClassName}`}>{label}</span>
  );
}

export function StatusPill({
  status,
  label,
}: {
  status: SubscriptionStatusKey;
  label: string;
}) {
  const className =
    status === "active"
      ? "bg-white text-emerald-600"
      : status === "paused"
        ? "bg-amber-50 text-amber-700"
        : status === "cancelled"
          ? "bg-rose-50 text-rose-600"
          : "bg-zinc-100 text-zinc-500";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      <CheckCircleIcon className="size-3.5" />
      {label}
    </span>
  );
}

export function FeedbackBanner({
  feedback,
}: {
  feedback: FeedbackState | null;
}) {
  if (!feedback) {
    return null;
  }

  const className =
    feedback.tone === "success"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : feedback.tone === "error"
        ? "border-rose-100 bg-rose-50 text-rose-700"
        : "border-sky-100 bg-sky-50 text-sky-700";

  return (
    <div className={`rounded-[1.4rem] border px-4 py-3 ${className}`}>
      <p className="font-semibold">{feedback.message}</p>
      {feedback.note ? <p className="mt-1 text-sm opacity-80">{feedback.note}</p> : null}
    </div>
  );
}

export function SelectableCardButton({
  active,
  disabled,
  onClick,
  className = "",
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-[1.4rem] border p-4 text-left transition ${
        active
          ? "border-emerald-400 bg-gradient-to-r from-[#47cf98] to-[#a9efda] text-white shadow-[0_18px_32px_rgba(29,187,135,0.24)]"
          : "border-zinc-200 bg-white text-zinc-900 hover:border-emerald-200 hover:bg-emerald-50/50"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}
    >
      {children}
    </button>
  );
}

export function ActionRowButton({
  title,
  subtitle,
  icon,
  tone = "default",
  disabled,
  loading,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  const toneClassName =
    tone === "danger"
      ? "border-rose-200 text-rose-600 hover:bg-rose-50"
      : "border-zinc-200 text-zinc-900 hover:bg-zinc-50";

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 rounded-[1.2rem] border px-4 py-4 text-left transition ${toneClassName} ${
        disabled || loading ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex size-10 items-center justify-center rounded-full ${
            tone === "danger" ? "bg-rose-50" : "bg-emerald-50"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-zinc-500">{loading ? "Memproses..." : subtitle}</p>
        </div>
      </div>
      <ChevronRightIcon className="size-4" />
    </button>
  );
}

export function Dialog({
  title,
  description,
  children,
  footer,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-[1.8rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-zinc-900">{title}</h3>
            <p className="mt-2 text-sm text-zinc-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            Tutup
          </button>
        </div>

        <div className="mt-6">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>
      </div>
    </div>
  );
}

export const primaryButtonClassName =
  "rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClassName =
  "rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60";

export function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M10.2 4.2l.5-1.7h2.6l.5 1.7a2 2 0 001.5 1.4l1.7.4 1.3-1.3 1.8 1.8-1.3 1.3.4 1.7a2 2 0 001.4 1.5l1.7.5v2.6l-1.7.5a2 2 0 00-1.4 1.5l-.4 1.7 1.3 1.3-1.8 1.8-1.3-1.3-1.7.4a2 2 0 00-1.5 1.4l-.5 1.7h-2.6l-.5-1.7a2 2 0 00-1.5-1.4l-1.7-.4-1.3 1.3-1.8-1.8 1.3-1.3-.4-1.7a2 2 0 00-1.4-1.5l-1.7-.5v-2.6l1.7-.5a2 2 0 001.4-1.5l.4-1.7-1.3-1.3 1.8-1.8 1.3 1.3 1.7-.4a2 2 0 001.5-1.4z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function LocationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M12 21s6-5.4 6-11a6 6 0 10-12 0c0 5.6 6 11 6 11z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="6" y="5" width="4" height="14" rx="1.5" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" />
    </svg>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 5.5a1 1 0 011.5-.86l8.5 5.5a1 1 0 010 1.72l-8.5 5.5A1 1 0 018 16.5v-11z" />
    </svg>
  );
}

export function SkipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M5 6v12l8-6-8-6zM19 6v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M16 21a4 4 0 00-8 0" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="4" />
      <path d="M21 21a4 4 0 00-3-3.87M18 7.13A4 4 0 0121 11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 21a4 4 0 013-3.87M6 7.13A4 4 0 003 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function XCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
