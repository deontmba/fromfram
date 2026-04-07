import { NextRequest, NextResponse } from 'next/server';
import { manageAddress } from '@/controllers/profileController';

const MOCK_USER_ID = "1";

export async function POST(req: NextRequest) {
  return manageAddress.add(req, MOCK_USER_ID);
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get('id');

  if (!addressId) return NextResponse.json({ message: "ID Alamat diperlukan" }, { status: 400 });
  return manageAddress.update(req, addressId);
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get('id');

  if (!addressId) return NextResponse.json({ message: "ID Alamat diperlukan" }, { status: 400 });
  return manageAddress.setDefault(req, MOCK_USER_ID, addressId);
}