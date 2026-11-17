"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import { CustomerPage } from "@/components/ui/customer-page";
import {
  calculateBmi,
  healthMockData,
  type HealthProfile,
} from "@/components/profile/mock-data";

type HealthProfileResponse = {
  profile?: {
    weight?: number;
    height?: number;
    allergies?: string;
    medicalNotes?: string;
  };
  personalization?: {
    goals?: string[];
    dietaryPrefs?: string[];
    allergies?: string[];
    weight?: number;
    height?: number;
  };
  error?: string;
};

type StatusMessage =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

const inputClassName =
  "mt-2 h-14 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-[1.02rem] text-neutral-700 outline-none transition focus:border-[#18b887]";

export function HealthProfileScreen() {
  const [health, setHealth] = useState<HealthProfile>(healthMockData);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadHealthProfile() {
      try {
        const response = await fetch("/api/profile/health", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as HealthProfileResponse | null;

        if (!response.ok || !isMounted || !data) {
          return;
        }

        setHealth((currentHealth) => ({
          ...currentHealth,
          weight: String(data.profile?.weight || data.personalization?.weight || ""),
          height: String(data.profile?.height || data.personalization?.height || ""),
          allergies: data.profile?.allergies || data.personalization?.allergies?.join(', ') || "",
          medicalNotes: data.profile?.medicalNotes || "",
          goals: data.personalization?.goals?.join(', ') || "",
          dietPreference: data.personalization?.dietaryPrefs?.join(', ') || "",
        }));
      } catch {
        // Fallback ke mock data kalau endpoint belum mengembalikan data.
      }
    }

    void loadHealthProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const bmi = calculateBmi(health.weight, health.height);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaveConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaveConfirmOpen(false);
    setIsSaving(true);
    setMessage(null);

    const nextHealth = {
      ...health,
      weight: health.weight.trim(),
      height: health.height.trim(),
      allergies: health.allergies.trim(),
      medicalNotes: health.medicalNotes.trim(),
    };

    try {
      const response = await fetch("/api/profile/health", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: Number.parseFloat(health.weight),
          height: Number.parseFloat(health.height),
          allergies: health.allergies,
          medicalNotes: health.medicalNotes,
        }),
      });
      const data = (await response.json().catch(() => null)) as HealthProfileResponse | null;

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: data?.error ?? "Gagal menyimpan health profile.",
        });
        return;
      }

      setHealth(nextHealth);
      setMessage({
        tone: "success",
        text: "Health profile berhasil diperbarui.",
      });
    } catch {
      setHealth(nextHealth);
      setMessage({
        tone: "success",
        text: "Backend belum tersedia. Perubahan disimpan sementara di halaman ini.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <CustomerPage
      title="Profil kesehatan"
      subtitle="Data dasar untuk menyarankan porsi dan kalori yang pas."
      backHref="/profile"
      backLabel="Profil"
    >
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-6">
          <div className="mt-5 rounded-[18px] bg-[#e8f8f0] px-5 py-5">
            <p className="text-sm font-semibold text-neutral-500">BMI saat ini</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-[2.4rem] font-bold leading-none text-[#109f78]">
                {bmi.value}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#109f78]">
                {bmi.label}
              </span>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="block text-[1rem] font-semibold text-neutral-800">
                  Berat badan (kg)
                </span>
                <input
                  className={`${inputClassName} text-center text-[1.2rem] font-semibold text-neutral-900`}
                  inputMode="decimal"
                  value={health.weight}
                  onChange={(event) => {
                    setHealth((currentHealth) => ({
                      ...currentHealth,
                      weight: event.target.value,
                    }));
                    setMessage(null);
                  }}
                />
              </label>

              <label className="block">
                <span className="block text-[1rem] font-semibold text-neutral-800">
                  Tinggi badan (cm)
                </span>
                <input
                  className={`${inputClassName} text-center text-[1.2rem] font-semibold text-neutral-900`}
                  inputMode="decimal"
                  value={health.height}
                  onChange={(event) => {
                    setHealth((currentHealth) => ({
                      ...currentHealth,
                      height: event.target.value,
                    }));
                    setMessage(null);
                  }}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4">
                <p className="text-sm font-semibold text-neutral-500">Goals</p>
                <p className="mt-2 text-[1rem] font-semibold text-neutral-900">{health.goals}</p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4">
                <p className="text-sm font-semibold text-neutral-500">Preferensi diet</p>
                <p className="mt-2 text-[1rem] font-semibold text-neutral-900">
                  {health.dietPreference}
                </p>
              </div>
            </div>

            <label className="block">
              <span className="block text-[1rem] font-semibold text-neutral-800">
                Alergi & pantangan
              </span>
              <input
                className={inputClassName}
                value={health.allergies}
                onChange={(event) => {
                  setHealth((currentHealth) => ({
                    ...currentHealth,
                    allergies: event.target.value,
                  }));
                  setMessage(null);
                }}
              />
            </label>

            <label className="block">
              <span className="block text-[1rem] font-semibold text-neutral-800">
                Medical notes
              </span>
              <textarea
                className="mt-2 min-h-32 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-[1.02rem] text-neutral-700 outline-none transition focus:border-[#18b887]"
                value={health.medicalNotes}
                onChange={(event) => {
                  setHealth((currentHealth) => ({
                    ...currentHealth,
                    medicalNotes: event.target.value,
                  }));
                  setMessage(null);
                }}
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-6">
                {message ? (
                  <p
                    className={`text-sm font-medium ${
                      message.tone === "error" ? "text-red-500" : "text-[#11af82]"
                    }`}
                  >
                    {message.text}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="h-14 rounded-2xl bg-[#1abb89] px-6 text-[1.05rem] font-bold text-white shadow-[0_8px_16px_rgba(18,168,123,0.35)] transition hover:bg-[#15a97b] disabled:opacity-60"
              >
                {isSaving ? "Menyimpan..." : "Simpan profil kesehatan"}
              </button>
            </div>
          </form>
        </div>
    </CustomerPage>
    <ConfirmDialog
      isOpen={isSaveConfirmOpen}
      title="Konfirmasi Perubahan Data Kesehatan"
      message="Apakah Anda yakin ingin menyimpan perubahan data kesehatan?"
      confirmLabel="Ya, Simpan"
      cancelLabel="Batal"
      isConfirming={isSaving}
      onCancel={() => setIsSaveConfirmOpen(false)}
      onConfirm={handleConfirmSave}
    />
    </>
  );
}
