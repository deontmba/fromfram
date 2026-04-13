import { NextRequest, NextResponse } from 'next/server';
import { getDashboard } from '@/controllers/dashboardController';
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
 * Endpoint   : GET /api/dashboard
 * Deskripsi  : Mengambil semua data yang diperlukan halaman dashboard user.
 * Method     : GET
 * Auth       : Cookie `token`
 *
 * Response 200:
 * {
 *   "status": "success",
 *   "data": {
 *     "user": {
 *       "id": "...",
 *       "name": "Budi",
 *       "email": "budi@example.com",
 *       "role": "USER",
 *       "nutritionalProfile": {
 *         "weight": 70,
 *         "height": 175,
 *         "dailyCalorieNeed": 2200,
 *         "allergies": "Tidak ada"
 *       }
 *     },
 *     "subscription": {
 *       "id": "...",
 *       "planType": "BULANAN",
 *       "servings": 2,
 *       "status": "ACTIVE",
 *       "startDate": "2026-04-01T00:00:00.000Z",
 *       "endDate": null,
 *       "pausedUntil": null,
 *       "goal": {
 *         "id": "...",
 *         "name": "Atlet",
 *         "description": "...",
 *         "minCalories": 2500,
 *         "maxCalories": 3500
 *       }
 *     },
 *     "weeklyBox": {
 *       "id": "...",
 *       "weekStartDate": "2026-04-07T00:00:00.000Z",
 *       "weekEndDate": "2026-04-13T00:00:00.000Z",
 *       "selectionDeadline": "2026-04-06T23:59:59.000Z",
 *       "isAutoSelected": false,
 *       "status": "LOCKED",
 *       "mealSelections": [...],
 *       "summary": {
 *         "totalDays": 7,
 *         "selectedDays": 5,
 *         "remainingDays": 2,
 *         "canSelectMenu": false
 *       }
 *     },
 *     "todayDelivery": {
 *       "id": "...",
 *       "deliveryDate": "2026-04-13T00:00:00.000Z",
 *       "status": "PREPARING",
 *       "shippedAt": null,
 *       "deliveredAt": null,
 *       "address": { ... },
 *       "weeklyBox": { "mealSelections": [...] }
 *     },
 *     "recentDeliveries": [...]
 *   }
 * }
 *
 * Response 401: { "error": "Not authenticated." }
 * Response 404: { "message": "User tidak ditemukan." }
 * Response 500: { "message": "Gagal mengambil data dashboard." }
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  return getDashboard(session.userId);
}