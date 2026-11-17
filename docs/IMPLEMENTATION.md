**Bab: Implementasi — Fitur Admin & Ahli Gizi (UI-only)**

Ringkasan
- Fokus: dokumentasi implementasi UI yang sudah dibuat untuk dua persona: `Admin` dan `Ahli Gizi`.
- Semua contoh adalah snippet front-end (React + Next.js) yang relevan dengan kode di repository.

**Daftar Fitur yang didokumentasikan**
- Admin: Dashboard operasional, Deliveries table (force-advance), Users management
- Ahli Gizi: Recipe validation, Weekly Menu validation, Group by health goals

**Struktur file penting**
- Halaman Admin: [src/app/admin/page.tsx](src/app/admin/page.tsx)
- Halaman Nutritionist: [src/app/nutritionist/page.tsx](src/app/nutritionist/page.tsx)
- Komponen UI utama (reusable): [src/components/operations/role-portal-screen.tsx](src/components/operations/role-portal-screen.tsx)
- Styling komponen: [src/components/operations/role-portal-screen.module.css](src/components/operations/role-portal-screen.module.css)

**1) Admin — Dashboard & Deliveries**

Tujuan: tampilan operasional untuk memantau KPI, melihat daftar delivery, dan melakukan tindakan 'Advance' (UI-only).

Snippet: Halaman admin yang merender komponen reusable

```tsx
// File: src/app/admin/page.tsx
import { RolePortalScreen } from "@/components/operations/role-portal-screen";

export default function AdminPage() {
  return <RolePortalScreen role="admin" />;
}
```

Snippet: contoh handler tombol Advance (UI-side) — tambahkan ke komponen tabel bila ingin menghubungkan API

```tsx
// contoh: onClick handler pada tombol Advance
async function handleAdvanceDelivery(deliveryId: string) {
  try {
    const res = await fetch('/api/admin/deliveries/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deliveryId }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error ?? 'Failed to advance delivery');
    }

    // refresh UI setelah sukses (misal: refetch data atau update state lokal)
    // await refetchDeliveries();
  } catch (err) {
    console.error('Advance failed', err);
    // tampilkan notifikasi error
  }
}
```

Catatan: Endpoint `/api/admin/deliveries/advance` perlu diimplementasikan pada back-end jika ingin action ini bekerja end-to-end.

**2) Admin — Users Management**

Tujuan: menampilkan tabel user + status subscription, memudahkan filter dan pemeriksaan jadwal next delivery.

Snippet: contoh fetch users (client-side) — ganti endpoint sesuai API project

```tsx
async function fetchUsers() {
  const res = await fetch('/api/admin/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

// di komponen client:
// const { data: users } = useSWR('/api/admin/users', fetcher);
```

**3) Ahli Gizi — Recipe Validation**

Tujuan: melihat daftar resep, mengecek nilai nutrisi (kalori/protein), menandai resep yang butuh review.

Snippet: cara memanggil API Weekly Menu (sudah ada route di repo)

```ts
// GET /api/subscriptions/weekly-menu
// contoh fetch pada komponen client:
async function getWeeklyMenu() {
  const res = await fetch('/api/subscriptions/weekly-menu');
  const payload = await res.json();
  if (!res.ok) throw new Error(payload?.error ?? 'Failed');
  // payload: { weekStartDate, weekEndDate, menu: [...] }
  return payload;
}
```

Snippet: contoh marking recipe as reviewed (UI-side)

```tsx
async function markRecipeReviewed(recipeId: string) {
  // UI: panggil API PATCH atau POST untuk update readiness
  await fetch(`/api/recipes/${recipeId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ readiness: 'OK' }),
  });
  // update state lokal/refetch
}
```

**4) Ahli Gizi — Weekly Menu grouping by goal**

Tujuan: sediakan view untuk memetakan menu ke grup target (Atlet, Weight Loss, dsb.) dan validasinya.

Snippet: struktur data minimal dan rendering

```tsx
// contoh shape data di UI
type WeeklyMenuItem = {
  day: string;
  recipeId: string;
  name: string;
  calories: number;
  protein: number;
  goalTags: string[]; // ['Atlet', 'Low Sodium']
  validation: 'Valid' | 'Review';
}

// render: group by goal
const groups = groupBy(menuItems, item => item.goalTags[0]);
for (const goal of Object.keys(groups)) {
  // tampilkan kartu group dengan daftar hari/recipe
}
```

**5) Styling dan theming**
- Komponen memakai CSS Module: `role-portal-screen.module.css`.
- Theme vars di-inject via inline style `--accent-strong`, `--accent-mid`, `--accent-soft` sehingga admin/nutritionist dapat memiliki warna berbeda.

Contoh: pengaturan theme dinamically

```tsx
const themeVars = {
  '--accent-strong': '#e12533',
  '--accent-mid': '#ff575f',
  '--accent-soft': '#ffd5d8',
} as React.CSSProperties;

<main style={themeVars}>...</main>
```

**6) Testing & Run**
- Jalankan development server:

```bash
npm install
npm run dev
```

- Buka:
  - http://localhost:3000/admin
  - http://localhost:3000/nutritionist

**7) Next steps (opsional)**
- Hubungkan tabel dan tombol tindakan ke API nyata.
- Tambah konfirmasi modal sebelum `Advance` atau `Mark Reviewed`.
- Tambah unit tests untuk komponen kritikal.


---

File referensi di repo:
- `src/components/operations/role-portal-screen.tsx`
- `src/components/operations/role-portal-screen.module.css`
- `src/app/admin/page.tsx`
- `src/app/nutritionist/page.tsx`

