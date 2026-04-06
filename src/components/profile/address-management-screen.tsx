"use client";

import { FormEvent, useState } from "react";
import {
  Address,
  AddressDraft,
  addressMockData,
  createAddressId,
  getEmptyAddressDraft,
  profileMockData,
} from "@/components/profile/mock-data";
import {
  CheckCircleIcon,
  Field,
  IconActionButton,
  PencilIcon,
  PlusIcon,
  ProfilePageShell,
  SectionHeading,
  SurfaceCard,
  inputClassName,
} from "@/components/profile/profile-ui";

export function AddressManagementScreen() {
  const [addresses, setAddresses] = useState(addressMockData);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(
    getEmptyAddressDraft(profileMockData),
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const openAddForm = () => {
    setAddressDraft(getEmptyAddressDraft(profileMockData));
    setEditingAddressId(null);
    setIsFormOpen(true);
    setMessage("");
  };

  const openEditForm = (address: Address) => {
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
    setMessage("");
  };

  const closeForm = () => {
    setAddressDraft(getEmptyAddressDraft(profileMockData));
    setEditingAddressId(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setAddresses((currentAddresses) => {
      let nextAddresses = currentAddresses;

      if (editingAddressId) {
        nextAddresses = currentAddresses.map((address) =>
          address.id === editingAddressId
            ? { ...address, ...addressDraft }
            : addressDraft.isDefault
              ? { ...address, isDefault: false }
              : address,
        );
      } else {
        const nextAddress: Address = {
          id: createAddressId(),
          ...addressDraft,
        };

        nextAddresses = addressDraft.isDefault
          ? currentAddresses.map((address) => ({ ...address, isDefault: false }))
          : currentAddresses;

        nextAddresses = [nextAddress, ...nextAddresses];
      }

      if (!nextAddresses.some((address) => address.isDefault) && nextAddresses.length > 0) {
        const [firstAddress, ...restAddresses] = nextAddresses;
        return [{ ...firstAddress, isDefault: true }, ...restAddresses];
      }

      return nextAddresses;
    });

    setMessage(editingAddressId ? "Address updated locally." : "New address added locally.");
    closeForm();
  };

  const handleSetDefault = (id: string) => {
    setAddresses((currentAddresses) =>
      currentAddresses.map((address) => ({
        ...address,
        isDefault: address.id === id,
      })),
    );
    setMessage("Default address updated locally.");
  };

  return (
    <ProfilePageShell
      title="Alamat"
      backHref="/profile"
      rightAction={
        <IconActionButton label="Add address" onClick={openAddForm}>
          <PlusIcon className="size-5" />
        </IconActionButton>
      }
    >
      <SurfaceCard className="px-0 pb-6 pt-6">
        <div className="px-6 md:px-8">
          <SectionHeading title="Kelola Alamat" />
        </div>

        <div className="mt-6 space-y-4 px-6 md:px-8">
          {addresses.map((address) => (
            <article
              key={address.id}
              className="rounded-[1.75rem] border border-zinc-200 p-4 shadow-sm md:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[1.65rem] font-semibold text-zinc-900">{address.label}</h3>
                    {address.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircleIcon className="size-3.5" />
                        Utama
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 font-semibold text-zinc-800">{address.recipientName}</p>
                  <p className="mt-1 text-zinc-400">{address.phoneNumber}</p>
                  <div className="mt-2 space-y-1 text-zinc-500">
                    <p>{address.street}</p>
                    <p>
                      {address.city}, {address.province} {address.postalCode}
                    </p>
                    <p className="text-sm text-zinc-400">{address.notes}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openEditForm(address)}
                  className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={`Edit ${address.label}`}
                >
                  <PencilIcon className="size-5" />
                </button>
              </div>

              {!address.isDefault ? (
                <button
                  type="button"
                  onClick={() => handleSetDefault(address.id)}
                  className="mt-5 w-full rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  Jadikan Alamat Utama
                </button>
              ) : null}
            </article>
          ))}
        </div>

        <div className="px-6 md:px-8">
          <p className="mt-4 min-h-6 text-sm text-emerald-600">{message}</p>
        </div>

        {isFormOpen ? (
          <form className="mt-2 border-t border-zinc-100 px-6 pt-6 md:px-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">
                  {editingAddressId ? "Edit address" : "Add address"}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Manage address details locally for this frontend preview.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="self-start rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Label">
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
              </Field>

              <Field label="Recipient name">
                <input
                  className={inputClassName}
                  value={addressDraft.recipientName}
                  onChange={(event) =>
                    setAddressDraft((currentDraft) => ({
                      ...currentDraft,
                      recipientName: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Phone number">
                <input
                  className={inputClassName}
                  value={addressDraft.phoneNumber}
                  onChange={(event) =>
                    setAddressDraft((currentDraft) => ({
                      ...currentDraft,
                      phoneNumber: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Postal code">
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
              </Field>

              <div className="md:col-span-2">
                <Field label="Street">
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
                </Field>
              </div>

              <Field label="City">
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
              </Field>

              <Field label="Province">
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
              </Field>

              <div className="md:col-span-2">
                <Field label="Notes">
                  <textarea
                    className={`${inputClassName} min-h-28 resize-y`}
                    value={addressDraft.notes}
                    onChange={(event) =>
                      setAddressDraft((currentDraft) => ({
                        ...currentDraft,
                        notes: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={addressDraft.isDefault}
                  onChange={(event) =>
                    setAddressDraft((currentDraft) => ({
                      ...currentDraft,
                      isDefault: event.target.checked,
                    }))
                  }
                  className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-400"
                />
                <span className="text-sm font-medium text-zinc-700">Set as default address</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                {editingAddressId ? "Save address" : "Add address"}
              </button>
            </div>
          </form>
        ) : null}
      </SurfaceCard>
    </ProfilePageShell>
  );
}
