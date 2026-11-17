import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

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

function createClient(): PrismaClient {
  const connectionString = sanitizeConnectionString(process.env.DATABASE_URL || process.env.DIRECT_URL);
  // No hardcoded fallback: a missing env var must fail loudly, not silently hit prod.
  if (!connectionString) throw new Error('DATABASE_URL is missing or invalid.');
  return new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString })) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

// Lazy so `next build` can import route handlers without DATABASE_URL; the first query still throws when it is missing.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default prisma;
