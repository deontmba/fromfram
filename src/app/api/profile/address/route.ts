import { NextRequest, NextResponse } from 'next/server';
import { getAddresses, manageAddress } from '@/controllers/profileController';
import { getSessionUserId } from '@/lib/session';
import { validate } from '@/lib/validate';
import { addAddressSchema, updateAddressSchema } from '@/schemas';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING')
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  return getAddresses(session.userId);
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  const body = await req.json();
  const parsed = validate(addAddressSchema, body);
  if (!parsed.success) return parsed.response;

  return manageAddress.add(session.userId, parsed.data);
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get('id');
  if (!addressId) return NextResponse.json({ message: 'ID Alamat diperlukan' }, { status: 400 });

  const body = await req.json();
  const parsed = validate(updateAddressSchema, body);
  if (!parsed.success) return parsed.response;

  return manageAddress.update(session.userId, addressId, parsed.data);
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get('id');
  if (!addressId) return NextResponse.json({ message: 'ID Alamat diperlukan' }, { status: 400 });

  return manageAddress.setDefault(session.userId, addressId);
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get('id');
  if (!addressId) return NextResponse.json({ message: 'ID Alamat diperlukan' }, { status: 400 });

  return manageAddress.delete(session.userId, addressId);
}