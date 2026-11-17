import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";

const STEPS = ["Paket", "Alamat", "Menu", "Bayar"] as const;
export type CheckoutStep = (typeof STEPS)[number];

/** Shared frame for the subscription checkout: brand, step indicator, page title. */
export function CheckoutLayout({
  step,
  title,
  subtitle,
  width = "md",
  children,
}: {
  step: CheckoutStep;
  title: string;
  subtitle?: string;
  width?: "md" | "lg" | "xl";
  children: ReactNode;
}) {
  const current = STEPS.indexOf(step);
  const maxWidth = { md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" }[width];

  return (
    <main className="min-h-screen bg-[#f7f7f5] pb-16">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <BrandMark />
          <Link href="/dashboard" className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800">
            Ke dashboard
          </Link>
        </div>
      </header>

      <div className={`mx-auto w-full ${maxWidth} px-5 pt-8`}>
        <ol className="flex items-center gap-2" aria-label="Langkah berlangganan">
          {STEPS.map((label, idx) => {
            const done = idx < current;
            const active = idx === current;
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    done ? "bg-[#13b987] text-white" : active ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} /> : idx + 1}
                </span>
                <span className={`hidden text-sm sm:inline ${active ? "font-semibold text-neutral-900" : "text-neutral-500"}`}>
                  {label}
                </span>
                {idx < STEPS.length - 1 ? <span className="h-px flex-1 bg-neutral-200" /> : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-8">
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-neutral-900">{title}</h1>
          {subtitle ? <p className="mt-2 text-[0.95rem] text-neutral-500">{subtitle}</p> : null}
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export const fieldClass =
  "h-11 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-[0.95rem] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#13b987] focus:ring-2 focus:ring-[#13b987]/20 disabled:bg-neutral-50 disabled:text-neutral-400";

export const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#13b987] px-6 text-[0.95rem] font-semibold text-white transition hover:bg-[#0f996f] disabled:cursor-not-allowed disabled:bg-neutral-300";

export const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-6 text-[0.95rem] font-semibold text-neutral-700 transition hover:bg-neutral-50";

export const cardClass = "rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6";
