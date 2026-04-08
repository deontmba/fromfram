/**
 * CI smoke runner for FromFram.
 *
 * Goals:
 * - start the built Next.js app locally
 * - verify the seeded admin account can log in
 * - verify cookie-based auth works on core user endpoints
 * - keep checks lightweight so CI stays fast and stable
 */

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const baseUrl = process.env.CI_SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const loginEmail = process.env.CI_SMOKE_EMAIL ?? 'budi@fromfram.test';
const loginPassword = process.env.CI_SMOKE_PASSWORD ?? 'Password123!';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCookieHeader(setCookieHeader) {
  if (!setCookieHeader) {
    return '';
  }

  const cookiePair = setCookieHeader.split(';', 1)[0];
  return cookiePair.trim();
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertOkResponse(result, message) {
  assert(result.response.ok, `${message} (status ${result.response.status})`);
}

function getResponseData(result, message) {
  assert(result.body && typeof result.body === 'object', `${message}: response body is empty or invalid.`);
  return result.body;
}

async function withAuthenticatedClient() {
  const loginResult = await fetchJson(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: loginEmail, password: loginPassword }),
  });

  assertOkResponse(loginResult, 'Login smoke test failed');

  const loginBody = getResponseData(loginResult, 'Login smoke test failed');
  assert(loginBody.user?.email === loginEmail, 'Login smoke test returned an unexpected user.');

  const cookieHeader = extractCookieHeader(loginResult.response.headers.get('set-cookie'));
  assert(cookieHeader.length > 0, 'Login did not return a session cookie.');

  return { cookieHeader, loginBody };
}

async function runSmokeCase(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${name} failed: ${message}`);
  }
}

async function waitForServerReady(maxAttempts = 30) {
  let delayMs = 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { response } = await fetchJson(`${baseUrl}/api/auth/me`);
      if (response.status === 401) {
        return;
      }
    } catch {
      // ignore and retry with backoff
    }

    await sleep(delayMs);
    delayMs = Math.min(delayMs * 1.4, 2500);
  }

  throw new Error('Next.js server did not become ready in time.');
}

async function main() {
  const server = spawn(process.execPath, [nextBin, 'start', '--hostname', '127.0.0.1', '--port', '3000'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });

  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));

  const shutdown = async () => {
    if (server.killed) return;

    server.kill();
    await new Promise((resolve) => server.once('close', resolve));
  };

  try {
    await waitForServerReady();
    console.log('✓ Next.js server is ready');

    const { cookieHeader } = await withAuthenticatedClient();

    await runSmokeCase('auth/me returns the logged-in user', async () => {
      const result = await fetchJson(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader },
      });

      assertOkResponse(result, 'Auth me smoke test failed');
      const body = getResponseData(result, 'Auth me smoke test failed');
      assert(body.user?.email === loginEmail, 'Auth me returned an unexpected user.');
    });

    await runSmokeCase('profile endpoint returns the current profile', async () => {
      const result = await fetchJson(`${baseUrl}/api/profile`, {
        headers: { Cookie: cookieHeader },
      });

      assertOkResponse(result, 'Profile smoke test failed');
      const body = getResponseData(result, 'Profile smoke test failed');
      assert(body.data?.email === loginEmail, 'Profile endpoint returned an unexpected profile.');
    });

    await runSmokeCase('profile address endpoint returns address data', async () => {
      const result = await fetchJson(`${baseUrl}/api/profile/address`, {
        headers: { Cookie: cookieHeader },
      });

      assertOkResponse(result, 'Profile address smoke test failed');
      const body = getResponseData(result, 'Profile address smoke test failed');
      assert(Array.isArray(body.data), 'Profile address endpoint did not return an array.');
      assert(body.data.length > 0, 'Profile address endpoint returned no addresses for the seeded user.');
    });

    await runSmokeCase('subscriptions/me returns the current subscription', async () => {
      const result = await fetchJson(`${baseUrl}/api/subscriptions/me`, {
        headers: { Cookie: cookieHeader },
      });

      assertOkResponse(result, 'Subscriptions/me smoke test failed');
      const body = getResponseData(result, 'Subscriptions/me smoke test failed');
      assert(body.userId || body.status || body.goalId, 'Subscriptions/me endpoint returned an unexpected payload.');
    });

    console.log('Smoke test passed: auth, profile, address, and subscription checks are working.');
  } finally {
    await shutdown();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});