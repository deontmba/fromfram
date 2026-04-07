"use client";

import { FormEvent, useState } from "react";
import { calculateBmi, healthMockData } from "@/components/profile/mock-data";
import {
  AlertIcon,
  Field,
  HeartPulseIcon,
  ProfilePageShell,
  RulerIcon,
  ScaleIcon,
  SectionHeading,
  SurfaceCard,
  inputClassName,
} from "@/components/profile/profile-ui";

export function HealthProfileScreen() {
  const [health, setHealth] = useState(healthMockData);
  const [message, setMessage] = useState("");

  const bmi = calculateBmi(health.weight, health.height);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Health profile saved locally.");
  };

  return (
    <ProfilePageShell title="Kesehatan" backHref="/profile">
      <SurfaceCard>
        <SectionHeading
          title="Profil Kesehatan"
          action={<span className="text-sm font-semibold text-emerald-500">Edit</span>}
        />

        <div className="mt-6 rounded-[1.75rem] bg-gradient-to-r from-emerald-100 to-[#d3f8dd] p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
              <HeartPulseIcon className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">BMI Kamu</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-4xl font-semibold text-emerald-700">{bmi.value}</span>
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {bmi.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-zinc-200 p-5">
              <div className="flex items-center justify-center text-zinc-500">
                <ScaleIcon className="size-6" />
              </div>
              <Field label="Berat Badan">
                <input
                  className={`${inputClassName} text-center text-2xl font-semibold text-zinc-900`}
                  inputMode="decimal"
                  value={health.weight}
                  onChange={(event) => {
                    setHealth((currentHealth) => ({
                      ...currentHealth,
                      weight: event.target.value,
                    }));
                    setMessage("");
                  }}
                />
              </Field>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 p-5">
              <div className="flex items-center justify-center text-zinc-500">
                <RulerIcon className="size-6" />
              </div>
              <Field label="Tinggi Badan">
                <input
                  className={`${inputClassName} text-center text-2xl font-semibold text-zinc-900`}
                  inputMode="decimal"
                  value={health.height}
                  onChange={(event) => {
                    setHealth((currentHealth) => ({
                      ...currentHealth,
                      height: event.target.value,
                    }));
                    setMessage("");
                  }}
                />
              </Field>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-200 p-5">
            <p className="font-semibold text-zinc-800">Goals</p>
            <p className="mt-3 text-lg font-semibold text-emerald-500">{health.goals}</p>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-200 p-5">
            <p className="font-semibold text-zinc-800">Preferensi Diet</p>
            <p className="mt-3 text-base text-zinc-500">{health.dietPreference}</p>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-200 p-5">
            <Field label="Alergi & Pantangan">
              <input
                className={inputClassName}
                value={health.allergies}
                onChange={(event) => {
                  setHealth((currentHealth) => ({
                    ...currentHealth,
                    allergies: event.target.value,
                  }));
                  setMessage("");
                }}
              />
            </Field>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-200 p-5">
            <div className="flex items-center gap-3 text-zinc-800">
              <AlertIcon className="size-5 text-rose-400" />
              <p className="font-semibold">Medical Notes</p>
            </div>
            <textarea
              className={`${inputClassName} min-h-32 resize-y`}
              value={health.medicalNotes}
              onChange={(event) => {
                setHealth((currentHealth) => ({
                  ...currentHealth,
                  medicalNotes: event.target.value,
                }));
                setMessage("");
              }}
            />
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="min-h-6 text-sm text-emerald-600">{message}</p>
            <button
              type="submit"
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Save health profile
            </button>
          </div>
        </form>
      </SurfaceCard>
    </ProfilePageShell>
  );
}
