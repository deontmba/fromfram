const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });

async function check() {
  await client.connect();
  const res = await client.query('SELECT id, name, origin, "supplierName", "stockKg" FROM "Ingredient" ORDER BY name ASC;');
  console.log('Real DB Ingredients:', res.rows);
  await client.end();
}
check().catch(console.error);
