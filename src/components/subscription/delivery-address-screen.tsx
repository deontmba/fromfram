"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  getEmptyAddressDraft,
  profileMockData,
  type Address,
  type AddressDraft,
} from "@/components/profile/mock-data";
import { indonesiaRegions } from "@/lib/indonesia-regions";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";

type ManagedAddress = Address & {
  recipientName: string;
  phoneNumber: string;
};

type ManagedAddressDraft = AddressDraft & {
  recipientName: string;
  phoneNumber: string;
};

type AddressResponse = {
  addresses?: ManagedAddress[];
  address?: ManagedAddress;
  data?: ManagedAddress[] | ManagedAddress;
  error?: string;
  message?: string;
};

type StatusMessage =
  | {
      tone: "error" | "success";
      text: string;
    }
  | null;

const NEXT_STEP_PATH = "/subscription/weekly-menu";

const addressLabels = ["Rumah", "Kantor", "Lainnya"];

const inputClassName =
  "mt-2 h-14 w-full rounded-2xl border-2 border-[#1db788]/40 bg-white/20 px-4 text-[1.02rem] text-neutral-900 outline outline-1 outline-white/40 transition backdrop-blur-md focus:border-[#1db788] focus:bg-white/30 placeholder:text-neutral-600";

const textareaClassName =
  "mt-2 min-h-28 w-full rounded-2xl border-2 border-[#1db788]/40 bg-white/20 px-4 py-3 text-[1.02rem] text-neutral-900 outline outline-1 outline-white/40 transition backdrop-blur-md focus:border-[#1db788] focus:bg-white/30 placeholder:text-neutral-600";

function getDefaultRecipientName() {
  return profileMockData.fullName;
}

function getDefaultPhoneNumber() {
  return profileMockData.phoneNumber;
}

function getAddressDraft(address?: ManagedAddress): ManagedAddressDraft {
  if (address) {
    return {
      label: address.label,
      recipientName: address.recipientName ?? getDefaultRecipientName(),
      phoneNumber: address.phoneNumber ?? getDefaultPhoneNumber(),
      street: address.street,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      notes: address.notes ?? "",
      isDefault: true,
    };
  }

  return {
    ...getEmptyAddressDraft(),
    label: "Rumah",
    recipientName: getDefaultRecipientName(),
    phoneNumber: getDefaultPhoneNumber(),
    isDefault: true,
  };
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

function getSavedAddressFromResponse(data: AddressResponse | null, fallbackAddress: ManagedAddress) {
  if (data?.address) {
    return data.address;
  }

  if (data?.data && !Array.isArray(data.data)) {
    return data.data;
  }

  return fallbackAddress;
}

function LocationPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-8 w-8">
      <path
        d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DeliveryAddressScreen() {
  const router = useRouter();
  const [addressDraft, setAddressDraft] = useState<ManagedAddressDraft>(getAddressDraft());
  const [defaultAddressId, setDefaultAddressId] = useState<string | null>(null);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const provinces = indonesiaRegions;
  const selectedProvinceData = provinces.find((p) => p.name === addressDraft.province);
  const cities = selectedProvinceData ? selectedProvinceData.cities : [];

  useEffect(() => {
    let isMounted = true;

    async function loadAddress() {
      try {
        const response = await fetch("/api/profile/address", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as AddressResponse | null;
        const addresses = getAddressesFromResponse(data);
        const defaultAddress = addresses.find((address) => address.isDefault);

        if (!isMounted || !response.ok || !defaultAddress) {
          return;
        }

        setAddressDraft(getAddressDraft(defaultAddress));
        setDefaultAddressId(defaultAddress.id);
      } catch {
        // Manual input tetap tersedia jika alamat belum bisa dimuat.
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAddress();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const payload = {
      recipientName: addressDraft.recipientName.trim() || getDefaultRecipientName(),
      phoneNumber: addressDraft.phoneNumber.trim() || getDefaultPhoneNumber(),
      label: addressDraft.label.trim(),
      street: addressDraft.street.trim(),
      city: addressDraft.city.trim(),
      province: addressDraft.province.trim(),
      postalCode: addressDraft.postalCode.trim(),
      notes: addressDraft.notes.trim(),
      isDefault: true,
    };

    if (!payload.label || !payload.street || !payload.city || !payload.province || !payload.postalCode) {
      setMessage({
        tone: "error",
        text: "Label, alamat lengkap, kota, provinsi, dan kode pos wajib diisi.",
      });
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);

    const payload = {
      recipientName: addressDraft.recipientName.trim() || getDefaultRecipientName(),
      phoneNumber: addressDraft.phoneNumber.trim() || getDefaultPhoneNumber(),
      label: addressDraft.label.trim(),
      street: addressDraft.street.trim(),
      city: addressDraft.city.trim(),
      province: addressDraft.province.trim(),
      postalCode: addressDraft.postalCode.trim(),
      notes: addressDraft.notes.trim(),
      isDefault: true,
    };

    try {
      const endpoint = defaultAddressId
        ? `/api/profile/address?id=${encodeURIComponent(defaultAddressId)}`
        : "/api/profile/address";
      const response = await fetch(endpoint, {
        method: defaultAddressId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as AddressResponse | null;

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: data?.error ?? data?.message ?? "Gagal menyimpan alamat.",
        });
        return;
      }

      const fallbackAddress: ManagedAddress = {
        id: defaultAddressId ?? "",
        ...payload,
      };
      const savedAddress = getSavedAddressFromResponse(data, fallbackAddress);

      setDefaultAddressId(savedAddress.id || defaultAddressId);
      setMessage({
        tone: "success",
        text: "Alamat pengiriman berhasil disimpan.",
      });
      router.push(NEXT_STEP_PATH);
    } catch {
      setMessage({
        tone: "error",
        text: "Gagal menyimpan alamat. Coba lagi beberapa saat lagi.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:py-10">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#d4f8f5] via-[#f0f7f5] to-[#e8f9f7]" />
      <div className="absolute -top-40 -right-40 -z-10 h-96 w-96 rounded-full bg-gradient-to-br from-[#1db788]/40 to-[#0ea5a5]/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 -z-10 h-80 w-80 rounded-full bg-gradient-to-tr from-[#1db788]/25 to-transparent blur-3xl" />
      <div className="absolute top-1/2 right-1/4 -z-10 h-72 w-72 rounded-full bg-gradient-to-bl from-[#0ea5a5]/30 to-transparent blur-3xl" />
      <div className="absolute top-0 left-1/2 -z-10 h-96 w-96 rounded-full bg-gradient-to-br from-white/40 to-[#1db788]/5 blur-3xl" />
      
      <section className="mx-auto w-full max-w-[860px] rounded-[28px] border-2 border-[#1db788]/50 bg-white/10 px-5 py-7 backdrop-blur-md sm:px-8 sm:py-9">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 bg-gradient-to-r from-[#1db788] to-[#16a679] bg-clip-text text-transparent">
            <Image src="/icons/leaf-logo.svg" alt="FromFram logo" width={30} height={30} />
            <span className="text-[1.95rem] font-extrabold leading-none tracking-[-0.02em]">FromFram</span>
          </div>
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-white/20 text-[#1db788] backdrop-blur-md shadow-[0_10px_20px_rgba(29,183,136,0.14)]">
            <LocationPinIcon />
          </div>
          <h1 className="bg-gradient-to-r from-[#1db788] via-[#0ea5a5] to-[#1db788] bg-clip-text text-[2rem] font-bold leading-tight text-transparent sm:text-[2.35rem]">
            Alamat Pengiriman
          </h1>
          <p className="mt-3 text-[0.98rem] text-neutral-600 sm:text-[1rem]">
            Isi alamat untuk pengiriman meal kit Anda
          </p>
        </header>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <fieldset>
            <legend className="mb-3 text-[1rem] font-semibold text-neutral-900">Label Alamat</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              {addressLabels.map((label) => {
                const active = addressDraft.label === label;

                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setAddressDraft((currentDraft) => ({
                        ...currentDraft,
                        label,
                      }))
                    }
                    className={`rounded-2xl border-2 px-6 py-3.5 text-[1rem] font-semibold backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] outline outline-1 outline-white/40 ${
                      active
                        ? "border-[#1db788] bg-gradient-to-br from-[#1db788]/20 to-[#0ea5a5]/10 text-neutral-900 shadow-[0_8px_16px_rgba(29,183,136,0.16)]"
                        : "border-[#1db788]/30 bg-white/20 text-neutral-700 hover:-translate-y-1 hover:border-[#1db788]/50 hover:bg-white/30"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="block text-[1rem] font-semibold text-neutral-900">Alamat Lengkap</span>
              <input
                className={inputClassName}
                value={addressDraft.street}
                onChange={(event) =>
                  setAddressDraft((currentDraft) => ({
                    ...currentDraft,
                    street: event.target.value,
                  }))
                }
              />
            </label>

            <label className="block">
              <span className="block text-[1rem] font-semibold text-neutral-900">Provinsi</span>
              <select
                className={inputClassName}
                value={addressDraft.province}
                onChange={(event) =>
                  setAddressDraft((currentDraft) => ({
                    ...currentDraft,
                    province: event.target.value,
                    city: "", // reset kota jika provinsi berubah
                  }))
                }
              >
                <option value="">Pilih Provinsi</option>
                {provinces.map((prov) => (
                  <option key={prov.id} value={prov.name}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-[1rem] font-semibold text-neutral-900">Kota/Kabupaten</span>
              <select
                className={inputClassName}
                value={addressDraft.city}
                onChange={(event) =>
                  setAddressDraft((currentDraft) => ({
                    ...currentDraft,
                    city: event.target.value,
                  }))
                }
                disabled={!addressDraft.province || cities.length === 0}
              >
                <option value="">Pilih Kota/Kabupaten</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-[1rem] font-semibold text-neutral-900">Kode Pos</span>
              <input
                className={inputClassName}
                value={addressDraft.postalCode}
                onChange={(event) =>
                  setAddressDraft((currentDraft) => ({
                    ...currentDraft,
                    postalCode: event.target.value,
                  }))
                }
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="block text-[1rem] font-semibold text-neutral-900">Catatan (Opsional)</span>
              <textarea
                className={textareaClassName}
                value={addressDraft.notes}
                onChange={(event) =>
                  setAddressDraft((currentDraft) => ({
                    ...currentDraft,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="min-h-6">
            {message ? (
              <p
                className={`text-sm font-medium ${
                  message.tone === "error" ? "text-red-400" : "text-[#4ade80]"
                }`}
              >
                {message.text}
              </p>
            ) : isLoading ? (
              <p className="text-sm font-medium text-neutral-500">Memuat alamat tersimpan...</p>
            ) : null}
          </div>

          <footer className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between pt-2">
            <Link
              href="/subscription/select-plan"
              className="inline-flex h-12 items-center justify-center rounded-2xl border-2 border-[#1db788]/30 bg-white/20 px-7 text-[1rem] font-semibold text-neutral-900 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#1db788]/50 hover:bg-white/30 hover:shadow-[0_10px_20px_rgba(29,183,136,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] outline outline-1 outline-white/40"
            >
              Kembali
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-12 items-center justify-center rounded-2xl border-2 border-[#1db788] bg-gradient-to-r from-[#1db788] to-[#16a679] px-9 text-[1rem] font-semibold text-white shadow-[0_12px_25px_rgba(29,183,136,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(29,183,136,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] disabled:cursor-not-allowed disabled:opacity-60 outline outline-1 outline-white/50"
            >
              {isSaving ? "Menyimpan..." : "Lanjutkan"}
            </button>
          </footer>
        </form>
      </section>
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Konfirmasi Alamat Pengiriman"
        message={`Alamat pengiriman Anda akan disimpan di ${addressDraft.label} (${addressDraft.street}, ${addressDraft.city}). Apakah Anda ingin melanjutkan ke pemilihan menu mingguan?`}
        confirmLabel="Ya, Lanjutkan"
        cancelLabel="Batal"
        isConfirming={isSaving}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
      />
    </main>
  );
}