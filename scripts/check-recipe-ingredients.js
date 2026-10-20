const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });

async function checkRecipeIngredients() {
  await client.connect();
  const res = await client.query(`
    SELECT r.id as "recipeId", r.name as "recipeName", 
           i.id as "ingredientId", i.name as "ingredientName", 
           ri.quantity, ri.unit, ri."quantityInKg"
    FROM "RecipeIngredient" ri
    JOIN "Recipe" r ON r.id = ri."recipeId"
    JOIN "Ingredient" i ON i.id = ri."ingredientId"
    ORDER BY r.name ASC;
  `);
  console.log(`Found ${res.rows.length} RecipeIngredient links:`, res.rows.slice(0, 10));
  await client.end();
}
checkRecipeIngredients().catch(console.error);
