import { ManageSubscriptionViewModel } from "@/components/subscription/subscription-types";
import {
  ActionRowButton,
  PauseIcon,
  PlayIcon,
  SectionBadge,
  SectionHeader,
  SkipIcon,
  SurfaceCard,
  XCircleIcon,
} from "@/components/subscription/subscription-ui";

export function SubscriptionActionsSection({
  subscription,
  pendingAction,
  onSkip,
  onPause,
  onResume,
  onCancel,
}: {
  subscription: ManageSubscriptionViewModel;
  pendingAction: string | null;
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  const isPaused = subscription.status === "paused";

  return (
    <SurfaceCard>
      <SectionHeader
        icon={<SkipIcon className="size-4" />}
        title="Aksi Subscription"
        badge={<SectionBadge label="Backend" tone="success" />}
      />

      <div className="mt-5 space-y-4">
        <ActionRowButton
          title="Skip 1 Minggu"
          subtitle={
            subscription.skippableWeeklyBoxId
              ? "Lewati pengiriman minggu berikutnya."
              : "Weekly box berikutnya belum tersedia untuk di-skip."
          }
          icon={<SkipIcon className="size-5 text-emerald-500" />}
          disabled={!subscription.skippableWeeklyBoxId}
          loading={pendingAction === "skip"}
          onClick={onSkip}
        />

        {isPaused ? (
          <ActionRowButton
            title="Resume Subscription"
            subtitle="Aktifkan kembali subscription yang sedang dijeda."
            icon={<PlayIcon className="size-4 text-emerald-500" />}
            loading={pendingAction === "resume"}
            onClick={onResume}
          />
        ) : (
          <ActionRowButton
            title="Pause Subscription"
            subtitle="Jeda subscription hingga maksimal 4 minggu."
            icon={<PauseIcon className="size-4 text-emerald-500" />}
            loading={pendingAction === "pause"}
            onClick={onPause}
          />
        )}

        <ActionRowButton
          title="Cancel Subscription"
          subtitle="Berhenti berlangganan di akhir siklus berjalan."
          icon={<XCircleIcon className="size-5 text-rose-500" />}
          tone="danger"
          loading={pendingAction === "cancel"}
          onClick={onCancel}
        />
      </div>
    </SurfaceCard>
  );
}
