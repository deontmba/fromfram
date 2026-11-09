import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Gunakan DIRECT_URL (port 5432) untuk migrasi/db push agar tidak hang di pgbouncer pooler (port 6543)
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
