"use client";

import { useEffect, useId } from "react";

type ConfirmDialogVariant = "default" | "destructive" | "admin" | "nutritionist";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  isConfirming?: boolean;
  hideCancel?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = "Batal",
  variant = "default",
  isConfirming = false,
  hideCancel = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const isDestructive = variant === "destructive";

  const getIndicatorColor = () => {
    if (isDestructive) return "bg-red-500";
    if (variant === "admin") return "bg-[#e12533]";
    if (variant === "nutritionist") return "bg-[#1d4ed8]";
    return "bg-[#1abb89]";
  };

  const getConfirmButtonColor = () => {
    if (isDestructive) return "bg-red-600 hover:bg-red-700";
    if (variant === "admin") return "bg-[#e12533] hover:bg-[#c21a26]";
    if (variant === "nutritionist") return "bg-[#1d4ed8] hover:bg-[#173eb8]";
    return "bg-[#1abb89] hover:bg-[#15a97b]";
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isConfirming) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isConfirming, isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      <div className="w-full max-w-[430px] rounded-[18px] border border-black/5 bg-white p-6 shadow-[0_18px_35px_rgba(0,0,0,0.22)]">
        <div
          aria-hidden="true"
          className={`mb-4 h-1.5 w-16 rounded-full ${getIndicatorColor()}`}
        />
        <h2 id={titleId} className="text-[1.35rem] font-bold tracking-[-0.02em] text-neutral-900">
          {title}
        </h2>
        <p id={messageId} className="mt-2 text-[1rem] leading-6 text-neutral-600">
          {message}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              className="h-11 rounded-2xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`h-11 rounded-2xl px-5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(0,0,0,0.16)] transition disabled:cursor-not-allowed disabled:opacity-60 ${getConfirmButtonColor()}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
