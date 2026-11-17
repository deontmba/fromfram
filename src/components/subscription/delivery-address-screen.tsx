"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getEmptyAddressDraft, type Address, type AddressDraft } from "@/components/profile/mock-data";
import { indonesiaRegions } from "@/lib/indonesia-regions";
import {
  CheckoutLayout,
  cardClass,
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/subscription/checkout-layout";

type ManagedAddress = Address & {
  recipientName: string | null;
  phoneNumber: string | null;
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

type FieldErrors = Partial<Record<"recipientName" | "phoneNumber" | "street" | "province" | "city" | "postalCode", string>>;

const NEXT_STEP_PATH = "/subscription/weekly-menu";
const addressLabels = ["Rumah", "Kantor", "Lainnya"];

// shortcut: service area is hard-coded to Jabodetabek + Bandung provinces; move to config/DB when the area grows.
const SERVICE_PROVINCES = ["DKI JAKARTA", "JAWA BARAT", "BANTEN"];
const provinces = indonesiaRegions.filter((p) => SERVICE_PROVINCES.includes(p.name));

function getAddressesFromResponse(data: AddressResponse | null): ManagedAddress[] {
  if (Array.isArray(data?.addresses)) return data.addresses;
  if (Array.isArray(data?.data)) return data.data;
  if (data?.address) return [data.address];
  if (data?.data) return [data.data];
  return [];
}

function draftFromAddress(address: ManagedAddress): ManagedAddressDraft {
  return {
    label: address.label,
    recipientName: address.recipientName ?? "",
    phoneNumber: address.phoneNumber ?? "",
    street: address.street,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    notes: address.notes ?? "",
    isDefault: true,
  };
}

function validate(draft: ManagedAddressDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.recipientName.trim()) errors.recipientName = "Nama penerima wajib diisi.";
  const phone = draft.phoneNumber.replace(/[\s-]/g, "");
  if (!phone) errors.phoneNumber = "Nomor HP wajib diisi, kurir akan menghubungi nomor ini.";
  else if (!/^(\+62|62|0)8\d{7,12}$/.test(phone)) errors.phoneNumber = "Format nomor HP tidak valid, contoh 081234567890.";
  if (!draft.street.trim()) errors.street = "Alamat lengkap wajib diisi.";
  if (!draft.province) errors.province = "Pilih provinsi.";
  if (!draft.city) errors.city = "Pilih kota atau kabupaten.";
  if (!/^\d{5}$/.test(draft.postalCode.trim())) errors.postalCode = "Kode pos terdiri dari 5 angka.";
  return errors;
}

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="block text-sm font-medium text-neutral-700">{label}</span>
      {children}
      {error ? <span className="block text-sm text-red-600">{error}</span> : null}
    </label>
  );
}

export function DeliveryAddressScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<ManagedAddressDraft>({
    ...getEmptyAddressDraft(),
    label: "Rumah",
    recipientName: "",
    phoneNumber: "",
    isDefault: true,
  });
  const [defaultAddressId, setDefaultAddressId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const cities = provinces.find((p) => p.name === draft.province)?.cities ?? [];
  const set = <K extends keyof ManagedAddressDraft>(key: K, value: ManagedAddressDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [addressRes, meRes] = await Promise.all([
          fetch("/api/profile/address", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" }),
        ]);
        const addressData = (await addressRes.json().catch(() => null)) as AddressResponse | null;
        const meData = (await meRes.json().catch(() => null)) as { user?: { name?: string; phoneNumber?: string | null } } | null;
        if (!isMounted) return;

        const defaultAddress = addressRes.ok ? getAddressesFromResponse(addressData).find((a) => a.isDefault) : undefined;
        if (defaultAddress) {
          setDraft(draftFromAddress(defaultAddress));
          setDefaultAddressId(defaultAddress.id);
        }
        // Pre-fill the recipient from the account when the saved address has none.
        setDraft((current) => ({
          ...current,
          recipientName: current.recipientName || meData?.user?.name || "",
          phoneNumber: current.phoneNumber || meData?.user?.phoneNumber || "",
        }));
      } catch {
        // The form still works with manual input.
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    const payload = {
      recipientName: draft.recipientName.trim(),
      phoneNumber: draft.phoneNumber.replace(/[\s-]/g, ""),
      label: draft.label,
      street: draft.street.trim(),
      city: draft.city,
      province: draft.province,
      postalCode: draft.postalCode.trim(),
      notes: draft.notes.trim(),
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
        setSubmitError(data?.error ?? data?.message ?? "Gagal menyimpan alamat.");
        return;
      }
      router.push(NEXT_STEP_PATH);
    } catch {
      setSubmitError("Gagal menyimpan alamat. Coba lagi beberapa saat lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const invalid = (key: keyof FieldErrors) => (errors[key] ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "");

  return (
    <CheckoutLayout
      step="Alamat"
      title="Ke mana kami antar?"
      subtitle="Saat ini kami mengantar ke wilayah Jakarta, Jawa Barat, dan Banten."
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-neutral-900">Penerima</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nama penerima" error={errors.recipientName}>
              <input
                className={`${fieldClass} ${invalid("recipientName")}`}
                autoComplete="name"
                value={draft.recipientName}
                onChange={(e) => set("recipientName", e.target.value)}
              />
            </Field>
            <Field label="Nomor HP" error={errors.phoneNumber}>
              <input
                className={`${fieldClass} ${invalid("phoneNumber")}`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="081234567890"
                value={draft.phoneNumber}
                onChange={(e) => set("phoneNumber", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-base font-semibold text-neutral-900">Alamat</h2>

          <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Label alamat">
            {addressLabels.map((label) => {
              const active = draft.label === label;
              return (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set("label", label)}
                  className={`h-9 rounded-full border px-4 text-sm font-medium transition ${
                    active
                      ? "border-[#13b987] bg-[#effaf5] text-[#07845e]"
                      : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Alamat lengkap" error={errors.street} className="sm:col-span-2">
              <input
                className={`${fieldClass} ${invalid("street")}`}
                autoComplete="street-address"
                placeholder="Nama jalan, nomor rumah, RT/RW"
                value={draft.street}
                onChange={(e) => set("street", e.target.value)}
              />
            </Field>

            <Field label="Provinsi" error={errors.province}>
              <select
                className={`${fieldClass} ${invalid("province")}`}
                value={draft.province}
                onChange={(e) => setDraft((current) => ({ ...current, province: e.target.value, city: "" }))}
              >
                <option value="">Pilih provinsi</option>
                {provinces.map((prov) => (
                  <option key={prov.id} value={prov.name}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kota / kabupaten" error={errors.city}>
              <select
                className={`${fieldClass} ${invalid("city")}`}
                value={draft.city}
                disabled={!draft.province}
                onChange={(e) => set("city", e.target.value)}
              >
                <option value="">{draft.province ? "Pilih kota atau kabupaten" : "Pilih provinsi dulu"}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kode pos" error={errors.postalCode}>
              <input
                className={`${fieldClass} ${invalid("postalCode")}`}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={draft.postalCode}
                onChange={(e) => set("postalCode", e.target.value.replace(/\D/g, ""))}
              />
            </Field>

            <Field label="Catatan untuk kurir (opsional)" className="sm:col-span-2">
              <textarea
                className={`${fieldClass} h-auto min-h-24 py-2.5`}
                placeholder="Contoh: pagar hijau, titip satpam"
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>
        </section>

        {submitError ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link href="/subscription/select-plan" className={secondaryButtonClass}>
            Kembali
          </Link>
          <button type="submit" disabled={isSaving || isLoading} className={primaryButtonClass}>
            {isSaving ? "Menyimpan..." : "Lanjut pilih menu"}
          </button>
        </div>
      </form>
    </CheckoutLayout>
  );
}
