import { PrismaClient } from '@prisma/client'
import { PrismaPg } from "@prisma/adapter-pg"
import 'dotenv/config' 

// Sediakan connection string fallback sebagai pengaman mutlak di Vercel
const connectionString = 
  process.env.DATABASE_URL || 
  "postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const adapter = new PrismaPg({
  connectionString
});

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;