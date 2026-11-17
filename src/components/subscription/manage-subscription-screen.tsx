"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { CustomerPage } from "@/components/ui/customer-page";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
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
    description: "Jeda lebih lama tanpa berhenti.",
  },
  {
    weeks: 4,
    label: "4 minggu",
    description: "Batas maksimum sesuai backend.",
  },
];


const panelClassName =
  "rounded-[18px] border border-black/5 bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.05)]";

type ManagedAddress = {
  label?: string | null;
  street?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  isDefault?: boolean | null;
};

type AddressResponse = {
  addresses?: ManagedAddress[];
  address?: ManagedAddress;
  data?: ManagedAddress[] | ManagedAddress;
};

function pickAddressText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmedValue = value?.trim();

    if (trimmedValue) {
      return trimmedValue;
    }
  }

  return null;
}

function getAddressesFromResponse(data: AddressResponse | null) {
  if (Array.isArray(data?.addresses)) {
    return data.addresses;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (data?.address) {
    return [data.address];
  }

  if (data?.data) {
    return [data.data];
  }

  return [];
}

function formatAddressLabel(address: ManagedAddress) {
  return [
    pickAddressText(address.label),
    pickAddressText(address.street),
    pickAddressText(address.city),
    pickAddressText(address.province),
    pickAddressText(address.postalCode),
  ]
    .filter(Boolean)
    .join(", ");
}

async function getDefaultAddressLabel(signal?: AbortSignal) {
  const response = await fetch("/api/profile/address", {
    cache: "no-store",
    signal,
  });
  const data = (await response.json().catch(() => null)) as AddressResponse | null;

  if (!response.ok) {
    return null;
  }

  const addresses = getAddressesFromResponse(data);
  const defaultAddress = addresses.find((address) => address.isDefault === true) ?? addresses[0];

  return defaultAddress ? formatAddressLabel(defaultAddress) || null : null;
}

async function getSubscriptionViewModel(signal?: AbortSignal) {
  const payload = await getMySubscription(signal);
  const mappedSubscription = mapSubscriptionResponseToViewModel(payload);
  const addressLabel = await getDefaultAddressLabel(signal).catch(() => null);

  if (!addressLabel) {
    return mappedSubscription;
  }

  return {
    ...mappedSubscription,
    shippingAddressLabel: addressLabel,
    shippingAddressMissing: false,
  };
}

export function ManageSubscriptionScreen() {
  const [subscription, setSubscription] = useState<ManageSubscriptionViewModel | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [pauseWeeks, setPauseWeeks] = useState(1);
  const [isSkipConfirmOpen, setIsSkipConfirmOpen] = useState(false);
  const [isResumeConfirmOpen, setIsResumeConfirmOpen] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadSubscription() {
      try {
        const mappedSubscription = await getSubscriptionViewModel(abortController.signal);
        setSubscription(mappedSubscription);
        setFeedback(null);
      } catch {
        // No subscription yet: the empty-state card below explains what to do.
        setSubscription(null);
        setFeedback(null);
      } finally {
        setIsLoading(false);
      }
    }

    void loadSubscription();

    return () => {
      abortController.abort();
    };
  }, []);

  const refreshAfterAction = async () => {
    const mappedSubscription = await getSubscriptionViewModel();
    setSubscription(mappedSubscription);
  };

  const handleSkip = () => {
    setIsSkipConfirmOpen(true);
  };

  const handleConfirmSkip = async () => {
    setIsSkipConfirmOpen(false);
    if (!subscription?.skippableWeeklyBoxId) {
      setFeedback({
        tone: "error",
        message: "Weekly box belum tersedia untuk di-skip.",
      });
      return;
    }

    setPendingAction("skip");
    setFeedback(null);

    try {
      const response = await skipWeeklyBox(subscription!.skippableWeeklyBoxId!);
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
        note: response.note ?? (response.resumeDate ? `Aktif kembali: ${response.resumeDate}` : undefined),
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

  const handleResume = () => {
    setIsResumeConfirmOpen(true);
  };

  const handleConfirmResume = async () => {
    setIsResumeConfirmOpen(false);
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

  const disableActions = !subscription || subscription.isPreview || pendingAction !== null;

  return (
    <>
      <CustomerPage title="Kelola langganan" subtitle="Lihat paket aktif, lewati satu minggu, jeda, atau berhenti.">
          {/* Tampilkan SummarySection hanya jika ada subscription nyata */}
          {!isLoading && subscription && !subscription.isPreview ? (
            <SummarySection subscription={subscription} />
          ) : !isLoading && !subscription ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
              <p className="text-[1.1rem] font-bold text-neutral-700">Kamu belum berlangganan</p>
              <p className="mt-2 text-sm text-neutral-500">
                Pilih paket dan jumlah porsi untuk mulai menerima meal kit.
              </p>
              <Link
                href="/subscription/select-plan"
                className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#13b987] px-6 text-sm font-semibold text-white transition hover:bg-[#0f996f]"
              >
                Pilih Paket
              </Link>
            </div>
          ) : isLoading ? (
            <div className="animate-pulse rounded-2xl bg-white px-6 py-8">
              <div className="h-5 w-1/3 rounded bg-neutral-200" />
              <div className="mt-3 h-8 w-1/2 rounded bg-neutral-200" />
              <div className="mt-4 h-24 rounded bg-neutral-200" />
            </div>
          ) : null}

          {feedback ? (
            <div className={`mt-5 rounded-2xl px-4 py-4 ${feedbackClassName(feedback.tone)}`}>
              <p className="font-semibold">{feedback.message}</p>
              {feedback.note ? <p className="mt-1 text-sm opacity-80">{feedback.note}</p> : null}
            </div>
          ) : null}

          <div className="mt-5 space-y-5">
            {subscription ? (
              <ActionsSection
                subscription={subscription}
                pendingAction={pendingAction}
                disableActions={disableActions}
                onSkip={handleSkip}
                onPause={() => setIsPauseDialogOpen(true)}
                onResume={handleResume}
                onCancel={() => setIsCancelDialogOpen(true)}
              />
            ) : null}
          </div>
      </CustomerPage>

      {isPauseDialogOpen ? (
        <ActionDialog
          title="Jeda langganan"
          description="Pilih berapa lama langganan dijeda. Maksimal 4 minggu."
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
              {pendingAction === "pause" ? "Menyimpan..." : "Jeda langganan"}
            </button>
          </div>
        </ActionDialog>
      ) : null}

      {isCancelDialogOpen ? (
        <ActionDialog
          title="Berhenti berlangganan"
          description="Langganan akan dihentikan di akhir siklus berjalan. Pengiriman aktif tetap diproses."
          variant="destructive"
          onClose={() => setIsCancelDialogOpen(false)}
        >
          <div className="rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-4 text-sm text-[#9f1239]">
            Kamu tetap menerima pengiriman sampai akhir periode yang sudah dibayar.
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
              {pendingAction === "cancel" ? "Memproses..." : "Ya, berhenti"}
            </button>
          </div>
        </ActionDialog>
      ) : null}

      <ConfirmDialog
        isOpen={isSkipConfirmOpen}
        title="Lewati pengiriman minggu depan?"
        message="Minggu depan tidak ada pengiriman. Pengiriman lanjut lagi minggu setelahnya."
        confirmLabel="Ya, lewati"
        cancelLabel="Batal"
        isConfirming={pendingAction === "skip"}
        onCancel={() => setIsSkipConfirmOpen(false)}
        onConfirm={handleConfirmSkip}
      />
      <ConfirmDialog
        isOpen={isResumeConfirmOpen}
        title="Aktifkan lagi langganan?"
        message="Pengiriman lanjut sesuai jadwal berikutnya."
        confirmLabel="Ya, Aktifkan"
        cancelLabel="Batal"
        isConfirming={pendingAction === "resume"}
        onCancel={() => setIsResumeConfirmOpen(false)}
        onConfirm={handleConfirmResume}
      />
    </>
  );
}

function getStatusBadgeClassName(status: ManageSubscriptionViewModel["status"]) {
  if (status === "active") {
    return "bg-white text-[#109f78]";
  }

  if (status === "paused") {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  if (status === "unpaid") {
    return "bg-orange-100 text-orange-700";
  }

  return "bg-neutral-200 text-neutral-600";
}

function SummarySection({
  subscription,
}: {
  subscription: ManageSubscriptionViewModel;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">Paket aktif</p>
          <h2 className="mt-1 text-xl font-bold text-neutral-900">
            {subscription.planLabel}
          </h2>
          {!subscription.isPreview ? (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <span className="text-2xl font-bold leading-none text-neutral-900">{subscription.priceLabel}</span>
              {subscription.billingLabel ? (
                <span className="pb-0.5 text-sm text-neutral-500">
                  {subscription.billingLabel}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              Kamu belum berlangganan.
            </p>
          )}
          {subscription.pausedUntilLabel ? (
            <p className="mt-3 text-sm text-amber-700">
              Dijeda sampai {subscription.pausedUntilLabel}
            </p>
          ) : null}
        </div>

        <span className={`rounded-full px-4 py-1 text-sm font-semibold ${getStatusBadgeClassName(subscription.status)}`}>
          {subscription.statusLabel}
        </span>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-neutral-500">Porsi</dt>
          <dd className="mt-1 font-semibold text-neutral-900">
            {subscription.servingLabel}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-500">Mulai</dt>
          <dd className="mt-1 font-semibold text-neutral-900">
            {subscription.startDateLabel}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-500">Tagihan berikutnya</dt>
          <dd className="mt-1 font-semibold text-neutral-900">
            {subscription.nextBillingLabel}
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-neutral-100 pt-5">
        <p className="text-sm text-neutral-500">Alamat pengiriman</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-neutral-800">
            {subscription.shippingAddressLabel}
          </p>
          <Link
            href="/profile/address"
            className="text-sm font-semibold text-[#07845e] hover:underline"
          >
            {subscription.shippingAddressMissing ? "Tambah alamat" : "Ubah alamat"}
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
      <h2 className="text-base font-semibold text-neutral-900">Atur langganan</h2>

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
            <p className="text-[1rem] font-semibold text-neutral-900">Lewati 1 minggu</p>
            <p className="mt-1 text-sm text-neutral-500">
              {pendingAction === "skip"
                ? "Memproses..."
                : subscription.skippableWeeklyBoxId
                  ? "Lewati pengiriman minggu berikutnya."
                  : "Belum ada pengiriman minggu depan yang bisa dilewati."}
            </p>
          </div>
          <span className="text-sm font-semibold text-[#07845e]">Lewati</span>
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
              <p className="text-[1rem] font-semibold text-neutral-900">Aktifkan lagi</p>
              <p className="mt-1 text-sm text-neutral-500">
                {pendingAction === "resume"
                  ? "Memproses..."
                  : "Lanjutkan langganan yang sedang dijeda."}
              </p>
            </div>
            <span className="text-sm font-semibold text-[#07845e]">Aktifkan</span>
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
              <p className="text-[1rem] font-semibold text-neutral-900">Jeda langganan</p>
              <p className="mt-1 text-sm text-neutral-500">
                Jeda hingga 4 minggu.
              </p>
            </div>
            <span className="text-sm font-semibold text-[#07845e]">Jeda</span>
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
            <p className="text-[1rem] font-semibold text-[#be123c]">Berhenti berlangganan</p>
            <p className="mt-1 text-sm text-[#9f1239]">
              Berhenti berlangganan di akhir siklus berjalan.
            </p>
          </div>
          <span className="text-sm font-semibold text-[#be123c]">Berhenti</span>
        </button>
      </div>
    </div>
  );
}

function ActionDialog({
  title,
  description,
  variant = "default",
  children,
  onClose,
}: {
  title: string;
  description: string;
  variant?: "default" | "destructive";
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="relative overflow-hidden w-full max-w-[460px] rounded-3xl border border-white/20 bg-[#fafafa]/95 backdrop-blur-md px-6 py-6 shadow-[0_24px_50px_rgba(0,0,0,0.22)] ring-1 ring-black/5">
        {/* Accent Top Line */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${variant === "destructive" ? "bg-[#e11d48]" : "bg-[#1abb89]"}`} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-neutral-400">Langganan</p>
            <h3 className="mt-2 text-[1.45rem] font-bold tracking-[-0.02em] text-neutral-900">
              {title}
            </h3>
            <p className="mt-2 text-sm text-neutral-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-2xl border border-neutral-200 bg-white px-2 py-1.5 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-700"
          >
            <X aria-hidden="true" className="h-4 w-4" />
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
