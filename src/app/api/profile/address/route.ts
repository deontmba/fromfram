import { NextRequest, NextResponse } from 'next/server';
import { getAddresses, manageAddress } from '@/controllers/profileController';
import { getSessionUserId } from '@/lib/session';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json(
      { error: 'Server auth configuration missing.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

/**
 * API Documentation
 * Endpoint   : GET /api/profile/address
 * Deskripsi  : Mengambil semua alamat milik user yang sedang login.
 * Method     : GET
 * Proses     :
 * 1) Validasi sesi user dari cookie JWT.
 * 2) Ambil daftar alamat milik user aktif.
 * 3) Kembalikan data alamat.
 */

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  return getAddresses(session.userId);
}

/**
 * API Documentation
 * Endpoint   : POST /api/profile/address
 * Deskripsi  : Menambah alamat baru untuk user yang sedang login.
 * Method     : POST
 * Input      : JSON body data alamat (recipientName, phoneNumber, label, street, city, province, postalCode, notes, isDefault, dst).
 * Proses     :
 * 1) Ambil payload alamat dari request body.
 * 2) Validasi sesi user dari cookie JWT.
 * 3) Teruskan ke controller `manageAddress.add`.
 * 3) Simpan alamat ke database.
 */

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  return manageAddress.add(req, session.userId);
}

/**
 * API Documentation
 * Endpoint   : PUT /api/profile/address?id={addressId}
 * Deskripsi  : Mengubah data alamat berdasarkan id alamat.
 * Method     : PUT
 * Input      :
 * - Query param `id`: string (wajib)
 * - JSON body field alamat yang ingin diubah (recipientName, phoneNumber, label, street, city, province, postalCode, notes, isDefault)
 * Proses     :
 * 1) Ambil `id` dari query string.
 * 2) Jika `id` kosong, kembalikan 400.
 * 3) Panggil controller `manageAddress.update`.
 */

export async function PUT(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get('id');

  if (!addressId) return NextResponse.json({ message: "ID Alamat diperlukan" }, { status: 400 });
  return manageAddress.update(req, session.userId, addressId);
}

/**
 * API Documentation
 * Endpoint   : PATCH /api/profile/address?id={addressId}
 * Deskripsi  : Menetapkan alamat utama (default) untuk user.
 * Method     : PATCH
 * Input      : Query param `id`: string (wajib)
 * Proses     :
 * 1) Ambil `id` dari query string.
 * 2) Jika `id` kosong, kembalikan 400.
 * 3) Panggil controller `manageAddress.setDefault` dengan userId dari sesi login.
 * 4) Controller melakukan transaction untuk reset default lalu set alamat terpilih.
 */

export async function PATCH(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get('id');

  if (!addressId) return NextResponse.json({ message: "ID Alamat diperlukan" }, { status: 400 });
  return manageAddress.setDefault(req, session.userId, addressId);
}