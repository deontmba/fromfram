"use client";

import { useEffect, useState } from "react";
import { PAUSE_OPTIONS } from "@/components/subscription/subscription-constants";
import {
  createPreviewSubscriptionViewModel,
  getErrorMessage,
  mapSubscriptionResponseToViewModel,
} from "@/components/subscription/subscription-mappers";
import {
  cancelMySubscription,
  getMySubscription,
  pauseMySubscription,
  resumeMySubscription,
  skipWeeklyBox,
} from "@/components/subscription/subscription-service";
import { SubscriptionActionsSection } from "@/components/subscription/subscription-actions-section";
import { SubscriptionPlanSection } from "@/components/subscription/subscription-plan-section";
import { SubscriptionServingSection } from "@/components/subscription/subscription-serving-section";
import { SubscriptionSummaryCard } from "@/components/subscription/subscription-summary-card";
import { FeedbackState } from "@/components/subscription/subscription-types";
import {
  Dialog,
  FeedbackBanner,
  SubscriptionPageShell,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/subscription/subscription-ui";

export function ManageSubscriptionScreen() {
  const [subscription, setSubscription] = useState(createPreviewSubscriptionViewModel());
  const [selectedPlan, setSelectedPlan] = useState(subscription.planKey);
  const [selectedServing, setSelectedServing] = useState(subscription.servingCount);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [pauseWeeks, setPauseWeeks] = useState(1);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadSubscription() {
      try {
        const payload = await getMySubscription(abortController.signal);
        const mappedSubscription = mapSubscriptionResponseToViewModel(payload);
        setSubscription(mappedSubscription);
        setSelectedPlan(mappedSubscription.planKey);
        setSelectedServing(mappedSubscription.servingCount);
        setFeedback(null);
      } catch (error) {
        const previewSubscription = createPreviewSubscriptionViewModel();
        setSubscription(previewSubscription);
        setSelectedPlan(previewSubscription.planKey);
        setSelectedServing(previewSubscription.servingCount);
        setFeedback({
          tone: "info",
          message: "Data subscription belum tersedia, halaman menampilkan preview UI.",
          note: getErrorMessage(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    void loadSubscription();

    return () => {
      abortController.abort();
    };
  }, []);

  const handlePlanChange = (planKey: typeof selectedPlan) => {
    setSelectedPlan(planKey);
    setFeedback({
      tone: "info",
      message: "Pilihan plan diperbarui di UI.",
      note: "TODO(FRM-10): sambungkan ke endpoint update plan saat backend tersedia.",
    });
  };

  const handleServingChange = (serving: number) => {
    setSelectedServing(serving);
    setFeedback({
      tone: "info",
      message: "Serving size diperbarui di UI.",
      note: "TODO(FRM-10): sambungkan ke endpoint update serving saat backend tersedia.",
    });
  };

  const refreshAfterAction = async () => {
    const payload = await getMySubscription();
    const mappedSubscription = mapSubscriptionResponseToViewModel(payload);
    setSubscription(mappedSubscription);
    setSelectedPlan(mappedSubscription.planKey);
    setSelectedServing(mappedSubscription.servingCount);
  };

  const handleSkip = async () => {
    if (!subscription.skippableWeeklyBoxId) {
      setFeedback({
        tone: "error",
        message: "Weekly box belum tersedia untuk di-skip.",
      });
      return;
    }

    setPendingAction("skip");

    try {
      const response = await skipWeeklyBox(subscription.skippableWeeklyBoxId);
      await refreshAfterAction().catch(() => undefined);
      setFeedback({
        tone: "success",
        message: response.message ?? "Pengiriman minggu berikutnya berhasil dilewati.",
        note: response.note,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handlePause = async () => {
    setPendingAction("pause");

    try {
      const response = await pauseMySubscription(pauseWeeks);
      setIsPauseDialogOpen(false);
      await refreshAfterAction().catch(() => undefined);
      setFeedback({
        tone: "success",
        message: response.message ?? "Subscription berhasil dijeda.",
        note: response.note ?? (response.resumeDate ? `Resume date: ${response.resumeDate}` : undefined),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleResume = async () => {
    setPendingAction("resume");

    try {
      const response = await resumeMySubscription();
      await refreshAfterAction().catch(() => undefined);
      setFeedback({
        tone: "success",
        message: response.message ?? "Subscription berhasil diaktifkan kembali.",
        note: response.note,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleCancel = async () => {
    setPendingAction("cancel");

    try {
      const response = await cancelMySubscription();
      setIsCancelDialogOpen(false);
      await refreshAfterAction().catch(() => undefined);
      setFeedback({
        tone: "success",
        message: response.message ?? "Subscription berhasil dijadwalkan untuk cancel.",
        note: response.note,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <SubscriptionPageShell>
      <FeedbackBanner feedback={feedback} />
      {isLoading ? (
        <div className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-white/70 px-5 py-4 text-sm text-zinc-500">
          Memuat data subscription...
        </div>
      ) : null}

      <SubscriptionSummaryCard subscription={subscription} />

      <SubscriptionPlanSection selectedPlan={selectedPlan} onSelect={handlePlanChange} />

      <SubscriptionServingSection selectedServing={selectedServing} onSelect={handleServingChange} />

      <SubscriptionActionsSection
        subscription={subscription}
        pendingAction={pendingAction}
        onSkip={handleSkip}
        onPause={() => setIsPauseDialogOpen(true)}
        onResume={handleResume}
        onCancel={() => setIsCancelDialogOpen(true)}
      />

      {isPauseDialogOpen ? (
        <Dialog
          title="Pause Subscription"
          description="Pilih durasi jeda. Endpoint backend hanya mengizinkan maksimum 4 minggu."
          onClose={() => setIsPauseDialogOpen(false)}
          footer={
            <>
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => setIsPauseDialogOpen(false)}
                disabled={pendingAction === "pause"}
              >
                Batal
              </button>
              <button
                type="button"
                className={primaryButtonClassName}
                onClick={handlePause}
                disabled={pendingAction === "pause"}
              >
                {pendingAction === "pause" ? "Menyimpan..." : "Pause Subscription"}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            {PAUSE_OPTIONS.map((pauseOption) => {
              const isActive = pauseWeeks === pauseOption.weeks;

              return (
                <label
                  key={pauseOption.weeks}
                  className={`flex cursor-pointer items-start gap-3 rounded-[1.25rem] border p-4 transition ${
                    isActive ? "border-emerald-300 bg-emerald-50" : "border-zinc-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="pause-weeks"
                    className="mt-1"
                    checked={isActive}
                    onChange={() => setPauseWeeks(pauseOption.weeks)}
                  />
                  <span>
                    <span className="block font-semibold text-zinc-900">{pauseOption.label}</span>
                    <span className="mt-1 block text-sm text-zinc-500">{pauseOption.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Dialog>
      ) : null}

      {isCancelDialogOpen ? (
        <Dialog
          title="Cancel Subscription"
          description="Langganan akan dihentikan di akhir siklus berjalan. Pengiriman minggu ini tetap diproses."
          onClose={() => setIsCancelDialogOpen(false)}
          footer={
            <>
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => setIsCancelDialogOpen(false)}
                disabled={pendingAction === "cancel"}
              >
                Kembali
              </button>
              <button
                type="button"
                className="rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleCancel}
                disabled={pendingAction === "cancel"}
              >
                {pendingAction === "cancel" ? "Memproses..." : "Ya, Cancel Subscription"}
              </button>
            </>
          }
        >
          <div className="rounded-[1.25rem] border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            Gunakan aksi ini hanya jika pengguna benar-benar ingin berhenti berlangganan. Setelah
            endpoint sukses, status akhir masih mengikuti aturan backend dan akhir siklus aktif.
          </div>
        </Dialog>
      ) : null}
    </SubscriptionPageShell>
  );
}
