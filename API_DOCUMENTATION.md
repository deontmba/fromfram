# API Documentation

Dokumentasi ini merangkum endpoint API yang tersedia di project `fromfram`.

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

### `POST /api/auth/logout`
Logout user dengan menghapus cookie `token`.

**Body**
- Tidak ada

**Response**
- `200 OK`

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
Mengambil profil user yang sedang login.

**Auth**
- Cookie `token`

### `PUT /api/profile`
Memperbarui profil user yang sedang login.

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

### `GET /api/profile/address`
Mengambil semua alamat milik user yang sedang login.

**Auth**
- Cookie `token`

### `POST /api/profile/address`
Menambah alamat baru untuk user yang sedang login.

**Body contoh**
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

### `PUT /api/profile/address?id={addressId}`
Mengubah alamat berdasarkan `id`.

**Body contoh**
```json
{
  "recipientName": "Budi Santoso",
  "phoneNumber": "081234567890",
  "city": "Bandung Barat",
  "notes": "Alamat kantor diperbarui"
}
```

**Auth**
- Cookie `token`

**Query**
- `id` wajib diisi

### `PATCH /api/profile/address?id={addressId}`
Menjadikan alamat tertentu sebagai alamat utama.

**Auth**
- Cookie `token`

**Query**
- `id` wajib diisi

---

## Subscriptions

### `GET /api/subscriptions`
Mengambil semua data subscription yang tersimpan.

**Auth**
- Cookie `token`

**Catatan**
- Mengembalikan relasi `user` dan `goal`
- Diurutkan dari subscription terbaru

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

### `GET /api/subscriptions/me`
Mengambil subscription milik user yang sedang login.

**Auth**
- Cookie `token`

### `PATCH /api/subscriptions/me/pause`
Menjeda subscription aktif sampai tanggal resume tertentu.

**Body**
```json
{
  "resumeDate": "2026-04-20T00:00:00.000Z"
}
```

### `PATCH /api/subscriptions/me/resume`
Mengaktifkan kembali subscription yang sedang `PAUSED`.

**Body**
- Tidak ada

### `PATCH /api/subscriptions/me/cancel`
Menjadwalkan pembatalan subscription di akhir siklus berjalan.

**Body**
- Tidak ada

---

## Ringkasan auth

Project ini menggunakan pendekatan berikut:

- `POST /api/auth/login` membuat cookie JWT bernama `token`
- Endpoint profile dan subscription yang bersifat user-authenticated membaca cookie itu
- Tidak perlu mengirim `Authorization: Bearer ...` untuk API yang sudah memakai session cookie

---

## Contoh alur test cepat

1. `POST /api/auth/login`
2. `GET /api/auth/me`
3. `GET /api/profile`
4. `GET /api/profile/address`
5. `GET /api/subscriptions/me`
6. `PATCH /api/subscriptions/me/pause`
7. `PATCH /api/subscriptions/me/resume`
8. `PATCH /api/subscriptions/me/cancel`

Jika kamu mau, dokumen ini bisa saya perluas lagi dengan contoh response JSON untuk setiap endpoint.