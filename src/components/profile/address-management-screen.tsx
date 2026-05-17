"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import {
  createAddressId,
  type Address,
  type AddressDraft,
  addressMockData,
  getEmptyAddressDraft,
  profileMockData,
} from "@/components/profile/mock-data";
import { indonesiaRegions } from "@/lib/indonesia-regions";
import type { GeoCoordinates, AddressDraftData } from "@/types/address";

// Leaflet tidak kompatibel dengan SSR — wajib dynamic import
const MapPicker = dynamic(
  () => import("@/components/maps/MapPicker").then((m) => ({ default: m.MapPicker })),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-2xl bg-neutral-100" /> },
);

type ManagedAddress = Address & {
  recipientName: string;
  phoneNumber: string;
  latitude?: number | null;
  longitude?: number | null;
};

type ManagedAddressDraft = AddressDraft & {
  recipientName: string;
  phoneNumber: string;
  latitude: number | null;
  longitude: number | null;
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

type AddressSaveConfirmation = {
  title: string;
  message: string;
  confirmLabel: string;
} | null;

const inputClassName =
  "mt-2 h-14 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-[1.02rem] text-neutral-700 outline-none transition focus:border-[#18b887]";

// Field yang di-lock saat peta digunakan
const readonlyClassName =
  "mt-2 h-14 w-full rounded-2xl border border-[#18b887]/40 bg-[#f0fdf9] px-4 text-[1.02rem] text-neutral-600 outline-none cursor-not-allowed";

/** Opsi label alamat yang umum digunakan */
const ADDRESS_LABEL_OPTIONS = [
  { value: "Rumah",      emoji: "🏠" },
  { value: "Kantor",     emoji: "💼" },
  { value: "Kos",        emoji: "🛏️" },
  { value: "Apartemen",  emoji: "🏢" },
  { value: "Toko",       emoji: "🏪" },
  { value: "Gudang",     emoji: "📦" },
  { value: "Lainnya",    emoji: "📍" },
];

/**
 * Mencocokkan string dari Nominatim (misal "Jawa Barat") ke nama
 * yang ada di indonesiaRegions ("JAWA BARAT") secara case-insensitive.
 * Juga mencoba menghapus prefix "Provinsi ", "Kota ", "Kabupaten " agar
 * lebih mudah dicocokkan.
 */
function matchRegionName(nominatimValue: string, candidates: string[]): string {
  if (!nominatimValue) return "";
  const cleaned = nominatimValue
    .toUpperCase()
    .replace(/^(PROVINSI|DAERAH ISTIMEWA|DAERAH KHUSUS IBUKOTA)\s+/i, "")
    .trim();

  // 1. Exact uppercase match
  const exact = candidates.find((c) => c === cleaned);
  if (exact) return exact;

  // 2. Candidate yang mengandung cleaned, atau cleaned yang mengandung candidate keyword
  const partial = candidates.find(
    (c) =>
      c.includes(cleaned) ||
      cleaned.includes(c.replace(/^(KABUPATEN|KOTA)\s+/, "").trim()),
  );
  if (partial) return partial;

  // 3. Coba cocokkan kata-kata kunci utama
  const keywords = cleaned.replace(/^(KABUPATEN|KOTA)\s+/, "").trim().split(/\s+/);
  const keyword = candidates.find((c) =>
    keywords.every((kw) => c.includes(kw)),
  );
  return keyword ?? "";
}

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
    latitude: null,
    longitude: null,
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
  const [addressSaveConfirmation, setAddressSaveConfirmation] =
    useState<AddressSaveConfirmation>(null);
  const [pendingDefaultAddressId, setPendingDefaultAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [pendingDeleteAddress, setPendingDeleteAddress] = useState<ManagedAddress | null>(null);

  const provinces = indonesiaRegions;
  const selectedProvinceData = provinces.find((p) => p.name === addressDraft.province);
  const cities = selectedProvinceData ? selectedProvinceData.cities : [];

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
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
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

    if (isSaving) {
      return;
    }

    setAddressSaveConfirmation(
      editingAddressId
        ? {
            title: "Simpan Perubahan Alamat",
            message: "Apakah Anda yakin ingin menyimpan perubahan alamat?",
            confirmLabel: "Ya, Simpan",
          }
        : {
            title: "Tambah Alamat",
            message: "Apakah Anda yakin ingin menambahkan alamat ini?",
            confirmLabel: "Ya, Tambahkan",
          },
    );
  };

  const handleConfirmSaveAddress = async () => {
    if (isSaving) {
      return;
    }

    setAddressSaveConfirmation(null);
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
      latitude: addressDraft.latitude,
      longitude: addressDraft.longitude,
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
          latitude: addressDraft.latitude,
          longitude: addressDraft.longitude,
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
        text: editingAddressId ? "Alamat berhasil diperbarui." : "Alamat baru berhasil ditambahkan.",
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

  const handleConfirmSetDefault = async () => {
    if (!pendingDefaultAddressId) {
      return;
    }

    const id = pendingDefaultAddressId;
    setPendingDefaultAddressId(null);
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

  const handleDeleteAddress = async (address: ManagedAddress) => {
    setDeletingAddressId(address.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/profile/address?id=${encodeURIComponent(address.id)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as AddressResponse | null;

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: data?.error ?? data?.message ?? "Gagal menghapus alamat.",
        });
        return;
      }

      setAddresses((currentAddresses) => {
        const nextAddresses = currentAddresses.filter((currentAddress) => currentAddress.id !== address.id);

        if (!address.isDefault || nextAddresses.length === 0 || nextAddresses.some((nextAddress) => nextAddress.isDefault)) {
          return nextAddresses;
        }

        const nextDefaultAddress = [...nextAddresses].sort((firstAddress, secondAddress) =>
          firstAddress.label.localeCompare(secondAddress.label),
        )[0];

        return nextAddresses.map((nextAddress) => ({
          ...nextAddress,
          isDefault: nextAddress.id === nextDefaultAddress.id,
        }));
      });

      if (editingAddressId === address.id) {
        closeForm();
      }

      setPendingDeleteAddress(null);
      setMessage({
        tone: "success",
        text: "Alamat berhasil dihapus.",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "Gagal menghapus alamat.",
      });
    } finally {
      setDeletingAddressId(null);
    }
  };

  const closeDeleteModal = () => {
    if (deletingAddressId) {
      return;
    }

    setPendingDeleteAddress(null);
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
            Tambah alamat
          </button>
        </div>

        <div className="mt-6 rounded-[18px] border border-black/5 bg-white px-6 py-6 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold text-[#11af82]">Alamat</p>
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

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => openEditForm(address)}
                    className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                    aria-label={`Ubah ${address.label}`}
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteAddress(address)}
                    disabled={deletingAddressId === address.id}
                    className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Hapus ${address.label}`}
                  >
                    {deletingAddressId === address.id ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
              </div>

              {!address.isDefault ? (
                <button
                  type="button"
                  onClick={() => setPendingDefaultAddressId(address.id)}
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
                    {editingAddressId ? "Ubah alamat" : "Tambah alamat"}
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
                  Batal
                </button>
              </div>

              {/* ── Map Picker Section ── */}
              <div className="mt-5">
                <p className="mb-2 text-[1rem] font-semibold text-neutral-800">
                  Pilih Lokasi di Peta
                </p>
                <MapPicker
                  initialPosition={
                    addressDraft.latitude && addressDraft.longitude
                      ? { lat: addressDraft.latitude, lng: addressDraft.longitude }
                      : undefined
                  }
                  height="280px"
                  onLocationSelect={(
                    coords: GeoCoordinates,
                    geocoded: Partial<AddressDraftData>,
                    cityCandidates: string[],
                  ) => {
                    setAddressDraft((draft) => {
                      // ── Cocokkan provinsi ──
                      const allProvinceNames = indonesiaRegions.map((p) => p.name);
                      const matchedProvince = geocoded.province
                        ? matchRegionName(geocoded.province, allProvinceNames)
                        : draft.province;

                      // ── Cocokkan kota: coba setiap kandidat sampai ada yang cocok ──
                      const provinceData = indonesiaRegions.find(
                        (p) => p.name === matchedProvince,
                      );
                      const allCityNames = provinceData?.cities.map((c) => c.name) ?? [];

                      // Iterasi semua kandidat dari Nominatim (state_district, county, city, dll.)
                      // Ambil yang pertama berhasil dicocokkan ke dropdown
                      const matchedCity = cityCandidates
                        .map((candidate) => matchRegionName(candidate, allCityNames))
                        .find((result) => result !== "") ?? "";

                      return {
                        ...draft,
                        latitude: coords.lat,
                        longitude: coords.lng,
                        ...(geocoded.street     ? { street:     geocoded.street     } : {}),
                        ...(geocoded.postalCode ? { postalCode: geocoded.postalCode } : {}),
                        ...(matchedProvince     ? { province: matchedProvince, city: matchedCity } : {}),
                      };
                    });
                  }}
                />
                {addressDraft.latitude && addressDraft.longitude ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-[#f0fdf9] px-3 py-2">
                    <p className="text-xs text-[#11af82]">
                      📍 {addressDraft.latitude.toFixed(5)}, {addressDraft.longitude.toFixed(5)}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setAddressDraft((d) => ({
                          ...d,
                          latitude: null,
                          longitude: null,
                          street: "",
                          city: "",
                          province: "",
                          postalCode: "",
                        }))
                      }
                      className="text-xs font-semibold text-red-400 hover:text-red-600"
                    >
                      ✕ Reset peta
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Hint locked fields */}
              {addressDraft.latitude && addressDraft.longitude ? (
                <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-[#f0fdf9] px-3 py-2 text-xs text-[#11af82]">
                  <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Alamat terkunci dari peta — pindahkan pin untuk mengubah, atau klik &ldquo;Reset peta&rdquo; untuk isi manual.
                </p>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Label Alamat — dropdown */}
                <label className="block">
                  <span className="block text-[1rem] font-semibold text-neutral-800">Label Alamat</span>
                  <select
                    className={inputClassName}
                    value={addressDraft.label}
                    onChange={(event) =>
                      setAddressDraft((currentDraft) => ({
                        ...currentDraft,
                        label: event.target.value,
                      }))
                    }
                  >
                    <option value="">Pilih label…</option>
                    {ADDRESS_LABEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.emoji} {opt.value}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Kode Pos — read-only jika dari peta */}
                <label className="block">
                  <span className="block text-[1rem] font-semibold text-neutral-800">
                    Kode Pos
                    {addressDraft.latitude ? (
                      <span className="ml-2 text-xs font-normal text-[#11af82]">📍 dari peta</span>
                    ) : null}
                  </span>
                  <input
                    readOnly={Boolean(addressDraft.latitude)}
                    className={addressDraft.latitude ? readonlyClassName : inputClassName}
                    value={addressDraft.postalCode}
                    onChange={(event) =>
                      !addressDraft.latitude &&
                      setAddressDraft((currentDraft) => ({
                        ...currentDraft,
                        postalCode: event.target.value,
                      }))
                    }
                  />
                </label>

                {/* Alamat Lengkap — read-only jika dari peta */}
                <label className="block sm:col-span-2">
                  <span className="block text-[1rem] font-semibold text-neutral-800">
                    Alamat Lengkap
                    {addressDraft.latitude ? (
                      <span className="ml-2 text-xs font-normal text-[#11af82]">📍 dari peta</span>
                    ) : null}
                  </span>
                  <input
                    readOnly={Boolean(addressDraft.latitude)}
                    className={addressDraft.latitude ? readonlyClassName : inputClassName}
                    value={addressDraft.street}
                    onChange={(event) =>
                      !addressDraft.latitude &&
                      setAddressDraft((currentDraft) => ({
                        ...currentDraft,
                        street: event.target.value,
                      }))
                    }
                  />
                </label>

                {/* Provinsi — locked jika dari peta */}
                <label className="block">
                  <span className="block text-[1rem] font-semibold text-neutral-800">
                    Provinsi
                    {addressDraft.latitude ? (
                      <span className="ml-2 text-xs font-normal text-[#11af82]">📍 dari peta</span>
                    ) : null}
                  </span>
                  <select
                    className={addressDraft.latitude ? readonlyClassName : inputClassName}
                    value={addressDraft.province}
                    disabled={Boolean(addressDraft.latitude)}
                    onChange={(event) =>
                      setAddressDraft((currentDraft) => ({
                        ...currentDraft,
                        province: event.target.value,
                        city: "",
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

                {/* Kota/Kabupaten — locked jika dari peta */}
                <label className="block">
                  <span className="block text-[1rem] font-semibold text-neutral-800">
                    Kota/Kabupaten
                    {addressDraft.latitude ? (
                      <span className="ml-2 text-xs font-normal text-[#11af82]">📍 dari peta</span>
                    ) : null}
                  </span>
                  <select
                    className={addressDraft.latitude ? readonlyClassName : inputClassName}
                    value={addressDraft.city}
                    disabled={Boolean(addressDraft.latitude) || !addressDraft.province || cities.length === 0}
                    onChange={(event) =>
                      setAddressDraft((currentDraft) => ({
                        ...currentDraft,
                        city: event.target.value,
                      }))
                    }
                  >
                    <option value="">Pilih Kota/Kabupaten</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="block text-[1rem] font-semibold text-neutral-800">Catatan (Opsional)</span>
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
                    Jadikan alamat utama
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
                    ? "Simpan alamat"
                    : "Tambah alamat"}
              </button>
            </form>
          ) : null}
          </div>
        </div>
      </section>

      <ConfirmDialog
        isOpen={Boolean(addressSaveConfirmation)}
        title={addressSaveConfirmation?.title ?? ""}
        message={addressSaveConfirmation?.message ?? ""}
        confirmLabel={addressSaveConfirmation?.confirmLabel ?? ""}
        cancelLabel="Batal"
        isConfirming={isSaving}
        onCancel={() => setAddressSaveConfirmation(null)}
        onConfirm={handleConfirmSaveAddress}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingDefaultAddressId)}
        title="Jadikan Alamat Utama"
        message="Apakah Anda yakin ingin menjadikan alamat ini sebagai alamat utama?"
        confirmLabel="Ya, Jadikan Utama"
        cancelLabel="Batal"
        onCancel={() => setPendingDefaultAddressId(null)}
        onConfirm={handleConfirmSetDefault}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteAddress)}
        title="Hapus Alamat"
        message="Apakah Anda yakin ingin menghapus alamat ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="destructive"
        isConfirming={Boolean(deletingAddressId)}
        onCancel={closeDeleteModal}
        onConfirm={() => {
          if (pendingDeleteAddress) {
            void handleDeleteAddress(pendingDeleteAddress);
          }
        }}
      />
    </main>
  );
}
