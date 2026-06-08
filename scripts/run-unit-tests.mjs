import { z } from 'zod';

// Mocking NextResponse since next/server relies on NextJS runtime
class MockNextResponse {
  static json(body, init) {
    return {
      status: init?.status || 200,
      body,
      isJson: true
    };
  }
}

// -------------------------------------------------------------
// Mocking the validate function to run in pure node without Next.js server runtime
// -------------------------------------------------------------
export function validate(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message).join(', ');
    return {
      success: false,
      response: MockNextResponse.json({ error: errors }, { status: 400 }),
    };
  }

  return { success: true, data: result.data };
}

// -------------------------------------------------------------
// Pure Node implementation of formatRelativeTime (identical logic to format.ts)
// -------------------------------------------------------------
export function formatRelativeTime(date) {
  if (!date) return 'Belum tersedia';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;

  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return `${diffDays} hari lalu`;

  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} minggu lalu`;
}

// ==========================================
// TEST RUNNER ENGINE
// ==========================================
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected "${expected}", but got "${actual}"`);
  }
}

// ==========================================
// 1. UNIT TESTING & EQUIVALENCE PARTITIONING (BT 4)
// ==========================================
test('Equivalence Partitioning (BT 4): validate() with valid email', () => {
  const schema = z.object({
    email: z.string().email('Format email tidak valid'),
  });
  
  const input = { email: 'pelanggan@fromfarm.com' };
  const result = validate(schema, input);
  
  assert(result.success === true, 'Valid email should pass validation');
  assert('data' in result && result.data.email === input.email, 'Data should be parsed correctly');
});

test('Equivalence Partitioning (BT 4): validate() with invalid email (No @)', () => {
  const schema = z.object({
    email: z.string().email('Format email tidak valid'),
  });
  
  const input = { email: 'pelanggan.fromfarm.com' };
  const result = validate(schema, input);
  
  assert(result.success === false, 'Invalid email should fail validation');
  assert(result.response.status === 400, 'Should return status 400 for bad input');
  assert(result.response.body.error.includes('Format email tidak valid'), 'Should return correct error message');
});

// ========================================================
// ADDED FOR PRESENTATION: EQUIVALENCE PARTITIONING (BT 4) - PORTIONS
// ========================================================
const portionSchema = z.object({
  portions: z.number().min(1, 'Porsi minimal 1').max(10, 'Kapasitas maksimal box 10 porsi'),
});

test('Equivalence Partitioning (BT 4): Portions valid (5 porsi)', () => {
  const result = validate(portionSchema, { portions: 5 });
  assert(result.success === true, 'Portion of 5 should be accepted');
});

test('Equivalence Partitioning (BT 4): Portions invalid below range (-2 porsi)', () => {
  const result = validate(portionSchema, { portions: -2 });
  assert(result.success === false, 'Portion of -2 should be rejected');
  assert(result.response.body.error.includes('Porsi minimal 1'), 'Should output minimum portion error');
});

test('Equivalence Partitioning (BT 4): Portions invalid above range (12 porsi)', () => {
  const result = validate(portionSchema, { portions: 12 });
  assert(result.success === false, 'Portion of 12 should be rejected');
  assert(result.response.body.error.includes('Kapasitas maksimal box 10 porsi'), 'Should output maximum portion error');
});

// ==========================================
// 2. BOUNDARY VALUE TESTING (BT 3)
// ==========================================
const passwordSchema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter').max(32, 'Password maksimal 32 karakter'),
});

test('Boundary Value (BT 3): Password exactly 7 chars (Invalid)', () => {
  const result = validate(passwordSchema, { password: '1234567' });
  assert(result.success === false, 'Password of 7 chars should fail');
  assert(result.response.body.error.includes('Password minimal 8 karakter'), 'Should output min length error');
});

test('Boundary Value (BT 3): Password exactly 8 chars (Valid)', () => {
  const result = validate(passwordSchema, { password: '12345678' });
  assert(result.success === true, 'Password of 8 chars should pass');
});

test('Boundary Value (BT 3): Password exactly 32 chars (Valid)', () => {
  const result = validate(passwordSchema, { password: 'a'.repeat(32) });
  assert(result.success === true, 'Password of 32 chars should pass');
});

test('Boundary Value (BT 3): Password exactly 33 chars (Invalid)', () => {
  const result = validate(passwordSchema, { password: 'a'.repeat(33) });
  assert(result.success === false, 'Password of 33 chars should fail');
  assert(result.response.body.error.includes('Password maksimal 32 karakter'), 'Should output max length error');
});

// ==========================================
// 3. UNIT TESTING: formatRelativeTime
// ==========================================
test('Unit Test: formatRelativeTime handles null/undefined', () => {
  assertEquals(formatRelativeTime(null), 'Belum tersedia');
  assertEquals(formatRelativeTime(undefined), 'Belum tersedia');
});

test('Unit Test: formatRelativeTime handles "Baru saja" (< 1 min)', () => {
  const now = new Date();
  assertEquals(formatRelativeTime(now), 'Baru saja');
});

test('Unit Test: formatRelativeTime handles "menit lalu"', () => {
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000 - 1000); // 5 mins and 1 sec ago
  assertEquals(formatRelativeTime(fiveMinsAgo), '5 menit lalu');
});

// ==========================================
// RUNNER EXECUTOR
// ==========================================
async function runTests() {
  console.log('\n==================================================================');
  console.log('            RUNNING PROJECT FROMFARM AUTOMATED TESTS              ');
  console.log('==================================================================\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const t of tests) {
    try {
      console.log(`[RUNNING] ${t.name}...`);
      await t.fn();
      console.log(`  └─> ✅ SUCCESS\n`);
      passed++;
    } catch (e) {
      console.error(`  └─> ❌ FAILED: ${e.message}\n`);
      failed++;
    }
  }
  
  console.log('==================================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================================\n');
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

