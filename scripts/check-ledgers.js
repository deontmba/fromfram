const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT il.id, il."sourceType", il."menuName", il.notes, i.name as "ingredientName" 
    FROM "IngredientLedger" il 
    LEFT JOIN "Ingredient" i ON i.id = il."ingredientId";
  `);
  console.log('Ledger rows:', res.rows);
  await client.end();
}
check().catch(console.error);
