/**
 * Script to add AddressSchedule model to the Prisma schema.
 * Uses Node.js file manipulation to correctly handle CRLF line endings.
 */
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

let content = fs.readFileSync(schemaPath, 'utf-8');

// --- 1. Add addressSchedules to User model ---
const userRelationsAnchor = 'ingredientLedgerUser     IngredientLedger[]   @relation("UserIngredientPurchases")\r\n  transactionLedgers       TransactionLedger[]';
const userRelationsReplacement = 'ingredientLedgerUser     IngredientLedger[]   @relation("UserIngredientPurchases")\r\n  transactionLedgers       TransactionLedger[]\r\n  addressSchedules         AddressSchedule[]';

if (content.includes('addressSchedules         AddressSchedule[]')) {
  console.log('[User] addressSchedules relation already exists, skipping.');
} else if (content.includes(userRelationsAnchor)) {
  content = content.replace(userRelationsAnchor, userRelationsReplacement);
  console.log('[User] Added addressSchedules relation.');
} else {
  console.error('[User] Could not find anchor for transactionLedgers in User model. Inspect the schema manually.');
  process.exit(1);
}

// --- 2. Add addressSchedules to Address model ---
const addressRelationsAnchor = 'user          User       @relation(fields: [userId], references: [id])\r\n  deliveries    Delivery[]';
const addressRelationsReplacement = 'user          User       @relation(fields: [userId], references: [id])\r\n  deliveries    Delivery[]\r\n  addressSchedules AddressSchedule[]';

if (content.includes('addressSchedules AddressSchedule[]')) {
  console.log('[Address] addressSchedules relation already exists, skipping.');
} else if (content.includes(addressRelationsAnchor)) {
  content = content.replace(addressRelationsAnchor, addressRelationsReplacement);
  console.log('[Address] Added addressSchedules relation.');
} else {
  console.error('[Address] Could not find anchor for deliveries in Address model. Inspect the schema manually.');
  process.exit(1);
}

// --- 3. Add AddressSchedule model at the end ---
const newModel = `\r\nmodel AddressSchedule {\r\n  id        String    @id @default(cuid())\r\n  userId    String\r\n  dayOfWeek DayOfWeek\r\n  mealType  MealType\r\n  addressId String\r\n  createdAt DateTime  @default(now())\r\n  updatedAt DateTime  @updatedAt\r\n\r\n  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)\r\n  address   Address   @relation(fields: [addressId], references: [id], onDelete: Cascade)\r\n\r\n  @@unique([userId, dayOfWeek, mealType])\r\n  @@index([userId])\r\n}\r\n`;

if (content.includes('model AddressSchedule')) {
  console.log('[AddressSchedule] Model already exists, skipping.');
} else {
  content = content.trimEnd() + newModel;
  console.log('[AddressSchedule] Added model.');
}

fs.writeFileSync(schemaPath, content, 'utf-8');
console.log('Schema updated successfully at:', schemaPath);
