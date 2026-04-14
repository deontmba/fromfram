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
  "mt-2 h-14 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-[1.02rem] text-neutral-700 outline-none transition focus:border-[#18b887]";

const textareaClassName =
  "mt-2 min-h-28 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-[1.02rem] text-neutral-700 outline-none transition focus:border-[#18b887]";

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    setIsSaving(true);

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
    <main className="min-h-screen bg-[#ececec] px-5 py-8 sm:py-10">
      <section className="mx-auto w-full max-w-[860px] rounded-[28px] border border-[#e4e4e4] bg-[#f4f4f4] px-5 py-7 shadow-[0_14px_36px_rgba(0,0,0,0.08)] sm:px-8 sm:py-9">
        <header className="text-center">
          <div className="mb-5 inline-flex items-center gap-2 text-[#10b981]">
            <Image src="/icons/leaf-logo.svg" alt="FromFram logo" width={30} height={30} />
            <span className="text-[1.95rem] font-extrabold leading-none tracking-[-0.02em]">FromFram</span>
          </div>
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#dff7ee] text-[#13a87d] shadow-[0_10px_20px_rgba(29,183,136,0.14)]">
            <LocationPinIcon />
          </div>
          <h1 className="text-[2rem] font-bold leading-tight text-neutral-900 sm:text-[2.35rem]">
            Alamat Pengiriman
          </h1>
          <p className="mt-2 text-[0.98rem] text-neutral-500 sm:text-[1rem]">
            Isi alamat untuk pengiriman meal kit Anda
          </p>
        </header>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <fieldset>
            <legend className="mb-3 text-[1rem] font-semibold text-neutral-800">Label Alamat</legend>
            <div className="grid gap-3 sm:grid-cols-3">
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
                    className={`rounded-2xl border px-5 py-3 text-[1rem] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] ${
                      active
                        ? "border-[#1db788] bg-[#e2f6ee] text-[#108463] shadow-[0_8px_16px_rgba(29,183,136,0.16)]"
                        : "border-[#d7d7d7] bg-[#f8f8f8] text-neutral-700 hover:border-[#9ed8c4] hover:bg-white"
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
              <span className="block text-[1rem] font-semibold text-neutral-800">Alamat Lengkap</span>
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
              <span className="block text-[1rem] font-semibold text-neutral-800">Kota</span>
              <input
                className={inputClassName}
                value={addressDraft.city}
                onChange={(event) =>
                  setAddressDraft((currentDraft) => ({
                    ...currentDraft,
                    city: event.target.value,
                  }))
                }
              />
            </label>

            <label className="block">
              <span className="block text-[1rem] font-semibold text-neutral-800">Provinsi</span>
              <input
                className={inputClassName}
                value={addressDraft.province}
                onChange={(event) =>
                  setAddressDraft((currentDraft) => ({
                    ...currentDraft,
                    province: event.target.value,
                  }))
                }
              />
            </label>

            <label className="block">
              <span className="block text-[1rem] font-semibold text-neutral-800">Kode Pos</span>
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
              <span className="block text-[1rem] font-semibold text-neutral-800">Catatan (Opsional)</span>
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
                  message.tone === "error" ? "text-red-500" : "text-[#11af82]"
                }`}
              >
                {message.text}
              </p>
            ) : isLoading ? (
              <p className="text-sm font-medium text-neutral-500">Memuat alamat tersimpan...</p>
            ) : null}
          </div>

          <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/subscription/select-plan"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#cfcfcf] bg-[#f8f8f8] px-6 text-[1rem] font-semibold text-neutral-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8]"
            >
              Kembali
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#1db788] px-8 text-[1rem] font-semibold text-white shadow-[0_8px_18px_rgba(29,183,136,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#16a679] hover:shadow-[0_12px_22px_rgba(29,183,136,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd5b8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Menyimpan..." : "Lanjutkan"}
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}
