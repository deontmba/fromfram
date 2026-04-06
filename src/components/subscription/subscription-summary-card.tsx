import Link from "next/link";
import { ReactNode } from "react";
import { ManageSubscriptionViewModel } from "@/components/subscription/subscription-types";
import {
  CalendarIcon,
  LocationIcon,
  StatusPill,
  SurfaceCard,
  UsersIcon,
} from "@/components/subscription/subscription-ui";

export function SubscriptionSummaryCard({
  subscription,
}: {
  subscription: ManageSubscriptionViewModel;
}) {
  return (
    <SurfaceCard className="overflow-hidden border-0 bg-gradient-to-r from-[#4bcd97] via-[#7ee0b6] to-[#c8f7e6] text-white shadow-[0_22px_48px_rgba(52,211,153,0.22)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">Langganan Aktif</p>
          <h2 className="mt-1 text-3xl font-semibold">{subscription.planLabel}</h2>
          <div className="mt-2 flex flex-wrap items-end gap-1">
            <span className="text-4xl font-semibold leading-none">{subscription.priceLabel}</span>
            <span className="pb-1 text-sm font-medium text-white/80">{subscription.billingLabel}</span>
          </div>
          {subscription.pausedUntilLabel ? (
            <p className="mt-3 text-sm text-white/85">Dijeda sampai {subscription.pausedUntilLabel}</p>
          ) : null}
        </div>

        <StatusPill status={subscription.status} label={subscription.statusLabel} />
      </div>

      <div className="mt-6 grid gap-4 text-sm text-white/90 md:grid-cols-3">
        <SummaryMeta
          icon={<UsersIcon className="size-4" />}
          label="Serving"
          value={subscription.servingLabel}
        />
        <SummaryMeta
          icon={<CalendarIcon className="size-4" />}
          label="Mulai"
          value={subscription.startDateLabel}
        />
        <SummaryMeta
          icon={<CalendarIcon className="size-4" />}
          label="Next Billing"
          value={subscription.nextBillingLabel}
        />
      </div>

      <div className="mt-6 rounded-[1.25rem] bg-white/14 px-4 py-4 backdrop-blur-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <LocationIcon className="size-4" />
              Alamat Pengiriman
            </div>
            <p className="mt-2 max-w-3xl text-sm text-white/95">{subscription.shippingAddressLabel}</p>
          </div>

          <Link
            href="/profile/address"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-white/85"
          >
            Ubah Alamat
            <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
      </div>
    </SurfaceCard>
  );
}

function SummaryMeta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] bg-white/12 px-4 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
