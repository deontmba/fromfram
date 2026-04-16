import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

/**
 * API Documentation
 * Endpoint   : GET /api/v1/weekly-menu/:weekStart
 * Deskripsi  : Mengambil daftar resep yang tersedia untuk minggu tertentu.
 * Method     : GET
 * Auth       : Cookie `token`
 * Params     : weekStart — format YYYY-MM-DD, e.g. 2026-04-14
 * Response   :
 * {
 *   "weekStartDate": "2026-04-14T00:00:00.000Z",
 *   "data": [{ "weeklyMenuId": "...", "recipe": { ... } }]
 * }
 */

// Define the runtime shape of your parameters
type DynamicRouteParams = {
  weekStart: string; // The dynamic segment for the week start date
};

// Define the RouteContext as the build system expects it (with Promise in params)
interface RouteContext {
  params: Promise<DynamicRouteParams>; // <--- Crucial change here
}

export async function GET(
  req: NextRequest,
  context: RouteContext // <--- Change argument name and type here
) {
  // Await context.params to satisfy the TypeScript compiler and correctly access params
  const { weekStart: weekStartParam } = await context.params; // <--- FIX: Add 'await' and destructure from context.params, renamed to avoid clash with local 'weekStart' variable

  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const weekStart = new Date(weekStartParam); // <--- FIX: Use weekStartParam here
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json(
        { error: 'Invalid weekStart format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // You might also want to filter by userId if the weekly menu is user-specific
    // For a general menu, it might not need userId, depends on your business logic.
    // If it's general for *all* users, remove the userId filter if it was there.
    const weeklyMenus = await prisma.weeklyMenu.findMany({
      where: { weekStartDate: weekStart },
      include: {
        recipe: {
          include: {
            nutritionist: {
              select: { id: true, name: true },
            },
            ingredients: {
              include: {
                ingredient: {
                  select: {
                    id: true,
                    name: true,
                    origin: true,
                    supplierName: true,
                    isAllergen: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (weeklyMenus.length === 0) {
      return NextResponse.json({ message: 'No menu available for this week.', data: [] });
    }

    const data = weeklyMenus.map((wm) => ({
      weeklyMenuId: wm.id,
      weekStartDate: wm.weekStartDate,
      recipe: {
        id: wm.recipe.id,
        name: wm.recipe.name,
        description: wm.recipe.description,
        calories: wm.recipe.calories,
        protein: wm.recipe.protein,
        servings: wm.recipe.servings,
        imageUrl: wm.recipe.imageUrl,
        nutritionist: wm.recipe.nutritionist,
        ingredients: wm.recipe.ingredients.map((ri) => ({
          quantity: ri.quantity,
          ingredient: ri.ingredient,
        })),
      },
    }));

    return NextResponse.json({ weekStartDate: weekStart, data });
  } catch (error) {
    console.error('[WEEKLY MENU GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil weekly menu.' }, { status: 500 });
  }
}