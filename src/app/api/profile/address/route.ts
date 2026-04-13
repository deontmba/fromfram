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
 * GET /api/profile/address
 * Mengambil semua alamat milik user yang sedang login.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }
  return getAddresses(session.userId);
}

/**
 * POST /api/profile/address
 * Menambah alamat baru untuk user yang sedang login.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }
  return manageAddress.add(req, session.userId);
}

/**
 * PUT /api/profile/address?id={addressId}
 * Mengubah data alamat berdasarkan id alamat.
 */
export async function PUT(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get('id');

  if (!addressId) {
    return NextResponse.json({ message: 'ID Alamat diperlukan' }, { status: 400 });
  }
  return manageAddress.update(req, session.userId, addressId);
}

/**
 * PATCH /api/profile/address?id={addressId}
 * Menjadikan alamat tertentu sebagai alamat utama.
 */
export async function PATCH(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get('id');

  if (!addressId) {
    return NextResponse.json({ message: 'ID Alamat diperlukan' }, { status: 400 });
  }
  return manageAddress.setDefault(req, session.userId, addressId);
}

/**
 * API Documentation
 * Endpoint   : DELETE /api/profile/address?id={addressId}
 * Deskripsi  : Menghapus alamat pengiriman milik user berdasarkan id.
 *              Jika alamat yang dihapus adalah default dan masih ada alamat lain,
 *              sistem otomatis menjadikan alamat pertama (urut label asc) sebagai default baru.
 * Method     : DELETE
 * Auth       : Cookie `token`
 * Query      : `id` wajib diisi
 * Response   :
 * - 200 OK   : { status: "success", message: "Alamat berhasil dihapus" }
 * - 400      : { message: "ID Alamat diperlukan" }
 * - 404      : { message: "Alamat tidak ditemukan" }
 * - 500      : { message: "Gagal menghapus alamat" }
 */
export async function DELETE(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get('id');

  if (!addressId) {
    return NextResponse.json({ message: 'ID Alamat diperlukan' }, { status: 400 });
  }

  return manageAddress.delete(req, session.userId, addressId);
}