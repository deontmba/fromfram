// Unit tests write real rows. Refuse to run against anything but a local DB (CI uses localhost).
const url = process.env.DATABASE_URL ?? '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  throw new Error('Unit tests need DATABASE_URL pointing at a local test database, not a remote one.');
}
