# API Documentation

Dokumentasi ini merangkum endpoint API yang tersedia di project `fromfram`.

---

## Auth

### `POST /api/auth/register`
Registrasi user baru.

**Body**
```json
{
  "name": "Budi",
  "email": "budi@example.com",
  "password": "secret"
}
```

**Response**
- `201 Created` jika sukses
- `409 Conflict` jika email sudah dipakai

---

### `POST /api/auth/login`
Login user dan membuat sesi berbasis cookie JWT `token`.

**Body**
```json
{
  "email": "budi@example.com",
  "password": "secret"
}
```

**Response**
- `200 OK` + cookie `token`
- `401 Unauthorized` jika kredensial salah

---

### `POST /api/auth/logout`
Logout user dengan menghapus cookie `token`.

**Body**
- Tidak ada

**Response**
- `200 OK`

---

### `GET /api/auth/me`
Mengambil data user yang sedang login berdasarkan cookie `token`.

**Auth**
- Cookie `token`

**Response**
- `200 OK` jika sesi valid
- `401 Unauthorized` jika tidak login / token invalid

---

## Profile

### `GET /api/profile`
Mengambil profil lengkap user yang sedang login, termasuk nutritional profile dan daftar alamat.

**Auth**
- Cookie `token`

**Response contoh**
```json
{
  "status": "success",
  "data": {
    "id": "cmnraxzvd00009cv3ly94lzgy",
    "email": "budi@example.com",
    "name": "Budi Santoso",
    "role": "USER",
    "createdAt": "2026-03-24T00:00:00.000Z",
    "nutritionalProfile": {
      "id": "...",
      "weight": 70,
      "height": 175,
      "dailyCalorieNeed": 2200,
      "allergies": "Tidak ada",
      "medicalNotes": "Latihan 4x seminggu"
    },
    "addresses": [...]
  }
}
```

---

### `PUT /api/profile`
Memperbarui profil user yang sedang login.

**Auth**
- Cookie `token`

**Body contoh**
```json
{
  "name": "Budi Santoso",
  "weight": 72,
  "height": 175,
  "dailyCalorieNeed": 2200,
  "allergies": "Tidak ada",
  "medicalNotes": "Latihan 4x seminggu"
}
```

**Response**
- `200 OK` + data profil terbaru
- `400 Bad Request` jika tidak ada data valid untuk diperbarui

---

## Health Profile

### `GET /api/profile/health`
Mengambil data health profile (nutritional profile) user yang sedang login.
Digunakan oleh halaman `/profile/health` (`health-profile-screen.tsx`).

**Auth**
- Cookie `token`

**Response contoh**
```json
{
  "profile": {
    "weight": 70,
    "height": 175,
    "dailyCalorieNeed": 1461,
    "allergies": "Tidak ada",
    "medicalNotes": "Latihan 4x seminggu"
  }
}
```

**Catatan**
- Jika user belum pernah mengisi health profile, `profile` akan bernilai `null`
- Frontend (`health-profile-screen.tsx`) sudah handle fallback ke mock data jika `profile: null`

---

### `PUT /api/profile/health`
Memperbarui health profile user yang sedang login.
Menggunakan upsert — jika belum ada akan dibuat, jika sudah ada akan diupdate.

**Auth**
- Cookie `token`

**Body**
```json
{
  "weight": 70,
  "height": 175,
  "allergies": "Tidak ada",
  "medicalNotes": "Latihan 4x seminggu"
}
```

**Rules**
- `weight` dan `height` wajib diisi dan harus berupa angka positif
- `allergies` dan `medicalNotes` opsional
- `dailyCalorieNeed` dihitung otomatis menggunakan rumus Mifflin-St Jeor jika tidak dikirim

**Response contoh**
```json
{
  "profile": {
    "weight": 70,
    "height": 175,
    "dailyCalorieNeed": 1461,
    "allergies": "Tidak ada",
    "medicalNotes": "Latihan 4x seminggu"
  }
}
```

**Response error**
- `400 Bad Request` jika `weight` atau `height` tidak valid
- `401 Unauthorized` jika tidak login
- `500 Internal Server Error` jika gagal menyimpan

---

## Transactions

### `GET /api/transactions`
Mengambil semua transaction milik user yang sedang login.

**Auth**
- Cookie `token`

**Catatan**
- Hanya mengembalikan transaction milik user yang login
- Diurutkan dari yang terbaru (`createdAt desc`)

**Response contoh**
```json
{
  "data": [
    {
      "id": "txn_123",
      "userId": "user_123",
      "amount": 150000,
      "status": "PENDING",
      "qrisCode": "QRIS-DUMMY-1713500000000-ab12cd34",
      "paidAt": null,
      "createdAt": "2026-04-19T10:00:00.000Z",
      "user": {
        "id": "user_123",
        "name": "Budi Santoso",
        "email": "budi@example.com"
      }
    }
  ]
}
```

**Response error**
- `401 Unauthorized` jika tidak login
- `500 Internal Server Error` jika gagal mengambil data

---

### `POST /api/transactions/generate`
Membuat transaction baru dengan QR dummy untuk user yang sedang login, lalu mengembalikan transaction yang baru dibuat beserta QR image dalam bentuk data URL.

**Auth**
- Cookie `token`

**Body**
```json
{
  "amount": 150000
}
```

**Rules**
- `amount` wajib diisi
- `amount` harus berupa angka lebih besar dari 0
- `status` selalu dibuat sebagai `PENDING`
- `qrisCode` dibuat otomatis sebagai string dummy unik

**Response contoh**
```json
{
  "message": "Transaction generated successfully.",
  "transaction": {
    "id": "txn_123",
    "userId": "user_123",
    "amount": 150000,
    "status": "PENDING",
    "qrisCode": "QRIS-DUMMY-1713500000000-ab12cd34",
    "paidAt": null,
    "createdAt": "2026-04-19T10:00:00.000Z",
    "user": {
      "id": "user_123",
      "name": "Budi Santoso",
      "email": "budi@example.com"
    }
  },
  "qrImageDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Response error**
- `400 Bad Request` jika `amount` tidak valid
- `401 Unauthorized` jika tidak login
- `500 Internal Server Error` jika gagal membuat transaction

---

### `GET /api/transactions/status/:id`
Mengambil status transaction berdasarkan `id`.

**Auth**
- Cookie `token`

**Path parameter**
- `id` wajib diisi

**Rules**
- Transaction harus milik user yang login
- Jika transaction tidak ditemukan, sistem mengembalikan `404`
- Jika transaction milik user lain, sistem mengembalikan `403`

**Response contoh**
```json
{
  "data": {
    "id": "txn_123",
    "userId": "user_123",
    "amount": 150000,
    "status": "PENDING",
    "qrisCode": "QRIS-DUMMY-1713500000000-ab12cd34",
    "paidAt": null,
    "createdAt": "2026-04-19T10:00:00.000Z"
  }
}
```

**Response error**
- `401 Unauthorized` jika tidak login
- `403 Forbidden` jika transaction bukan milik user yang sedang login
- `404 Not Found` jika transaction tidak ditemukan
- `500 Internal Server Error` jika gagal mengambil status transaction

---

## Address

### `GET /api/profile/address`
Mengambil semua alamat milik user yang sedang login.

**Auth**
- Cookie `token`

**Response contoh**
```json
{
  "status": "success",
  "data": [
    {
      "id": "cm_xxxxx",
      "label": "Rumah",
      "recipientName": "Budi Santoso",
      "phoneNumber": "081234567890",
      "street": "Jl. Kenanga No. 12",
      "city": "Bandung",
      "province": "Jawa Barat",
      "postalCode": "40123",
      "notes": "Pagar warna hijau",
      "isDefault": true
    }
  ]
}
```

---

### `POST /api/profile/address`
Menambah alamat baru untuk user yang sedang login.

**Auth**
- Cookie `token`

**Body**
```json
{
  "recipientName": "Budi Santoso",
  "phoneNumber": "081234567890",
  "label": "Rumah",
  "street": "Jl. Kenanga No. 12",
  "city": "Bandung",
  "province": "Jawa Barat",
  "postalCode": "40123",
  "notes": "Pagar warna hijau",
  "isDefault": true
}
```

**Rules**
- `recipientName`, `phoneNumber`, `label`, `street`, `city`, `province`, `postalCode` wajib diisi
- Jika ini alamat pertama, otomatis dijadikan default
- Jika `isDefault: true`, semua alamat lain akan di-reset default-nya

**Response**
- `200 OK` + data alamat baru

---

### `PUT /api/profile/address?id={addressId}`
Mengubah alamat berdasarkan `id`.

**Auth**
- Cookie `token`

**Query**
- `id` wajib diisi

**Body contoh**
```json
{
  "city": "Bandung Barat",
  "notes": "Alamat diperbarui"
}
```

**Response**
- `200 OK` + data alamat terbaru
- `400 Bad Request` jika `id` tidak disertakan atau tidak ada data valid
- `404 Not Found` jika alamat tidak ditemukan

---

### `PATCH /api/profile/address?id={addressId}`
Menjadikan alamat tertentu sebagai alamat utama (default).

**Auth**
- Cookie `token`

**Query**
- `id` wajib diisi

**Response contoh**
```json
{
  "status": "success",
  "message": "Alamat utama diperbarui",
  "data": { ... }
}
```

---

### `DELETE /api/profile/address?id={addressId}`
Menghapus alamat pengiriman milik user berdasarkan `id`.

**Auth**
- Cookie `token`

**Query**
- `id` wajib diisi

**Rules**
- Jika alamat yang dihapus adalah default dan masih ada alamat lain, sistem otomatis menjadikan alamat pertama (urut label asc) sebagai default baru

**Response contoh**
```json
{
  "status": "success",
  "message": "Alamat berhasil dihapus"
}
```

**Response error**
- `400 Bad Request` jika `id` tidak disertakan
- `404 Not Found` jika alamat tidak ditemukan

---

## Subscriptions

### `GET /api/subscriptions`
Mengambil semua data subscription yang tersimpan.

**Auth**
- Cookie `token`

**Catatan**
- Mengembalikan relasi `user` dan `goal`
- Diurutkan dari subscription terbaru

---

### `POST /api/subscriptions`
Membuat subscription baru.

**Auth**
- Cookie `token`

**Body contoh user biasa**
```json
{
  "goalId": "goal_123",
  "planType": "BULANAN",
  "servings": 4
}
```

**Body contoh admin buat untuk user lain**
```json
{
  "goalId": "goal_123",
  "planType": "BULANAN",
  "servings": 4,
  "userId": "user_lain_456"
}
```

**Rules**
- User biasa membuat subscription untuk dirinya sendiri
- Admin boleh menyertakan `userId` user lain
- `servings` harus antara 1 sampai 6

---

### `GET /api/subscriptions/me`
Mengambil subscription milik user yang sedang login.

**Auth**
- Cookie `token`

---

### `PATCH /api/subscriptions/me/pause`
Menjeda subscription aktif sampai tanggal resume tertentu.

**Auth**
- Cookie `token`

**Body**
```json
{
  "resumeDate": "2026-04-20T00:00:00.000Z"
}
```

---

### `PATCH /api/subscriptions/me/resume`
Mengaktifkan kembali subscription yang sedang `PAUSED`.

**Auth**
- Cookie `token`

**Body**
- Tidak ada

---

### `PATCH /api/subscriptions/me/cancel`
Menjadwalkan pembatalan subscription di akhir siklus berjalan.

**Auth**
- Cookie `token`

**Body**
- Tidak ada

---

## Dashboard

### `GET /api/dashboard`
Mengambil semua data yang diperlukan halaman dashboard user dalam satu request.

**Auth**
- Cookie `token`

**Response contoh**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "cmnraxzvd00009cv3ly94lzgy",
      "name": "Hafizh Fadhl",
      "email": "hafizh@gmail.com",
      "role": "USER",
      "nutritionalProfile": {
        "weight": 70,
        "height": 175,
        "dailyCalorieNeed": 1461,
        "allergies": "Tidak ada"
      }
    },
    "subscription": {
      "id": "...",
      "planType": "BULANAN",
      "servings": 2,
      "status": "ACTIVE",
      "startDate": "2026-04-01T00:00:00.000Z",
      "endDate": null,
      "pausedUntil": null,
      "goal": {
        "id": "...",
        "name": "Atlet",
        "description": "Paket untuk atlet aktif",
        "minCalories": 2500,
        "maxCalories": 3500
      }
    },
    "weeklyBox": {
      "id": "...",
      "weekStartDate": "2026-04-07T00:00:00.000Z",
      "weekEndDate": "2026-04-13T00:00:00.000Z",
      "selectionDeadline": "2026-04-06T23:59:59.000Z",
      "isAutoSelected": false,
      "status": "LOCKED",
      "mealSelections": [
        {
          "id": "...",
          "dayOfWeek": "SENIN",
          "recipe": {
            "id": "...",
            "name": "Ayam Bakar Madu",
            "description": "...",
            "calories": 450,
            "protein": 35,
            "imageUrl": "..."
          }
        }
      ],
      "summary": {
        "totalDays": 7,
        "selectedDays": 5,
        "remainingDays": 2,
        "canSelectMenu": false
      }
    },
    "todayDelivery": {
      "id": "...",
      "deliveryDate": "2026-04-13T00:00:00.000Z",
      "status": "PREPARING",
      "shippedAt": null,
      "deliveredAt": null,
      "address": {
        "label": "Rumah",
        "street": "Jl. Kenanga No. 12",
        "city": "Bandung",
        "province": "Jawa Barat",
        "recipientName": "Hafizh Fadhl"
      },
      "weeklyBox": {
        "mealSelections": [
          {
            "recipe": {
              "name": "Ayam Bakar Madu",
              "calories": 450,
              "imageUrl": "..."
            }
          }
        ]
      }
    },
    "recentDeliveries": [
      {
        "id": "...",
        "deliveryDate": "2026-04-13T00:00:00.000Z",
        "status": "PREPARING",
        "shippedAt": null,
        "deliveredAt": null
      }
    ]
  }
}
```

**Catatan**
- `subscription`, `weeklyBox`, dan `todayDelivery` akan bernilai `null` jika belum ada data
- `recentDeliveries` menampilkan maksimal 7 pengiriman terakhir
- `weeklyBox.summary.canSelectMenu` bernilai `true` jika status masih `PENDING_SELECTION` dan deadline belum lewat
- Semua query dijalankan secara paralel untuk performa optimal

**Response error**
- `401 Unauthorized` jika tidak login
- `404 Not Found` jika user tidak ditemukan
- `500 Internal Server Error` jika terjadi kesalahan server

---

## Ringkasan Auth

Project ini menggunakan pendekatan berikut:

- `POST /api/auth/login` membuat cookie JWT bernama `token`
- Semua endpoint yang memerlukan autentikasi membaca cookie tersebut
- Tidak perlu mengirim `Authorization: Bearer ...` — cukup pastikan cookie `token` tersimpan di browser/Postman

---

## Contoh Alur Test Cepat

```
1.  POST  /api/auth/register
2.  POST  /api/auth/login
3.  GET   /api/auth/me
4.  GET   /api/profile
5.  PUT   /api/profile
6.  GET   /api/profile/health
7.  PUT   /api/profile/health
8.  GET   /api/profile/address
9.  POST  /api/profile/address
10. PUT   /api/profile/address?id={addressId}
11. PATCH /api/profile/address?id={addressId}
12. DELETE /api/profile/address?id={addressId}
13. GET   /api/subscriptions/me
14. PATCH /api/subscriptions/me/pause
15. PATCH /api/subscriptions/me/resume
16. PATCH /api/subscriptions/me/cancel
17. GET   /api/dashboard
```