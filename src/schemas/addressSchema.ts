import { z } from 'zod';

export const addAddressSchema = z.object({
  recipientName: z.string().min(1, 'Nama penerima wajib diisi.'),
  phoneNumber:   z.string().min(1, 'Nomor telepon wajib diisi.'),
  label:         z.string().min(1, 'Label alamat wajib diisi.'),
  street:        z.string().min(1, 'Alamat jalan wajib diisi.'),
  city:          z.string().min(1, 'Kota wajib diisi.'),
  province:      z.string().min(1, 'Provinsi wajib diisi.'),
  postalCode:    z.string().min(1, 'Kode pos wajib diisi.'),
  notes:         z.string().optional(),
  isDefault:     z.boolean().optional(),
  /** Koordinat GPS dari MapPicker — opsional, dikembalikan oleh reverse geocoding */
  latitude:      z.number().min(-90).max(90).nullable().optional(),
  longitude:     z.number().min(-180).max(180).nullable().optional(),
});

export const updateAddressSchema = addAddressSchema.partial();

export type AddAddressInput  = z.infer<typeof addAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;