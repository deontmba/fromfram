"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  createPreviewSubscriptionViewModel,
  type FeedbackState,
  getErrorMessage,
  mapSubscriptionResponseToViewModel,
  type ManageSubscriptionViewModel,
} from "@/components/subscription/subscription-mappers";
import {
  cancelMySubscription,
  getMySubscription,
  pauseMySubscription,
  resumeMySubscription,
  skipWeeklyBox,
  updateMySubscription,
} from "@/components/subscription/subscription-service";

const PAUSE_OPTIONS = [
  {
    weeks: 1,
    label: "1 minggu",
    description: "Lanjut lagi minggu depan.",
  },
  {
    weeks: 2,
    label: "2 minggu",
    description: "Cocok untuk jeda singkat.",
  },
  {
    weeks: 3,
    label: "3 minggu",
    description: "Pause lebih lama tanpa stop total.",
  },
  {
    weeks: 4,
    label: "4 minggu",
    description: "Batas maksimum sesuai backend.",
  },
];

const PLAN_OPTIONS = [
  {
    key: "weekly" as const,
    title: "Mingguan",
    priceLabel: "Rp 350.000",
    billingLabel: "/minggu",
    helperText: "Fleksibel, bisa cancel kapan saja",
  },
  {
    key: "monthly" as const,
    title: "Bulanan",
    priceLabel: "Rp 1.200.000",
    billingLabel: "/bulan",
    helperText: "Pilihan paling praktis",
    badge: "Aktif",
  },
  {
    key: "yearly" as const,
    title: "Tahunan",
    priceLabel: "Rp 12.000.000",
    billingLabel: "/tahun",
    helperText: "Hemat 29% untuk jangka panjang",
    badge: "Hemat",
  },
];

const SERVING_OPTIONS = [1, 2, 3, 4, 5, 6];
const panelClassName =
  "rounded-[18px] border border-black/5 bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.05)]";

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
          message: "Data subscription belum tersedia untuk akun ini.",
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
    void handleSubscriptionUpdate(planKey, selectedServing);
  };

  const handleServingChange = (serving: number) => {
    void handleSubscriptionUpdate(selectedPlan, serving);
  };

  const refreshAfterAction = async () => {
    const payload = await getMySubscription();
    const mappedSubscription = mapSubscriptionResponseToViewModel(payload);
    setSubscription(mappedSubscription);
    setSelectedPlan(mappedSubscription.planKey);
    setSelectedServing(mappedSubscription.servingCount);
  };

  const handleSubscriptionUpdate = async (
    nextPlan: typeof selectedPlan,
    nextServing: number,
  ) => {
    const previousPlan = selectedPlan;
    const previousServing = selectedServing;

    setPendingAction("update");
    setSelectedPlan(nextPlan);
    setSelectedServing(nextServing);
    setFeedback(null);

    try {
      await updateMySubscription({
        planType:
          nextPlan === "weekly"
            ? "MINGGUAN"
            : nextPlan === "monthly"
              ? "BULANAN"
              : "TAHUNAN",
        servings: nextServing,
      });

      await refreshAfterAction();
      setFeedback({
        tone: "success",
        message: "Plan dan serving berhasil diperbarui.",
      });
    } catch (error) {
      setSelectedPlan(previousPlan);
      setSelectedServing(previousServing);
      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setPendingAction(null);
    }
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
    setFeedback(null);

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
    setFeedback(null);

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
    setFeedback(null);

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
    setFeedback(null);

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

  const disableUpdate = subscription.isPreview || pendingAction === "update";
  const disableActions = subscription.isPreview || pendingAction !== null;

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]"
        />

        <section className="relative mx-auto w-full max-w-[940px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-5 py-6 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-2xl border border-neutral-300 bg-white px-4 text-[1rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Kembali
            </Link>
            <Link
              href="/subscription/select-plan"
              className="inline-flex h-11 items-center rounded-2xl bg-[#1abb89] px-5 text-[1rem] font-semibold text-white shadow-[0_8px_16px_rgba(18,168,123,0.28)] transition hover:bg-[#15a97b]"
            >
              Select plan
            </Link>
          </div>

          <SummarySection subscription={subscription} />

          {feedback ? (
            <div className={`mt-5 rounded-2xl px-4 py-4 ${feedbackClassName(feedback.tone)}`}>
              <p className="font-semibold">{feedback.message}</p>
              {feedback.note ? <p className="mt-1 text-sm opacity-80">{feedback.note}</p> : null}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-4 text-sm text-neutral-500">
              Memuat data subscription...
            </div>
          ) : null}

          {!isLoading && subscription.isPreview ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              <p className="font-semibold">Belum ada subscription aktif untuk akun ini.</p>
              <p className="mt-2">
                Buat subscription dulu dari halaman select plan supaya aksi kelola bisa berjalan
                penuh.
              </p>
            </div>
          ) : null}

          <div className="mt-5 space-y-5">
            <div className={panelClassName}>
              <p className="text-sm font-semibold text-[#11af82]">Subscription</p>
              <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.02em] text-neutral-900">
                Change plan
              </h2>
              <p className="mt-2 text-[1rem] text-neutral-500">
                Pilih plan baru. Saat dipilih, perubahan langsung dikirim ke backend subscription.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {PLAN_OPTIONS.map((plan) => {
                  const isActive = selectedPlan === plan.key;

                  return (
                    <button
                      key={plan.key}
                      type="button"
                      disabled={disableUpdate}
                      onClick={() => handlePlanChange(plan.key)}
                      className={`rounded-2xl border px-4 py-5 text-left transition ${
                        isActive
                          ? "border-[#1abb89] bg-[#e8f8f0] shadow-[0_8px_16px_rgba(18,168,123,0.12)]"
                          : "border-neutral-200 bg-[#fafafa] hover:bg-white"
                      } ${disableUpdate ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[1.08rem] font-semibold text-neutral-900">
                            {plan.title}
                          </p>
                          <p className="mt-2 text-[1.35rem] font-bold text-neutral-900">
                            {plan.priceLabel}
                          </p>
                          <p className="mt-1 text-sm text-neutral-500">{plan.billingLabel}</p>
                        </div>
                        {plan.badge ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#109f78]">
                            {plan.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-4 text-sm text-neutral-600">{plan.helperText}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={panelClassName}>
              <p className="text-sm font-semibold text-[#11af82]">Subscription</p>
              <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.02em] text-neutral-900">
                Serving size
              </h2>
              <p className="mt-2 text-[1rem] text-neutral-500">
                Serving size tersimpan ke subscription aktif saat dipilih.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {SERVING_OPTIONS.map((serving) => {
                  const isActive = selectedServing === serving;

                  return (
                    <button
                      key={serving}
                      type="button"
                      disabled={disableUpdate}
                      onClick={() => handleServingChange(serving)}
                      className={`rounded-2xl border px-4 py-5 text-center transition ${
                        isActive
                          ? "border-[#1abb89] bg-[#e8f8f0] shadow-[0_8px_16px_rgba(18,168,123,0.12)]"
                          : "border-neutral-200 bg-[#fafafa] hover:bg-white"
                      } ${disableUpdate ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <p className="text-[1.55rem] font-bold text-neutral-900">{serving}</p>
                      <p className="mt-1 text-sm text-neutral-500">orang</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <ActionsSection
              subscription={subscription}
              pendingAction={pendingAction}
              disableActions={disableActions}
              onSkip={handleSkip}
              onPause={() => setIsPauseDialogOpen(true)}
              onResume={handleResume}
              onCancel={() => setIsCancelDialogOpen(true)}
            />
          </div>
        </section>
      </main>

      {isPauseDialogOpen ? (
        <ActionDialog
          title="Pause subscription"
          description="Pilih durasi jeda. Endpoint backend hanya mengizinkan maksimum 4 minggu."
          onClose={() => setIsPauseDialogOpen(false)}
        >
          <div className="space-y-3">
            {PAUSE_OPTIONS.map((pauseOption) => {
              const isActive = pauseWeeks === pauseOption.weeks;

              return (
                <label
                  key={pauseOption.weeks}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                    isActive ? "border-[#1abb89] bg-[#e8f8f0]" : "border-neutral-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="pause-weeks"
                    className="mt-1 h-4 w-4 accent-[#1abb89]"
                    checked={isActive}
                    onChange={() => setPauseWeeks(pauseOption.weeks)}
                  />
                  <span>
                    <span className="block text-[1rem] font-semibold text-neutral-900">
                      {pauseOption.label}
                    </span>
                    <span className="mt-1 block text-sm text-neutral-500">
                      {pauseOption.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="h-11 rounded-2xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
              onClick={() => setIsPauseDialogOpen(false)}
              disabled={pendingAction === "pause"}
            >
              Batal
            </button>
            <button
              type="button"
              className="h-11 rounded-2xl bg-[#1abb89] px-5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(18,168,123,0.28)] transition hover:bg-[#15a97b] disabled:opacity-60"
              onClick={handlePause}
              disabled={pendingAction === "pause"}
            >
              {pendingAction === "pause" ? "Menyimpan..." : "Pause subscription"}
            </button>
          </div>
        </ActionDialog>
      ) : null}

      {isCancelDialogOpen ? (
        <ActionDialog
          title="Cancel subscription"
          description="Langganan akan dihentikan di akhir siklus berjalan. Pengiriman aktif tetap diproses."
          onClose={() => setIsCancelDialogOpen(false)}
        >
          <div className="rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-4 text-sm text-[#9f1239]">
            Gunakan aksi ini hanya jika pengguna benar-benar ingin berhenti berlangganan.
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="h-11 rounded-2xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={pendingAction === "cancel"}
            >
              Kembali
            </button>
            <button
              type="button"
              className="h-11 rounded-2xl bg-[#e11d48] px-5 text-sm font-semibold text-white transition hover:bg-[#be123c] disabled:opacity-60"
              onClick={handleCancel}
              disabled={pendingAction === "cancel"}
            >
              {pendingAction === "cancel" ? "Memproses..." : "Ya, cancel subscription"}
            </button>
          </div>
        </ActionDialog>
      ) : null}
    </>
  );
}

function SummarySection({
  subscription,
}: {
  subscription: ManageSubscriptionViewModel;
}) {
  return (
    <div className="mt-6 rounded-[18px] bg-[linear-gradient(135deg,#18ba89_0%,#72d9b0_55%,#d9f6ea_100%)] px-6 py-6 text-white shadow-[0_14px_30px_rgba(18,168,123,0.22)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/80">Current subscription</p>
          <h1 className="mt-2 text-[1.8rem] font-bold tracking-[-0.02em]">
            {subscription.planLabel}
          </h1>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <span className="text-[2rem] font-bold leading-none">{subscription.priceLabel}</span>
            <span className="pb-1 text-sm font-semibold text-white/85">
              {subscription.billingLabel}
            </span>
          </div>
          {subscription.pausedUntilLabel ? (
            <p className="mt-3 text-sm text-white/85">
              Dijeda sampai {subscription.pausedUntilLabel}
            </p>
          ) : null}
        </div>

        <span className="rounded-full bg-white px-4 py-1 text-sm font-semibold text-[#109f78]">
          {subscription.statusLabel}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/18 px-4 py-4 backdrop-blur">
          <p className="text-sm font-semibold text-white/80">Serving</p>
          <p className="mt-2 text-[1.15rem] font-semibold text-white">
            {subscription.servingLabel}
          </p>
        </div>
        <div className="rounded-2xl bg-white/18 px-4 py-4 backdrop-blur">
          <p className="text-sm font-semibold text-white/80">Mulai</p>
          <p className="mt-2 text-[1.15rem] font-semibold text-white">
            {subscription.startDateLabel}
          </p>
        </div>
        <div className="rounded-2xl bg-white/18 px-4 py-4 backdrop-blur">
          <p className="text-sm font-semibold text-white/80">Next billing</p>
          <p className="mt-2 text-[1.15rem] font-semibold text-white">
            {subscription.nextBillingLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/14 px-4 py-4 backdrop-blur">
        <p className="text-sm font-semibold text-white/80">Alamat pengiriman</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-3xl text-[1rem] text-white">
            {subscription.shippingAddressLabel}
          </p>
          <Link
            href="/profile/address"
            className="text-sm font-semibold text-white transition hover:text-white/85"
          >
            Ubah alamat
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActionsSection({
  subscription,
  pendingAction,
  disableActions,
  onSkip,
  onPause,
  onResume,
  onCancel,
}: {
  subscription: ManageSubscriptionViewModel;
  pendingAction: string | null;
  disableActions: boolean;
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  const isPaused = subscription.status === "paused";

  return (
    <div className={panelClassName}>
      <p className="text-sm font-semibold text-[#11af82]">Actions</p>
      <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.02em] text-neutral-900">
        Manage subscription
      </h2>
      <p className="mt-2 text-[1rem] text-neutral-500">
        Skip, pause, resume, atau cancel subscription dari satu halaman yang sama.
      </p>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          disabled={disableActions || !subscription.skippableWeeklyBoxId}
          onClick={onSkip}
          className={`flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4 text-left transition hover:bg-white ${
            disableActions || !subscription.skippableWeeklyBoxId
              ? "cursor-not-allowed opacity-60"
              : ""
          }`}
        >
          <div>
            <p className="text-[1rem] font-semibold text-neutral-900">Skip 1 minggu</p>
            <p className="mt-1 text-sm text-neutral-500">
              {pendingAction === "skip"
                ? "Memproses..."
                : subscription.skippableWeeklyBoxId
                  ? "Lewati pengiriman minggu berikutnya."
                  : "Weekly box berikutnya belum tersedia untuk di-skip."}
            </p>
          </div>
          <span className="text-sm font-semibold text-[#11af82]">Skip</span>
        </button>

        {isPaused ? (
          <button
            type="button"
            disabled={disableActions}
            onClick={onResume}
            className={`flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4 text-left transition hover:bg-white ${
              disableActions ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <div>
              <p className="text-[1rem] font-semibold text-neutral-900">Resume subscription</p>
              <p className="mt-1 text-sm text-neutral-500">
                {pendingAction === "resume"
                  ? "Memproses..."
                  : "Aktifkan kembali subscription yang sedang dijeda."}
              </p>
            </div>
            <span className="text-sm font-semibold text-[#11af82]">Resume</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={disableActions}
            onClick={onPause}
            className={`flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4 text-left transition hover:bg-white ${
              disableActions ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <div>
              <p className="text-[1rem] font-semibold text-neutral-900">Pause subscription</p>
              <p className="mt-1 text-sm text-neutral-500">
                Jeda subscription hingga maksimal 4 minggu.
              </p>
            </div>
            <span className="text-sm font-semibold text-[#11af82]">Pause</span>
          </button>
        )}

        <button
          type="button"
          disabled={disableActions}
          onClick={onCancel}
          className={`flex w-full items-center justify-between rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-4 text-left transition hover:bg-[#ffe4e8] ${
            disableActions ? "cursor-not-allowed opacity-60" : ""
          }`}
        >
          <div>
            <p className="text-[1rem] font-semibold text-[#be123c]">Cancel subscription</p>
            <p className="mt-1 text-sm text-[#9f1239]">
              Berhenti berlangganan di akhir siklus berjalan.
            </p>
          </div>
          <span className="text-sm font-semibold text-[#be123c]">Cancel</span>
        </button>
      </div>
    </div>
  );
}

function ActionDialog({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[460px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-6 py-6 shadow-[0_18px_35px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#11af82]">Subscription</p>
            <h3 className="mt-2 text-[1.45rem] font-bold tracking-[-0.02em] text-neutral-900">
              {title}
            </h3>
            <p className="mt-2 text-sm text-neutral-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Tutup
          </button>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function feedbackClassName(tone: FeedbackState["tone"]) {
  if (tone === "success") {
    return "border border-[#b7efd9] bg-[#e8f8f0] text-[#0f8d68]";
  }

  if (tone === "error") {
    return "border border-[#fecdd3] bg-[#fff1f2] text-[#be123c]";
  }

  return "border border-sky-100 bg-sky-50 text-sky-700";
}
