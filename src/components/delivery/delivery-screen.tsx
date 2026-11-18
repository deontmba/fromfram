import type { ReactNode } from "react";
import {
  CalendarDays as CalendarIcon,
  Check as CheckIcon,
  Clock as ClockIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  MapPin as PinIcon,
} from "lucide-react";
import { CustomerPage } from "@/components/ui/customer-page";
import type {
  ActiveDelivery,
  DeliveryStatusTone,
  DeliverySummaryItem,
  DeliveryTimelineStep,
  DeliveryTrackingViewModel,
} from "./delivery-types";

const statusBadgeStyles: Record<DeliveryStatusTone, string> = {
  active: "border-[#bdebd9] bg-[#e8f8f0] text-[#0f8f6d]",
  scheduled: "border-[#f4d878] bg-[#fff8d9] text-[#8a5a00]",
  completed: "border-[#dfeee8] bg-[#f5fbf8] text-[#6f7f78]",
};

const sectionIconStyles =
  "grid h-4 w-4 shrink-0 place-items-center text-[#12a97f]";

export function DeliveryScreen({ delivery }: { delivery: DeliveryTrackingViewModel }) {
  const hasDeliveryData = Boolean(
    delivery.todayDelivery ||
      delivery.upcomingDeliveries.length > 0 ||
      delivery.recentDeliveries.length > 0,
  );

  return (
    <CustomerPage title="Lacak pengiriman" subtitle={delivery.periodLabel}>
      <div>
        {delivery.errorMessage ? <DeliveryNotice message={delivery.errorMessage} /> : null}

        {hasDeliveryData ? (
          <>
            {delivery.todayDelivery ? (
              <section aria-labelledby="today-delivery-title">
                <SectionHeading
                  id="today-delivery-title"
                  title="Hari ini"
                  icon={<ClockIcon className="h-4 w-4" />}
                />
                <FeaturedDeliveryCard delivery={delivery.todayDelivery} />
              </section>
            ) : (
              <EmptyDeliveryCard
                title="Belum ada pengiriman hari ini."
                description="Pengiriman hari ini akan muncul saat sudah dijadwalkan."
              />
            )}

            <div className="mt-6 space-y-6">
              <DeliveryListSection
                id="upcoming-deliveries-title"
                title="Pengiriman berikutnya"
                icon={<CalendarIcon className="h-4 w-4" />}
                deliveries={delivery.upcomingDeliveries}
                emptyMessage="Belum ada pengiriman berikutnya."
              />
              <DeliveryListSection
                id="recent-deliveries-title"
                title="Riwayat"
                icon={<HistoryIcon className="h-4 w-4" />}
                deliveries={delivery.recentDeliveries}
                emptyMessage="Belum ada riwayat pengiriman."
              />

              <DeliveryInfoBox bullets={delivery.infoBullets} />
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <EmptyDeliveryCard
              title={delivery.emptyStateTitle}
              description={delivery.emptyStateDescription}
            />
            <DeliveryInfoBox bullets={delivery.infoBullets} />
          </div>
        )}
      </div>
    </CustomerPage>
  );
}

function DeliveryNotice({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg border border-[#f4d878] bg-[#fff8d9] px-4 py-3 text-xs font-semibold text-[#8a5a00]">
      {message}
    </div>
  );
}

function EmptyDeliveryCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section
      aria-labelledby="empty-delivery-title"
      className="rounded-lg border border-neutral-200 bg-white p-5 text-center shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
    >
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-[#e0f5ec] text-[#0fa878]">
        <CalendarIcon className="h-5 w-5" />
      </span>
      <h2 id="empty-delivery-title" className="mt-3 text-sm font-bold text-neutral-950">
        {title}
      </h2>
      <p className="mx-auto mt-1 max-w-[320px] text-xs font-medium leading-5 text-neutral-500">
        {description}
      </p>
    </section>
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

      <EtaCard title={delivery.etaTitle} window={delivery.etaWindow} />

      <div className="mt-7">
        <h4 className="text-xs font-bold text-neutral-900">Status</h4>
        <StatusTimeline steps={delivery.timeline} />
      </div>
    </article>
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
  emptyMessage,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  deliveries: DeliverySummaryItem[];
  emptyMessage: string;
}) {
  // One delivery row exists per portion, so collapse them into "meal: recipe xN" lines per day.
  const groupedDeliveries = deliveries.reduce((acc, current) => {
    const key = `${current.dayLabel}, ${current.dateLabel}`;
    if (!acc[key]) {
      acc[key] = {
        key,
        dayLabel: current.dayLabel,
        dateLabel: current.dateLabel,
        statusLabel: current.statusLabel,
        statusTone: current.statusTone,
        meals: {},
      };
    }
    const meal = current.mealType === "DINNER" ? "Makan malam" : "Makan siang";
    const line = `${meal}: ${current.menuName}`;
    acc[key].meals[line] = (acc[key].meals[line] ?? 0) + 1;
    return acc;
  }, {} as Record<string, { key: string; dayLabel: string; dateLabel: string; statusLabel: string; statusTone: DeliveryStatusTone; meals: Record<string, number> }>);

  const groupedArray = Object.values(groupedDeliveries);

  return (
    <section aria-labelledby={id}>
      <SectionHeading id={id} title={title} icon={icon} />
      {groupedArray.length > 0 ? (
        <div className="space-y-3">
          {groupedArray.map((group) => (
            <GroupedDeliveryCard key={group.key} group={group} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-xs font-medium text-neutral-500 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

function GroupedDeliveryCard({
  group,
}: {
  group: { key: string; dayLabel: string; dateLabel: string; statusLabel: string; statusTone: DeliveryStatusTone; meals: Record<string, number> };
}) {
  return (
    <article className="flex min-h-[62px] items-start justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-neutral-950">
          {group.dayLabel}, {group.dateLabel}
        </h3>
        <div className="mt-1 flex flex-col gap-1">
          {Object.entries(group.meals)
            .sort(([a], [b]) => (a.startsWith("Makan siang") ? -1 : b.startsWith("Makan siang") ? 1 : 0))
            .map(([line, count]) => (
              <p key={line} className="truncate text-sm text-neutral-600">
                {line}
                {count > 1 ? <span className="ml-1 text-neutral-400">x{count} porsi</span> : null}
              </p>
            ))}
        </div>
      </div>
      <div className="mt-0.5 shrink-0">
        <StatusBadge label={group.statusLabel} tone={group.statusTone} />
      </div>
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
