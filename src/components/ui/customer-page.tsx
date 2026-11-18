import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";

/** Frame for signed-in customer pages (subscription, delivery, payments, profile). */
export function CustomerPage({
  title,
  subtitle,
  backHref = "/dashboard",
  backLabel = "Dashboard",
  actions,
  width = "md",
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  width?: "md" | "lg";
  children: ReactNode;
}) {
  const maxWidth = width === "lg" ? "max-w-5xl" : "max-w-3xl";
  return (
    <main className="min-h-screen bg-[#f7f7f5] pb-16">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <BrandMark />
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link href="/dashboard" className="rounded-lg px-3 py-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900">
              Dashboard
            </Link>
            <Link href="/profile" className="rounded-lg px-3 py-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900">
              Profil
            </Link>
          </nav>
        </div>
      </header>

      <div className={`mx-auto w-full ${maxWidth} px-5 pt-8`}>
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-900">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-neutral-900">{title}</h1>
            {subtitle ? <p className="mt-2 text-[0.95rem] text-neutral-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex gap-2">{actions}</div> : null}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
