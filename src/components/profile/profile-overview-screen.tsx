"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  profileMockData,
  type ProfileDetails,
} from "@/components/profile/mock-data";

type ProfileResponse = {
  user?: {
    name?: string;
    email?: string;
    createdAt?: string;
  };
  data?: {
    name?: string;
    email?: string;
    createdAt?: string;
  };
  error?: string;
  message?: string;
};

type StatusMessage =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

const inputClassName =
  "mt-2 h-14 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-[1.02rem] text-neutral-700 outline-none transition focus:border-[#18b887]";
const panelClassName =
  "rounded-[18px] border border-black/5 bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.05)]";

export function ProfileOverviewScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDetails>(profileMockData);
  const [draft, setDraft] = useState<ProfileDetails>(profileMockData);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as ProfileResponse | null;
        const user = data?.user ?? data?.data;

        if (!response.ok || !isMounted || !user) {
          return;
        }

        const mappedProfile = {
          fullName: user.name ?? profileMockData.fullName,
          email: user.email ?? profileMockData.email,
          phoneNumber: profileMockData.phoneNumber,
          memberLabel: "Active Member",
          joinedAt: user.createdAt
            ? `Joined ${new Intl.DateTimeFormat("en", {
                month: "short",
                year: "numeric",
              }).format(new Date(user.createdAt))}`
            : profileMockData.joinedAt,
        };

        setProfile(mappedProfile);
        setDraft(mappedProfile);
      } catch {
        // Fallback ke data lokal jika request profil gagal.
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const openEditDialog = () => {
    setDraft(profile);
    setIsEditOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditOpen(false);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const nextProfile = {
      ...profile,
      fullName: draft.fullName.trim() || profile.fullName,
      email: draft.email.trim() || profile.email,
    };

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.fullName,
          email: draft.email,
        }),
      });
      const data = (await response.json().catch(() => null)) as ProfileResponse | null;
      const user = data?.user ?? data?.data;

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: data?.error ?? data?.message ?? "Gagal menyimpan profile.",
        });
        return;
      }

      const nextProfile = {
        ...profile,
        fullName: user?.name ?? draft.fullName,
        email: user?.email ?? draft.email,
      };
      setProfile(nextProfile);
      setDraft(nextProfile);
      setMessage({
        tone: "success",
        text: "Profile berhasil diperbarui.",
      });
      setIsEditOpen(false);
    } catch {
      setProfile(nextProfile);
      setDraft(nextProfile);
      setMessage({
        tone: "success",
        text: "Backend belum tersedia. Perubahan disimpan sementara di halaman ini.",
      });
      setIsEditOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
    }
  };

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]"
        />

        <section className="relative mx-auto w-full max-w-[880px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-5 py-6 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-2xl border border-neutral-300 bg-white px-4 text-[1rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Kembali
            </Link>
            <button
              type="button"
              onClick={openEditDialog}
              className="inline-flex h-11 items-center rounded-2xl bg-[#1abb89] px-5 text-[1rem] font-semibold text-white shadow-[0_8px_16px_rgba(18,168,123,0.28)] transition hover:bg-[#15a97b]"
            >
              Edit profile
            </button>
          </div>

          <div className="mt-6 rounded-[18px] border border-black/5 bg-white px-6 py-7 text-center shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#dff7ee] text-[1.8rem] font-bold text-[#109f78]">
              {getInitials(profile.fullName)}
            </div>
            <h1 className="mt-4 text-[1.9rem] font-bold tracking-[-0.02em] text-neutral-900">
              {profile.fullName}
            </h1>
            <div className="mt-3 inline-flex rounded-full bg-[#dff7ee] px-4 py-1 text-sm font-semibold text-[#109f78]">
              {profile.memberLabel}
            </div>
            <p className="mt-3 text-[0.98rem] text-neutral-500">{profile.joinedAt}</p>

            <div className="mt-7 grid gap-3 border-t border-neutral-200 pt-5 sm:grid-cols-3">
              <div>
                <p className="text-[1.35rem] font-bold text-neutral-900">24</p>
                <p className="text-sm text-neutral-500">Boxes received</p>
              </div>
              <div>
                <p className="text-[1.35rem] font-bold text-neutral-900">Weekly</p>
                <p className="text-sm text-neutral-500">Active plan</p>
              </div>
              <div>
                <p className="text-[1.35rem] font-bold text-neutral-900">12</p>
                <p className="text-sm text-neutral-500">Favorite meals</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className={panelClassName}>
              <p className="text-sm font-semibold text-[#11af82]">Profile</p>
              <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.02em] text-neutral-900">
                Main profile
              </h2>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={openEditDialog}
                  className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4 text-left transition hover:bg-white"
                >
                  <div>
                    <p className="text-[1rem] font-semibold text-neutral-900">
                      Edit profile details
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Update nama dan email akun
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#11af82]">Buka</span>
                </button>

                <Link
                  href="/profile/health"
                  className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4 transition hover:bg-white"
                >
                  <div>
                    <p className="text-[1rem] font-semibold text-neutral-900">Profil kesehatan</p>
                    <p className="mt-1 text-sm text-neutral-500">Goals, BMI, alergi</p>
                  </div>
                  <span className="text-sm font-semibold text-[#11af82]">Buka</span>
                </Link>

                <Link
                  href="/profile/address"
                  className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4 transition hover:bg-white"
                >
                  <div>
                    <p className="text-[1rem] font-semibold text-neutral-900">Kelola alamat</p>
                    <p className="mt-1 text-sm text-neutral-500">Tambah, ubah, pilih utama</p>
                  </div>
                  <span className="text-sm font-semibold text-[#11af82]">Buka</span>
                </Link>
              </div>

              <div className="mt-5 space-y-3 border-t border-neutral-200 pt-5">
                <div className="rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4">
                  <p className="text-sm font-semibold text-neutral-500">Email</p>
                  <p className="mt-1 text-[1rem] text-neutral-900">{profile.email}</p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4">
                  <p className="text-sm font-semibold text-neutral-500">Phone number</p>
                  <p className="mt-1 text-[1rem] text-neutral-900">{profile.phoneNumber}</p>
                </div>
              </div>

              <div className="mt-4 min-h-6">
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
            </div>

            <div className={panelClassName}>
              <p className="text-sm font-semibold text-[#11af82]">Settings</p>
              <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.02em] text-neutral-900">
                Account settings
              </h2>

              <div className="mt-5 space-y-3">
                <Link
                  href="/profile/notifications"
                  className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4 transition hover:bg-white"
                >
                  <div>
                    <p className="text-[1rem] font-semibold text-neutral-900">Notifications</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Atur pengingat dan update akun
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#11af82]">Buka</span>
                </Link>

                <Link
                  href="/profile/security"
                  className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4 transition hover:bg-white"
                >
                  <div>
                    <p className="text-[1rem] font-semibold text-neutral-900">
                      Privacy & security
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">Kelola keamanan akun</p>
                  </div>
                  <span className="text-sm font-semibold text-[#11af82]">Buka</span>
                </Link>

                <Link
                  href="/profile/help"
                  className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-4 transition hover:bg-white"
                >
                  <div>
                    <p className="text-[1rem] font-semibold text-neutral-900">Help & support</p>
                    <p className="mt-1 text-sm text-neutral-500">Butuh bantuan lebih lanjut</p>
                  </div>
                  <span className="text-sm font-semibold text-[#11af82]">Buka</span>
                </Link>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-5 h-14 w-full rounded-2xl bg-[#fff1f2] text-[1rem] font-semibold text-[#e11d48] transition hover:bg-[#ffe4e8]"
          >
            Log out
          </button>
        </section>
      </main>

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[460px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-6 py-6 shadow-[0_18px_35px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#11af82]">Profile</p>
                <h3 className="mt-2 text-[1.45rem] font-bold tracking-[-0.02em] text-neutral-900">
                  Edit profile details
                </h3>
              </div>
              <button
                type="button"
                onClick={closeEditDialog}
                className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Tutup
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSave}>
              <label className="block">
                <span className="block text-[1rem] font-semibold text-neutral-800">
                  Full name
                </span>
                <input
                  className={inputClassName}
                  value={draft.fullName}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      fullName: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block">
                <span className="block text-[1rem] font-semibold text-neutral-800">Email</span>
                <input
                  type="email"
                  className={inputClassName}
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      email: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4">
                <p className="text-[1rem] font-semibold text-neutral-800">Phone number</p>
                <p className="mt-2 text-sm text-neutral-500">
                  Nomor telepon belum disimpan di backend saat ini.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="h-14 w-full rounded-2xl bg-[#1abb89] text-[1.05rem] font-bold text-white shadow-[0_8px_16px_rgba(18,168,123,0.35)] transition hover:bg-[#15a97b] disabled:opacity-60"
              >
                {isSaving ? "Menyimpan..." : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "FF";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
