import { NextRequest } from 'next/server'
import { sign, verify, JwtPayload } from 'jsonwebtoken'
import prisma from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

interface TokenPayload extends JwtPayload {
  id: string
  email: string
  role: string
}

export function signToken(payload: object) {
  return sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload {
  return verify(token, JWT_SECRET) as TokenPayload
}

export async function getAuthenticatedUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (!decoded.id) return null

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    })

    return user
  } catch {
    return null
  }
}