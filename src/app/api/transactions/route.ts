import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
 * Endpoint   : GET /api/transactions
 * Deskripsi  : Mengambil semua transaction milik user yang sedang login.
 * Method     : GET
 * Auth       : Cookie `token`
 */
export async function GET(req: NextRequest) {
	const session = await getSessionUserId(req);
	if ('error' in session) {
		return getAuthErrorResponse(session.error);
	}

	try {
		const transactions = await prisma.transaction.findMany({
			where: { userId: session.userId },
			orderBy: { createdAt: 'desc' },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});

		return NextResponse.json({ data: transactions }, { status: 200 });
	} catch (error) {
		console.error('[TRANSACTIONS GET ERROR]', error);
		return NextResponse.json(
			{ error: 'Gagal mengambil transaction.' },
			{ status: 500 }
		);
	}
}
