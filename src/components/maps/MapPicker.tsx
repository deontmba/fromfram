"use client";

/**
 * MapPicker.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Komponen peta interaktif berbasis react-leaflet + OpenStreetMap (Nominatim).
 *
 * Fitur:
 *  • Pencarian alamat dengan autocomplete (Nominatim Search API + debounce)
 *  • Drag marker → reverse geocoding otomatis (Nominatim Reverse API)
 *  • flyTo animasi saat pengguna memilih saran pencarian
 *  • Auto-fill kolom street, city, province, postalCode via callback
 *  • Mobile-first, fully responsive
 *
 * Usage Policy Nominatim: https://operations.osmfoundation.org/policies/nominatim/
 *  - Debounce ≥ 300 ms pada pencarian
 *  - User-Agent header wajib ditambahkan (dilakukan di sini)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Icon, DivIcon, LatLngExpression } from "leaflet";

import type {
  GeoCoordinates,
  MapPickerProps,
  NominatimReverseResult,
  NominatimSearchResult,
  AddressDraftData,
} from "@/types/address";

// ─── Leaflet icon fix (Next.js SSR workaround) ─────────────────────────────
// Leaflet mengandalkan `window` untuk icon default-nya, sehingga kita perlu
// membuat custom icon secara programatik agar tidak crash di SSR.
function createPinIcon(): Icon | DivIcon {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet") as typeof import("leaflet");

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:36px;height:44px;
        display:flex;align-items:center;justify-content:center;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="44" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            fill="#1abb89" stroke="#fff" stroke-width="1.2"/>
          <circle cx="12" cy="9" r="2.5" fill="#fff"/>
        </svg>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
}

// ─── Nominatim helpers ───────────────────────────────────────────────────────
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const UA_HEADER = { "User-Agent": "FromFram/1.0 (meal-kit-app)" };

/** Reverse geocoding: koordinat → data alamat
 *  zoom=18 = level bangunan (paling presisi) */
async function reverseGeocode(lat: number, lng: number): Promise<NominatimReverseResult | null> {
  try {
    const url =
      `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
    const res = await fetch(url, { headers: UA_HEADER });
    if (!res.ok) return null;
    return (await res.json()) as NominatimReverseResult;
  } catch {
    return null;
  }
}

/** Forward search: query teks → daftar saran */
async function searchAddress(query: string): Promise<NominatimSearchResult[]> {
  try {
    const params = new URLSearchParams({
      format: "json",
      q: query,
      countrycodes: "id", // batasi ke Indonesia
      limit: "6",
      addressdetails: "1",
    });
    const res = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
      headers: UA_HEADER,
    });
    if (!res.ok) return [];
    return (await res.json()) as NominatimSearchResult[];
  } catch {
    return [];
  }
}

/**
 * Ekstrak field alamat dari hasil Nominatim untuk Indonesia.
 *
 * Nominatim tidak konsisten dalam memilih field untuk level kota/kabupaten —
 * bergantung pada jenis wilayah dan versi data OSM:
 *   Kota Madya → `city` = "Kota Bandung"
 *   Kabupaten  → `state_district` = "Kabupaten Sumedang", atau `county` = "Sumedang"
 *   Kecamatan  → `city` = "Jatinangor" (ini yang bikin bug!)
 *
 * Solusi: kembalikan SEMUA kandidat. Biarkan screen yang cocokkan ke dropdown.
 */
function extractAddressFields(result: NominatimReverseResult): {
  street: string;
  province: string;
  postalCode: string;
  /** Semua kandidat nama kota dari Nominatim — screen akan pilih yang cocok */
  cityCandidates: string[];
} {
  const addr = result.address;

  // Street — prioritaskan nama POI, baru nama jalan
  //
  // Untuk lokasi seperti Candi Borobudur:
  //   addr.tourism  = "Candi Borobudur"  ← ini yang benar
  //   addr.road     = "jalur"            ← path di dalam kompleks, jangan dipakai
  //
  // Untuk alamat biasa (tanpa POI):
  //   addr.road = "Jalan Dipatiukur"     ← gunakan ini
  const poiName =
    addr.amenity ??   // kampus, RS, masjid, dll.
    addr.tourism ??   // wisata: Candi Borobudur
    addr.historic ??  // situs sejarah
    addr.leisure ??   // taman, lapangan
    result.name ??    // nama generik dari top-level result
    null;

  const street = poiName
    ? poiName                                   // POI → pakai nama POI
    : (addr.road ?? addr.quarter ?? addr.neighbourhood ?? ""); // alamat biasa → pakai jalan


  // Kumpulkan SEMUA field yang mungkin berisi nama kota/kabupaten
  // (tanpa duplikat, tanpa nilai kosong)
  const seen = new Set<string>();
  const cityCandidates: string[] = [
    addr.state_district, // "Kabupaten Sumedang" — paling andal untuk kabupaten
    addr.county,         // "Sumedang" — alternatif kabupaten
    addr.city,           // "Kota Bandung" atau kecamatan ("Jatinangor") — ambigu!
    addr.town,
    addr.municipality,
    addr.city_district,  // kecamatan — last resort
  ]
    .filter((v): v is string => Boolean(v))
    .filter((v) => { if (seen.has(v)) return false; seen.add(v); return true; });

  return {
    street,
    province: addr.state ?? "",
    postalCode: addr.postcode ?? "",
    cityCandidates,
  };
}

// ─── Sub-komponen: FlyTo controller ─────────────────────────────────────────
interface FlyToProps {
  target: LatLngExpression | null;
}
function FlyToController({ target }: FlyToProps) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 16, { animate: true, duration: 1.2 });
    }
  }, [map, target]);
  return null;
}

// ─── Sub-komponen: DraggableMarker ──────────────────────────────────────────
interface DraggableMarkerProps {
  position: GeoCoordinates;
  icon: Icon | DivIcon;
  onDragEnd: (coords: GeoCoordinates) => void;
}
function DraggableMarker({ position, icon, onDragEnd }: DraggableMarkerProps) {
  const markerRef = useRef<import("leaflet").Marker | null>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onDragEnd({ lat, lng });
      }
    },
  };

  return (
    <Marker
      draggable
      position={[position.lat, position.lng]}
      icon={icon}
      ref={markerRef}
      eventHandlers={eventHandlers}
    />
  );
}

// ─── Sub-komponen: MapClickHandler ──────────────────────────────────────────
function MapClickHandler({ onClick }: { onClick: (coords: GeoCoordinates) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// ─── Komponen Utama: MapPicker ───────────────────────────────────────────────

/** Default center: Jakarta */
const DEFAULT_CENTER: GeoCoordinates = { lat: -6.2, lng: 106.816 };
const DEFAULT_ZOOM = 12;

export function MapPicker({
  initialPosition,
  onLocationSelect,
  height = "320px",
}: MapPickerProps) {
  const [markerPos, setMarkerPos] = useState<GeoCoordinates>(
    initialPosition ?? DEFAULT_CENTER,
  );
  const [flyTarget, setFlyTarget] = useState<LatLngExpression | null>(null);

  // Pencarian
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Reverse geocoding state
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Icon (harus dibuat client-side)
  const [pinIcon, setPinIcon] = useState<Icon | DivIcon | null>(null);
  useEffect(() => {
    setPinIcon(createPinIcon());
  }, []);

  // Debounce pencarian
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setGeoError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchAddress(value.trim());
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setIsSearching(false);
    }, 400); // 400 ms — patuh Usage Policy Nominatim
  };

  // Pilih saran dari dropdown
  const handleSelectSuggestion = useCallback(
    async (item: NominatimSearchResult) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const newPos = { lat, lng };

      setMarkerPos(newPos);
      setFlyTarget([lat, lng]);
      setSearchQuery(item.display_name.split(",")[0] ?? item.display_name);
      setSuggestions([]);
      setShowSuggestions(false);

      // Reverse geocode posisi yang dipilih
      setIsGeoLoading(true);
      setGeoError(null);
      const rev = await reverseGeocode(lat, lng);
      setIsGeoLoading(false);

      if (rev) {
        const { street, province, postalCode, cityCandidates } = extractAddressFields(rev);
        onLocationSelect(newPos, { street, province, postalCode }, cityCandidates);
      } else {
        onLocationSelect(newPos, {}, []);
      }
    },
    [onLocationSelect],
  );

  // Handle drag/klik peta
  const handleMapInteraction = useCallback(
    async (coords: GeoCoordinates) => {
      setMarkerPos(coords);
      setGeoError(null);
      setIsGeoLoading(true);

      const rev = await reverseGeocode(coords.lat, coords.lng);
      setIsGeoLoading(false);

      if (rev) {
        const { street, province, postalCode, cityCandidates } = extractAddressFields(rev);
        setSearchQuery(rev.display_name.split(",").slice(0, 2).join(",").trim());
        onLocationSelect(coords, { street, province, postalCode }, cityCandidates);
      } else {
        setGeoError("Gagal mengambil detail alamat. Isi manual di bawah.");
        onLocationSelect(coords, {}, []);
      }
    },
    [onLocationSelect],
  );

  if (!pinIcon) {
    // Skeleton saat icon belum siap
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl bg-neutral-100"
      >
        <span className="text-sm text-neutral-400">Memuat peta…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Search bar ── */}
      <div className="relative">
        <div className="relative flex items-center">
          {/* Magnifier icon */}
          <svg
            className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            id="map-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
            placeholder="Cari alamat atau nama tempat…"
            autoComplete="off"
            className="h-12 w-full rounded-2xl border border-neutral-300 bg-white pl-10 pr-4 text-[0.97rem] text-neutral-700 outline-none transition focus:border-[#18b887] focus:ring-2 focus:ring-[#18b887]/20"
          />

          {isSearching && (
            <span className="absolute right-4 flex h-4 w-4 items-center justify-center">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#18b887] border-t-transparent" />
            </span>
          )}
        </div>

        {/* Dropdown saran */}
        {showSuggestions && (
          <ul className="absolute z-[1001] mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-xl">
            {suggestions.map((item) => (
              <li key={item.place_id}>
                <button
                  type="button"
                  onMouseDown={() => void handleSelectSuggestion(item)}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-sm text-neutral-700 transition hover:bg-[#f0fdf9]"
                >
                  {/* Pin mini */}
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1abb89]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <span className="line-clamp-2">{item.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Peta Leaflet ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-neutral-200 shadow-md"
        style={{ height }}
      >
        <MapContainer
          center={[markerPos.lat, markerPos.lng]}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <DraggableMarker
            position={markerPos}
            icon={pinIcon}
            onDragEnd={(coords) => void handleMapInteraction(coords)}
          />

          <MapClickHandler onClick={(coords) => void handleMapInteraction(coords)} />

          <FlyToController target={flyTarget} />
        </MapContainer>

        {/* Loading overlay saat reverse geocoding */}
        {isGeoLoading && (
          <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 shadow-lg">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#18b887] border-t-transparent" />
              <span className="text-sm font-medium text-neutral-600">
                Mengambil detail lokasi…
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tip instruksi */}
      <p className="flex items-center gap-1.5 text-xs text-neutral-500">
        <svg
          className="h-3.5 w-3.5 flex-shrink-0 text-[#1abb89]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        Seret pin atau klik peta untuk memilih lokasi. Kolom alamat akan terisi otomatis.
      </p>

      {/* Error reverse geocoding */}
      {geoError && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          ⚠ {geoError}
        </p>
      )}
    </div>
  );
}
