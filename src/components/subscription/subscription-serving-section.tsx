import { SERVING_OPTIONS } from "@/components/subscription/subscription-constants";
import {
  SectionBadge,
  SectionHeader,
  SelectableCardButton,
  SurfaceCard,
  UsersIcon,
} from "@/components/subscription/subscription-ui";

export function SubscriptionServingSection({
  selectedServing,
  onSelect,
}: {
  selectedServing: number;
  onSelect: (serving: number) => void;
}) {
  return (
    <SurfaceCard>
      <SectionHeader
        icon={<UsersIcon className="size-4" />}
        title="Ubah Serving Size"
        badge={<SectionBadge label="UI-only" />}
      />
      <p className="mt-3 text-sm text-zinc-500">
        Serving size mengikuti mockup flow sebelumnya. Backend update serving belum ada, jadi
        pilihan di bawah ini masih berupa local state.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {SERVING_OPTIONS.map((servingOption) => {
          const isActive = selectedServing === servingOption;

          return (
            <SelectableCardButton
              key={servingOption}
              active={isActive}
              onClick={() => onSelect(servingOption)}
              className="flex min-h-28 flex-col items-center justify-center text-center"
            >
              <UsersIcon className={`size-7 ${isActive ? "text-white" : "text-emerald-500"}`} />
              <p className="mt-3 text-3xl font-semibold">{servingOption}</p>
              <p className={`mt-1 text-sm font-medium ${isActive ? "text-white/80" : "text-zinc-500"}`}>
                org
              </p>
            </SelectableCardButton>
          );
        })}
      </div>
    </SurfaceCard>
  );
}
