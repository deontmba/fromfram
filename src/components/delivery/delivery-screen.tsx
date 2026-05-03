import Link from "next/link";
import type { ReactNode } from "react";
import type {
  ActiveDelivery,
  DeliveryStatusTone,
  DeliverySummaryItem,
  DeliveryTimelineStep,
  DeliveryTrackingViewModel,
} from "./delivery-mock-data";

const statusBadgeStyles: Record<DeliveryStatusTone, string> = {
  active: "border-[#bdebd9] bg-[#e8f8f0] text-[#0f8f6d]",
  scheduled: "border-[#f4d878] bg-[#fff8d9] text-[#8a5a00]",
  completed: "border-[#dfeee8] bg-[#f5fbf8] text-[#6f7f78]",
};

const sectionIconStyles =
  "grid h-4 w-4 shrink-0 place-items-center text-[#12a97f]";

export function DeliveryScreen({ delivery }: { delivery: DeliveryTrackingViewModel }) {
  return (
    <main className="min-h-screen bg-[#f7f8f7] text-neutral-950">
      <DeliveryHeader periodLabel={delivery.periodLabel} />

      <div className="mx-auto w-full max-w-[660px] px-4 py-6 sm:px-6">
        <section aria-labelledby="today-delivery-title">
          <SectionHeading
            id="today-delivery-title"
            title="Hari ini"
            icon={<ClockIcon className="h-4 w-4" />}
          />
          <FeaturedDeliveryCard delivery={delivery.todayDelivery} />
        </section>

        <div className="mt-6 space-y-6">
          <DeliveryListSection
            id="upcoming-deliveries-title"
            title="Pengiriman Berikutnya"
            icon={<CalendarIcon className="h-4 w-4" />}
            deliveries={delivery.upcomingDeliveries}
          />

          <DeliveryListSection
            id="recent-deliveries-title"
            title="Riwayat Terbaru"
            icon={<HistoryIcon className="h-4 w-4" />}
            deliveries={delivery.recentDeliveries}
          />

          <DeliveryInfoBox bullets={delivery.infoBullets} />
        </div>
      </div>
    </main>
  );
}

function DeliveryHeader({ periodLabel }: { periodLabel: string }) {
  return (
    <header className="border-b border-black/5 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex w-full max-w-[660px] items-start gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <span className="mt-[34px] hidden h-10 w-10 shrink-0 rounded-lg bg-[#e0f5ec] text-[#0fa878] sm:grid sm:place-items-center">
          <PinIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 transition hover:text-[#0f8f6d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79d9bc]"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Kembali ke Dashboard
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e0f5ec] text-[#0fa878] sm:hidden">
              <PinIcon className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-[1.35rem] font-bold leading-tight tracking-[-0.01em] text-neutral-950">
                Tracking Pengiriman
              </h1>
              <p className="mt-1 text-xs font-medium text-neutral-500">{periodLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function SectionHeading({
  id,
  title,
  icon,
}: {
  id: string;
  title: string;
  icon: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={sectionIconStyles}>{icon}</span>
      <h2 id={id} className="text-[0.98rem] font-bold text-neutral-900">
        {title}
      </h2>
    </div>
  );
}

function FeaturedDeliveryCard({ delivery }: { delivery: ActiveDelivery }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.11)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex rounded bg-[#27c99a] px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-white">
            {delivery.dayLabel}, {delivery.dateLabel}
          </span>
          <h3 className="mt-2 truncate text-[1.08rem] font-bold text-neutral-950">
            {delivery.menuName}
          </h3>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-medium text-neutral-500">
            <PinIcon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="truncate">{delivery.addressLabel}</span>
          </p>
        </div>
        <StatusBadge label={delivery.statusLabel} tone={delivery.statusTone} />
      </div>

      <div className="mt-4">
        <RouteMock />
      </div>

      <EtaCard title={delivery.etaTitle} window={delivery.etaWindow} />

      <div className="mt-7">
        <h4 className="text-xs font-bold text-neutral-900">Detail Status</h4>
        <StatusTimeline steps={delivery.timeline} />
      </div>
    </article>
  );
}

function RouteMock() {
  return (
    <div className="relative h-[132px] overflow-hidden rounded-lg border border-neutral-200 bg-[#f3f6f6] sm:h-[150px]">
      <div className="absolute inset-0 bg-[linear-gradient(#e8eeee_1px,transparent_1px),linear-gradient(90deg,#e8eeee_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute left-[13%] top-[21%] h-3 w-3 rounded-full border-2 border-white bg-[#c7d0d4] shadow-[0_0_0_3px_rgba(199,208,212,0.35)]" />
      <div className="absolute left-[14%] top-[34%] h-[2px] w-[34%] bg-[#24c293]" />
      <div className="absolute left-[48%] top-[34%] h-[47%] w-[2px] bg-[#24c293]" />
      <div className="absolute left-[48%] top-[79%] h-[2px] w-[28%] bg-[#24c293]" />
      <div className="absolute left-[76%] top-[79%] h-[2px] w-[12%] border-t-2 border-dashed border-[#24c293]" />
      <div className="absolute left-[13%] top-[31%] rounded bg-white px-2 py-1 text-[0.58rem] font-bold text-neutral-500 shadow-sm">
        Dapur
      </div>
      <div className="absolute right-[8%] top-[69%] h-5 w-5 rounded-full border-2 border-white bg-[#c7d0d4] shadow-[0_0_0_4px_rgba(199,208,212,0.32)]" />
      <div className="absolute right-[6%] top-[84%] rounded bg-white px-2 py-1 text-[0.58rem] font-bold text-neutral-500 shadow-sm">
        Rumah
      </div>
      <div className="absolute left-[60%] top-[69%] grid h-9 w-9 place-items-center rounded-full border-4 border-[#d4f6e8] bg-white text-[#12b886] shadow-[0_10px_22px_rgba(18,184,134,0.22)]">
        <CourierIcon className="h-4 w-4" />
      </div>
    </div>
  );
}

function EtaCard({ title, window }: { title: string; window: string }) {
  return (
    <div className="mt-3 rounded-lg border border-[#cfece0] bg-[#f2fbf6] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#0fa878]">
          <ClockIcon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-bold text-neutral-900">{title}</p>
          <p className="mt-0.5 text-xs font-medium text-neutral-500">{window}</p>
        </div>
      </div>
    </div>
  );
}

function StatusTimeline({ steps }: { steps: DeliveryTimelineStep[] }) {
  return (
    <ol className="mt-4 space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isComplete = step.state === "completed" || step.state === "current";

        return (
          <li key={step.id} className="grid grid-cols-[24px_1fr_auto] gap-3">
            <div className="relative flex justify-center">
              <span
                className={`z-10 mt-0.5 grid h-5 w-5 place-items-center rounded-full border text-white ${
                  isComplete
                    ? "border-[#14b886] bg-[#14b886]"
                    : "border-[#9de3cd] bg-white text-[#9de3cd]"
                }`}
              >
                {isComplete ? <CheckIcon className="h-3 w-3" /> : null}
              </span>
              {!isLast ? (
                <span
                  className={`absolute top-5 h-[34px] w-[2px] ${
                    step.state === "upcoming" ? "bg-[#d9eee6]" : "bg-[#14b886]"
                  }`}
                />
              ) : null}
            </div>
            <p className="pb-5 text-sm font-bold text-neutral-900">{step.label}</p>
            <p className="pb-5 text-right text-xs font-semibold text-neutral-400">
              {step.timeLabel}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function DeliveryListSection({
  id,
  title,
  icon,
  deliveries,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  deliveries: DeliverySummaryItem[];
}) {
  return (
    <section aria-labelledby={id}>
      <SectionHeading id={id} title={title} icon={icon} />
      <div className="space-y-3">
        {deliveries.map((delivery) => (
          <CompactDeliveryCard key={delivery.id} delivery={delivery} />
        ))}
      </div>
    </section>
  );
}

function CompactDeliveryCard({ delivery }: { delivery: DeliverySummaryItem }) {
  return (
    <article className="flex min-h-[62px] items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-neutral-950">
          {delivery.dayLabel}, {delivery.dateLabel}
        </h3>
        <p className="mt-1 truncate text-xs font-medium text-neutral-500">
          {delivery.menuName}
        </p>
      </div>
      <StatusBadge label={delivery.statusLabel} tone={delivery.statusTone} />
    </article>
  );
}

function DeliveryInfoBox({ bullets }: { bullets: string[] }) {
  return (
    <section
      aria-labelledby="delivery-info-title"
      className="rounded-lg border border-[#cfece0] bg-[#f3fbf7] p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] sm:p-5"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#dff7ee] text-[#12a97f]">
          <InfoIcon className="h-4 w-4" />
        </span>
        <h2 id="delivery-info-title" className="text-sm font-bold text-neutral-900">
          Informasi Pengiriman
        </h2>
      </div>
      <ul className="mt-4 space-y-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2 text-xs font-medium leading-5 text-neutral-600">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fc291]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: DeliveryStatusTone }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.04em] ${statusBadgeStyles[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function ArrowLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M15 18 9 12l6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="m6 12 4 4 8-8"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CourierIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M5 17h14M7 17l2-8h5l3 8M9 9l1.5-3H14l1 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="18" r="1.5" fill="currentColor" />
      <circle cx="17" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

function HistoryIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 4v6h6M5 13a7 7 0 1 0 2-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v6M12 7h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
