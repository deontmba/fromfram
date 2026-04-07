"use client";

import { FormEvent, useState } from "react";
import { profileMockData } from "@/components/profile/mock-data";
import {
  BellIcon,
  BoxIcon,
  CalendarIcon,
  Field,
  HeartIcon,
  HeartPulseIcon,
  HelpCircleIcon,
  IconActionButton,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  ProfilePageShell,
  ProfileRow,
  SectionHeading,
  ShieldIcon,
  StatItem,
  SurfaceCard,
  UserIcon,
  inputClassName,
} from "@/components/profile/profile-ui";

export function ProfileOverviewScreen() {
  const [profile, setProfile] = useState(profileMockData);
  const [draft, setDraft] = useState(profileMockData);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [message, setMessage] = useState("");

  const openEditDialog = () => {
    setDraft(profile);
    setIsEditOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditOpen(false);
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfile(draft);
    setMessage("Profile details saved locally.");
    setIsEditOpen(false);
  };

  return (
    <>
      <ProfilePageShell
        title="Profile"
        backHref="/"
        rightAction={
          <IconActionButton label="Edit profile" onClick={openEditDialog}>
            <PencilIcon className="size-5" />
          </IconActionButton>
        }
      >
        <div className="space-y-6">
          <SurfaceCard className="relative overflow-visible px-6 pb-6 pt-24 md:pt-28 text-center">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[56%]">
              <div className="relative flex size-28 items-center justify-center rounded-full border-4 border-white bg-emerald-50 shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
                <div className="flex size-22 items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 to-emerald-100 text-3xl font-semibold text-emerald-700">
                  AR
                </div>
                <span className="absolute bottom-2 right-2 size-4 rounded-full border-2 border-white bg-emerald-500" />
              </div>
            </div>

            <div className="mx-auto mt-2 max-w-xl md:mt-3">
              <h2 className="text-[1.9rem] font-semibold text-zinc-900">{profile.fullName}</h2>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {profile.memberLabel}
                </span>
              </div>
              <p className="mt-3 text-sm text-zinc-400">{profile.joinedAt}</p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-zinc-100 pt-6">
              <StatItem icon={<BoxIcon className="size-5" />} value="24" label="Boxes Rcvd" />
              <StatItem icon={<CalendarIcon className="size-5" />} value="Weekly" label="Active Plan" />
              <StatItem icon={<HeartIcon className="size-5" />} value="12" label="Fav Meals" />
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading eyebrow="Akun" title="Main profile" />
            <div className="mt-4 space-y-1">
              <ProfileRow
                icon={<UserIcon className="size-4" />}
                title="Edit profile details"
                subtitle="Update nama, email, dan nomor telepon"
                onClick={openEditDialog}
              />
              <ProfileRow
                icon={<HeartPulseIcon className="size-4" />}
                title="Profil Kesehatan"
                subtitle="Goals, BMI, alergi"
                href="/profile/health"
              />
              <ProfileRow
                icon={<MapPinIcon className="size-4" />}
                title="Kelola Alamat"
                subtitle="Tambah, ubah, pilih utama"
                href="/profile/address"
              />

              <div className="my-2 border-t border-zinc-100" />

              <ProfileRow
                icon={<MailIcon className="size-4" />}
                title="Email"
                subtitle={profile.email}
              />
              <ProfileRow
                icon={<PhoneIcon className="size-4" />}
                title="Phone Number"
                subtitle={profile.phoneNumber}
              />
            </div>
            <p className="mt-3 min-h-6 text-sm text-emerald-600">{message}</p>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading eyebrow="Pengaturan" title="Settings" />
            <div className="mt-4 space-y-1">
              <ProfileRow
                icon={<BellIcon className="size-4" />}
                title="Notifications"
                subtitle="Atur pengingat dan update akun"
              />
              <ProfileRow
                icon={<ShieldIcon className="size-4" />}
                title="Privacy & Security"
                subtitle="Kelola keamanan akun"
              />
              <ProfileRow
                icon={<HelpCircleIcon className="size-4" />}
                title="Help & Support"
                subtitle="Butuh bantuan lebih lanjut"
              />
            </div>
          </SurfaceCard>

          <button
            type="button"
            className="flex w-full items-center justify-center rounded-2xl bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-500 transition hover:bg-rose-100"
          >
            Log Out
          </button>
        </div>
      </ProfilePageShell>

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Akun
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-zinc-900">Edit profile details</h3>
              </div>
              <button
                type="button"
                onClick={closeEditDialog}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                Close
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSave}>
              <Field label="Full name">
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
              </Field>

              <Field label="Email">
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
              </Field>

              <Field label="Phone number">
                <input
                  className={inputClassName}
                  value={draft.phoneNumber}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      phoneNumber: event.target.value,
                    }))
                  }
                />
              </Field>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
