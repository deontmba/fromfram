/**
 * Tipe data untuk modul Alamat — termasuk koordinat GPS dari MapPicker.
 */

export interface AddressData {
  id: string;
  label: string;
  recipientName: string | null;
  phoneNumber: string | null;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string | null;
  isDefault: boolean;
  /** Lintang (latitude) dari pin peta — opsional */
  latitude: number | null;
  /** Bujur (longitude) dari pin peta — opsional */
  longitude: number | null;
}

/** Draft form sebelum disimpan (tanpa id) */
export type AddressDraftData = Omit<AddressData, 'id'>;

/** Koordinat GPS */
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

/** Hasil reverse geocoding dari Nominatim */
export interface NominatimReverseResult {
  display_name: string;
  /** Nama utama objek (POI, bangunan, dsb.) */
  name?: string;
  address: {
    // ── POI / tempat khusus ──
    amenity?: string;       // fasilitas umum (rumah sakit, kampus, dll.)
    tourism?: string;       // destinasi wisata (Candi Borobudur, dll.)
    historic?: string;      // situs bersejarah
    leisure?: string;       // taman, lapangan olahraga
    // ── Jalan ──
    road?: string;          // nama jalan
    quarter?: string;       // nama kampung / kompleks
    neighbourhood?: string; // nama lingkungan
    suburb?: string;        // kelurahan
    village?: string;       // desa
    // ── Administratif ──
    city_district?: string; // kecamatan
    municipality?: string;  // kota setingkat kecamatan
    town?: string;          // kota kecil
    city?: string;          // kota madya
    county?: string;        // kabupaten (kadang diisi, kadang tidak)
    state_district?: string;// kabupaten — field alternatif Nominatim untuk area kabupaten
    state?: string;         // provinsi
    postcode?: string;      // kode pos
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
}

/** Satu item dari hasil pencarian Nominatim */
export interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

/** Props untuk komponen MapPicker */
export interface MapPickerProps {
  /** Koordinat awal pin peta */
  initialPosition?: GeoCoordinates;
  /**
   * Callback saat user memilih lokasi baru.
   * @param coords        Koordinat GPS yang dipilih
   * @param geocoded      Field alamat yang sudah diekstrak (street, province, postalCode)
   * @param cityCandidates Semua kandidat nama kota dari Nominatim — screen akan cocokkan ke dropdown
   */
  onLocationSelect: (
    coords: GeoCoordinates,
    geocoded: Partial<AddressDraftData>,
    cityCandidates: string[],
  ) => void;
  /** Ketinggian container peta */
  height?: string;
}
