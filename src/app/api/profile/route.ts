import { NextRequest } from 'next/server';
import { getProfile, updateProfile } from '@/controllers/profileController';

const MOCK_USER_ID = "1"; 

export async function GET(req: NextRequest) {
  return getProfile(req, MOCK_USER_ID);
}

export async function PUT(req: NextRequest) {
  return updateProfile(req, MOCK_USER_ID);
}