import { NextRequest } from 'next/server'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import prisma from '@/lib/prisma'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret')

interface TokenPayload extends JWTPayload {
  id: string
  email: string
  role: string
}

export async function signToken(payload: object) {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as TokenPayload
}

export async function getAuthenticatedUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.split(' ')[1]
    const decoded = await verifyToken(token)

    if (!decoded.id) return null

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    })

    return user
  } catch {
    return null
  }
}