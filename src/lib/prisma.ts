import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const FALLBACK_DATABASE_URL =
  'postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

function sanitizeConnectionString(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!s) return '';

  // 1. Coba parse standar dengan new URL
  try {
    const parsed = new URL(s);
    if (parsed.protocol && parsed.host) return s;
  } catch {
    // 2. Jika gagal karena password mengandung unencoded characters, coba encode password
    const m = s.match(/^(postgres(?:ql)?:\/\/[^:]+:)(.*)(@[^@]+)$/);
    if (m) {
      const encoded = m[1] + encodeURIComponent(m[2]) + m[3];
      try {
        const p = new URL(encoded);
        if (p.protocol && p.host) return encoded;
      } catch {
        // Abaikan jika masih gagal
      }
    }
  }

  // 3. Toleransi pg pooler: jika format berawalan postgres/postgresql://, tetap teruskan
  if (/^postgres(?:ql)?:\/\//.test(s)) {
    return s;
  }

  return '';
}

function createClient(): PrismaClient {
  const rawUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  const connectionString = sanitizeConnectionString(rawUrl) || FALLBACK_DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is missing or invalid.');
  }

  return new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString })) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

// Lazy so `next build` can import route handlers without DATABASE_URL
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default prisma;

