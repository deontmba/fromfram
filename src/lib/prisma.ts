import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const FALLBACK_DATABASE_URL =
  "postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

function sanitizeConnectionString(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim().replace(/^['"]|['"]$/g, '');
  try {
    const parsed = new URL(s);
    if (parsed.protocol && parsed.host) return s;
  } catch {
    // If password contains unencoded special characters like '#', '?', '/', try encoding it
    const m = s.match(/^(postgres(?:ql)?:\/\/[^:]+:)(.*)(@[^@]+)$/);
    if (m) {
      const encoded = m[1] + encodeURIComponent(m[2]) + m[3];
      try {
        const p = new URL(encoded);
        if (p.protocol && p.host) return encoded;
      } catch {
        // invalid
      }
    }
  }
  return '';
}

// Validate process.env.DATABASE_URL and process.env.DIRECT_URL before using
const rawUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const connectionString = sanitizeConnectionString(rawUrl) || FALLBACK_DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;