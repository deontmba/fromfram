"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  createAddressId,
  type Address,
  type AddressDraft,
  addressMockData,
  getEmptyAddressDraft,
  profileMockData,
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
      tone: "success" | "error";
      text: string;
    }
  | null;

const inputClassName =
  "mt-2 h-14 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-[1.02rem] text-neutral-700 outline-none transition focus:border-[#18b887]";

function getDefaultRecipientName() {
  return profileMockData.fullName;
}

function getDefaultPhoneNumber() {
  return profileMockData.phoneNumber;
}

function createManagedAddress(address: Partial<ManagedAddress> & Address): ManagedAddress {
  return {
    ...address,
    recipientName: address.recipientName ?? getDefaultRecipientName(),
    phoneNumber: address.phoneNumber ?? getDefaultPhoneNumber(),
  };
}

function getManagedAddressDraft(): ManagedAddressDraft {
  return {
    ...getEmptyAddressDraft(),
    recipientName: getDefaultRecipientName(),
    phoneNumber: getDefaultPhoneNumber(),
  };
}

export function AddressManagementScreen() {
  const [addresses, setAddresses] = useState<ManagedAddress[]>(
    addressMockData.map((address) => createManagedAddress(address)),
  );
  const [addressDraft, setAddressDraft] = useState<ManagedAddressDraft>(getManagedAddressDraft());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAddresses() {
      try {
        const response = await fetch("/api/profile/address", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as AddressResponse | null;
        const nextAddresses = Array.isArray(data?.addresses)
          ? data.addresses
          : Array.isArray(data?.data)
            ? data.data
            : null;

        if (!response.ok || !isMounted || !Array.isArray(nextAddresses)) {
          return;
        }

        setAddresses(
          nextAddresses.map((address) => ({
            id: address.id,
            label: address.label,
            recipientName: address.recipientName ?? getDefaultRecipientName(),
            phoneNumber: address.phoneNumber ?? getDefaultPhoneNumber(),
            street: address.street,
            city: address.city,
            province: address.province,
            postalCode: address.postalCode,
            notes: address.notes ?? "",
            isDefault: Boolean(address.isDefault),
          })),
        );
      } catch {
        // Fallback ke data lokal jika endpoint gagal.
      }
    }

    void loadAddresses();

    return () => {
      isMounted = false;
    };
  }, []);

  const openAddForm = () => {
    setAddressDraft(getManagedAddressDraft());
    setEditingAddressId(null);
    setIsFormOpen(true);
    setMessage(null);
  };

  const openEditForm = (address: ManagedAddress) => {
    setAddressDraft({
      label: address.label,
      recipientName: address.recipientName,
      phoneNumber: address.phoneNumber,
      street: address.street,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      notes: address.notes,
      isDefault: address.isDefault,
    });
    setEditingAddressId(address.id);
    setIsFormOpen(true);
    setMessage(null);
  };

  const closeForm = () => {
    setAddressDraft(getManagedAddressDraft());
    setEditingAddressId(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const localAddress: ManagedAddress = {
      id: editingAddressId ?? createAddressId(),
      label: addressDraft.label.trim(),
      recipientName: addressDraft.recipientName.trim() || getDefaultRecipientName(),
      phoneNumber: addressDraft.phoneNumber.trim() || getDefaultPhoneNumber(),
      street: addressDraft.street.trim(),
      city: addressDraft.city.trim(),
      province: addressDraft.province.trim(),
      postalCode: addressDraft.postalCode.trim(),
      notes: addressDraft.notes.trim(),
      isDefault: addressDraft.isDefault,
    };

    try {
      const endpoint = editingAddressId
        ? `/api/profile/address?id=${encodeURIComponent(editingAddressId)}`
        : "/api/profile/address";
      const method = editingAddressId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: addressDraft.recipientName.trim() || getDefaultRecipientName(),
          phoneNumber: addressDraft.phoneNumber.trim() || getDefaultPhoneNumber(),
          label: addressDraft.label,
          street: addressDraft.street,
          city: addressDraft.city,
          province: addressDraft.province,
          postalCode: addressDraft.postalCode,
          notes: addressDraft.notes,
          isDefault: addressDraft.isDefault,
        }),
      });
      const data = (await response.json().catch(() => null)) as AddressResponse | null;

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: data?.error ?? data?.message ?? "Gagal menyimpan alamat.",
        });
        return;
      }

      const savedAddress =
        createManagedAddress(
          ((Array.isArray(data?.data) ? null : data?.data) ?? data?.address ?? localAddress) as ManagedAddress,
        );

      setAddresses((currentAddresses) => {
        const nextAddresses = editingAddressId
          ? currentAddresses.map((address) =>
              address.id === editingAddressId
                ? savedAddress
                : savedAddress.isDefault
                  ? { ...address, isDefault: false }
                  : address,
            )
          : [
              savedAddress,
              ...currentAddresses.map((address) => ({
                ...address,
                isDefault: savedAddress.isDefault ? false : address.isDefault,
              })),
            ];

        return nextAddresses;
      });

      setMessage({
        tone: "success",
        text: editingAddressId ? "Address berhasil diperbarui." : "Alamat baru berhasil ditambahkan.",
      });
      closeForm();
    } catch {
      setAddresses((currentAddresses) => {
        if (editingAddressId) {
          return currentAddresses.map((address) =>
            address.id === editingAddressId
              ? localAddress
              : localAddress.isDefault
                ? { ...address, isDefault: false }
                : address,
          );
        }

        return [
          localAddress,
          ...currentAddresses.map((address) => ({
            ...address,
            isDefault: localAddress.isDefault ? false : address.isDefault,
          })),
        ];
      });
      setMessage({
        tone: "success",
        text: "Backend belum tersedia. Perubahan disimpan sementara di halaman ini.",
      });
      closeForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setMessage(null);

    try {
      const response = await fetch(`/api/profile/address?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
      });
      const data = (await response.json().catch(() => null)) as AddressResponse | null;

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: data?.error ?? data?.message ?? "Gagal mengubah alamat utama.",
        });
        return;
      }

      setAddresses((currentAddresses) =>
        currentAddresses.map((address) => ({
          ...address,
          isDefault: address.id === id,
        })),
      );
      setMessage({
        tone: "success",
        text: "Alamat utama berhasil diperbarui.",
      });
    } catch {
      setAddresses((currentAddresses) =>
        currentAddresses.map((address) => ({
          ...address,
          isDefault: address.id === id,
        })),
      );
      setMessage({
        tone: "success",
        text: "Backend belum tersedia. Alamat utama diperbarui sementara di halaman ini.",
      });
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eceded] px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#d6f2e5_0%,#f0f0f0_52%,#d5d5d5_100%)]"
      />

      <section className="relative mx-auto w-full max-w-[860px] rounded-[18px] border border-black/5 bg-[#f7f7f7] px-5 py-6 shadow-[0_18px_35px_rgba(0,0,0,0.18)] sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/profile"
            className="inline-flex h-11 items-center rounded-2xl border border-neutral-300 bg-white px-4 text-[1rem] font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Kembali
          </Link>
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex h-11 items-center rounded-2xl bg-[#1abb89] px-5 text-[1rem] font-semibold text-white shadow-[0_8px_16px_rgba(18,168,123,0.28)] transition hover:bg-[#15a97b]"
          >
            Add address
          </button>
        </div>

        <div className="mt-6 rounded-[18px] border border-black/5 bg-white px-6 py-6 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold text-[#11af82]">Address</p>
          <h1 className="mt-2 text-[1.6rem] font-bold tracking-[-0.02em] text-neutral-900">
            Kelola alamat
          </h1>
          <p className="mt-2 text-[1rem] text-neutral-500">
            Atur alamat pengiriman utama dan simpan perubahan langsung dari halaman ini.
          </p>

          <div className="mt-6 space-y-4">
          {addresses.map((address) => (
            <article
              key={address.id}
              className="rounded-[18px] border border-neutral-200 bg-[#fafafa] p-4 shadow-[0_6px_16px_rgba(0,0,0,0.04)] md:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[1.2rem] font-bold text-neutral-900">{address.label}</h3>
                    {address.isDefault ? (
                      <span className="rounded-full bg-[#dff7ee] px-3 py-1 text-xs font-semibold text-[#109f78]">
                        Utama
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-1 text-neutral-600">
                    <p>{address.street}</p>
                    <p>
                      {address.city}, {address.province} {address.postalCode}
                    </p>
                    {address.notes ? (
                      <p className="text-sm text-neutral-500">{address.notes}</p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openEditForm(address)}
                  className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  aria-label={`Edit ${address.label}`}
                >
                  Edit
                </button>
              </div>

              {!address.isDefault ? (
                <button
                  type="button"
                  onClick={() => handleSetDefault(address.id)}
                  className="mt-5 h-12 w-full rounded-2xl border border-neutral-300 bg-white text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                >
                  Jadikan Alamat Utama
                </button>
              ) : null}
            </article>
          ))}

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

          {isFormOpen ? (
            <form className="mt-6 border-t border-neutral-200 pt-6" onSubmit={handleSubmit}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[1.35rem] font-bold tracking-[-0.02em] text-neutral-900">
                    {editingAddressId ? "Edit address" : "Add address"}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Isi data alamat secara langsung tanpa langkah tambahan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-[1rem] font-semibold text-neutral-800">Label</span>
                  <input
                    className={inputClassName}
                    value={addressDraft.label}
                    onChange={(event) =>
                      setAddressDraft((currentDraft) => ({
                        ...currentDraft,
                        label: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="block text-[1rem] font-semibold text-neutral-800">
                    Postal code
                  </span>
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
                  <span className="block text-[1rem] font-semibold text-neutral-800">Street</span>
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
                  <span className="block text-[1rem] font-semibold text-neutral-800">City</span>
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
                  <span className="block text-[1rem] font-semibold text-neutral-800">
                    Province
                  </span>
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

                <label className="block sm:col-span-2">
                  <span className="block text-[1rem] font-semibold text-neutral-800">Notes</span>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-[1.02rem] text-neutral-700 outline-none transition focus:border-[#18b887]"
                    value={addressDraft.notes}
                    onChange={(event) =>
                      setAddressDraft((currentDraft) => ({
                        ...currentDraft,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-neutral-300 bg-white px-4 py-4 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={addressDraft.isDefault}
                    onChange={(event) =>
                      setAddressDraft((currentDraft) => ({
                        ...currentDraft,
                        isDefault: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-neutral-400 accent-[#1abb89]"
                  />
                  <span className="text-sm font-semibold text-neutral-700">
                    Set as default address
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="mt-6 h-14 w-full rounded-2xl bg-[#1abb89] text-[1.05rem] font-bold text-white shadow-[0_8px_16px_rgba(18,168,123,0.35)] transition hover:bg-[#15a97b] disabled:opacity-60"
              >
                {isSaving
                  ? "Menyimpan..."
                  : editingAddressId
                    ? "Save address"
                    : "Add address"}
              </button>
            </form>
          ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
