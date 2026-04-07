import { PLAN_OPTIONS } from "@/components/subscription/subscription-constants";
import { SubscriptionPlanKey } from "@/components/subscription/subscription-types";
import {
  CheckCircleIcon,
  SectionBadge,
  SectionHeader,
  SelectableCardButton,
  SurfaceCard,
} from "@/components/subscription/subscription-ui";

export function SubscriptionPlanSection({
  selectedPlan,
  onSelect,
}: {
  selectedPlan: SubscriptionPlanKey;
  onSelect: (planKey: SubscriptionPlanKey) => void;
}) {
  return (
    <SurfaceCard>
      <SectionHeader
        icon={<CheckCircleIcon className="size-4" />}
        title="Ubah Plan"
        badge={<SectionBadge label="UI-only" />}
      />
      <p className="mt-3 text-sm text-zinc-500">
        Pilihan plan sudah siap di UI. Backend update plan belum tersedia, jadi perubahan saat ini
        hanya disimpan di state lokal halaman ini.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {PLAN_OPTIONS.map((planOption) => {
          const isActive = selectedPlan === planOption.key;

          return (
            <SelectableCardButton
              key={planOption.key}
              active={isActive}
              onClick={() => onSelect(planOption.key)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">
                    {planOption.title}
                    {isActive ? (
                      <span className="ml-2 inline-flex align-middle">
                        <CheckCircleIcon className="size-4" />
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{planOption.priceLabel}</p>
                  <p className={`mt-1 text-sm ${isActive ? "text-white/80" : "text-zinc-500"}`}>
                    {planOption.billingLabel}
                  </p>
                </div>

                {planOption.badgeLabel ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isActive ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {planOption.badgeLabel}
                  </span>
                ) : null}
              </div>

              <p className={`mt-6 text-sm font-semibold ${isActive ? "text-white" : "text-zinc-800"}`}>
                {planOption.helperText}
              </p>
              <p className={`mt-1 text-sm ${isActive ? "text-white/80" : "text-zinc-500"}`}>
                {planOption.supportingText}
              </p>
            </SelectableCardButton>
          );
        })}
      </div>
    </SurfaceCard>
  );
}
