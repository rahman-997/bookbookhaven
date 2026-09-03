import { spawn } from 'node:child_process';
import process from 'node:process';

const publicPort = Number(process.env.SMOKE_PORT || 4100);
const backendPort = Number(process.env.SMOKE_BACKEND_PORT || 4101);
const baseUrl = `http://127.0.0.1:${publicPort}`;
const startupTimeoutMs = Number(process.env.SMOKE_STARTUP_TIMEOUT_MS || 90_000);
const startedAt = Date.now();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
    ...options
  });
  return response;
}

async function json(path, options = {}, expectedStatus = 200) {
  const response = await request(path, options);
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${path} returned non-JSON status=${response.status}: ${text.slice(0, 300)}`);
  }
  assert(response.status === expectedStatus, `${path} expected ${expectedStatus}, got ${response.status}: ${text.slice(0, 300)}`);
  return { response, payload };
}

function mutationHeaders(cookie, contentType = true) {
  return {
    ...(cookie ? { cookie } : {}),
    ...(contentType ? { 'content-type': 'application/json' } : {}),
    origin: baseUrl,
    'sec-fetch-site': 'same-origin'
  };
}

async function waitForReady(child) {
  let lastError;
  while (Date.now() - startedAt < startupTimeoutMs) {
    if (child.exitCode !== null) throw new Error(`free-hosting runtime exited before readiness with code ${child.exitCode}`);
    try {
      const { payload } = await json('/api/health');
      if (payload?.status === 'ok' && payload?.backend?.data?.database === 'up') return payload;
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  throw new Error(`runtime did not become ready within ${startupTimeoutMs}ms${lastError ? `: ${lastError.message}` : ''}`);
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  const exited = await Promise.race([
    new Promise((resolve) => child.once('exit', () => resolve(true))),
    sleep(8_000).then(() => false)
  ]);
  if (!exited && child.exitCode === null) child.kill('SIGKILL');
}

const runtime = spawn(process.execPath, ['scripts/start-free-hosting.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(publicPort),
    BACKEND_PORT: String(backendPort),
    INTERNAL_API_URL: `http://127.0.0.1:${backendPort}/api/v1`,
    CORS_ORIGIN: baseUrl,
    NEXT_PUBLIC_SITE_URL: baseUrl,
    JWT_SECRET: 'ci-smoke-jwt-secret-7x-bookhaven-stable-2026',
    ADMIN_PASSWORD: 'CiSmokeAdmin-7x!Stable',
    AUTO_SEED: 'true',
    NEXT_TELEMETRY_DISABLED: '1',
    MONGOMS_DOWNLOAD_DIR: process.env.MONGOMS_DOWNLOAD_DIR || '/tmp/bookhaven-mongodb-binaries'
  }
});

try {
  const health = await waitForReady(runtime);
  assert(health.frontend === 'ok', 'frontend health is not ok');
  assert(health.backend?.success === true, 'backend health success is not true');
  assert(health.backend?.data?.storageMode === 'ephemeral', 'smoke runtime must report ephemeral storage');
  assert(health.backend?.data?.durable === false, 'smoke runtime must report non-durable storage');

  const homepage = await request('/');
  const homepageText = await homepage.text();
  assert(homepage.status === 200, `homepage expected 200, got ${homepage.status}`);
  assert(homepageText.includes('Find the book that changes your'), 'homepage hero content missing');
  assert(homepageText.includes('Browse without the noise'), 'catalog section missing from homepage');

  const catalog = await json('/api/backend/books?limit=2&sort=title');
  assert(catalog.payload?.success === true, 'catalog API did not report success');
  assert(Array.isArray(catalog.payload?.data) && catalog.payload.data.length === 2, 'seeded catalog did not return two books');
  const firstBook = catalog.payload.data[0];
  const firstBookId = firstBook?._id;
  const originalStock = Number(firstBook?.stock);
  assert(typeof firstBookId === 'string' && firstBookId.length > 0, 'catalog book id missing');
  assert(Number.isInteger(originalStock) && originalStock > 0, 'seeded catalog book must have positive integer stock');

  const facets = await json('/api/backend/books/facets');
  assert(facets.payload?.success === true, 'facets API did not report success');
  assert(Number(facets.payload?.data?.total) >= 10, 'facets total does not include seeded catalog');
  assert(Array.isArray(facets.payload?.data?.categories) && facets.payload.data.categories.length > 0, 'facets categories missing');
  assert(Number(facets.payload?.data?.price?.max) >= Number(facets.payload?.data?.price?.min), 'facets price range invalid');

  const robots = await request('/robots.txt');
  const robotsText = await robots.text();
  assert(robots.status === 200, `robots.txt expected 200, got ${robots.status}`);
  assert(robotsText.includes('Disallow: /admin'), 'robots.txt is missing private admin disallow');
  assert(robotsText.includes('sitemap.xml'), 'robots.txt is missing sitemap reference');

  const sitemap = await request('/sitemap.xml');
  const sitemapText = await sitemap.text();
  assert(sitemap.status === 200, `sitemap expected 200, got ${sitemap.status}`);
  assert(sitemapText.includes('<urlset'), 'sitemap XML root missing');
  assert(sitemapText.includes('/books/'), 'sitemap does not contain book URLs');

  const email = `smoke-${Date.now()}@example.com`;
  const register = await json('/api/session/register', {
    method: 'POST',
    headers: mutationHeaders(),
    body: JSON.stringify({ name: 'Smoke Reader', email, password: 'SmokeReader-7x!Stable' })
  });
  assert(register.payload?.success === true, 'registration did not report success');
  assert(register.payload?.data?.email === email, 'registered email mismatch');
  const setCookie = register.response.headers.get('set-cookie');
  assert(setCookie?.includes('bookhaven_token='), 'registration did not issue the session cookie');
  const cookie = setCookie.split(';', 1)[0];

  const me = await json('/api/backend/auth/me', { headers: { cookie } });
  assert(me.payload?.data?.email === email, 'authenticated session lookup failed');

  const addCart = await json('/api/backend/cart/items', {
    method: 'POST',
    headers: mutationHeaders(cookie),
    body: JSON.stringify({ bookId: firstBookId, quantity: 1 })
  }, 201);
  assert(addCart.payload?.success === true, 'cart add did not report success');

  const cartBeforeCheckout = await json('/api/backend/cart', { headers: { cookie } });
  assert(cartBeforeCheckout.payload?.success === true, 'cart lookup did not report success');
  assert(Array.isArray(cartBeforeCheckout.payload?.data?.items) && cartBeforeCheckout.payload.data.items.length === 1, 'authenticated cart did not persist the item');

  const checkout = await json('/api/backend/orders', {
    method: 'POST',
    headers: mutationHeaders(cookie),
    body: JSON.stringify({
      shippingAddress: '42 Smoke Test Avenue, Istanbul, Türkiye',
      paymentMethod: 'cash_on_delivery'
    })
  }, 201);
  assert(checkout.payload?.success === true, 'checkout did not report success');
  const orderId = checkout.payload?.data?._id;
  assert(typeof orderId === 'string' && orderId.length > 0, 'created order id missing');
  assert(checkout.payload?.data?.status === 'pending', 'new order must start pending');
  assert(Array.isArray(checkout.payload?.data?.items) && checkout.payload.data.items.length === 1, 'created order item snapshot missing');

  const cartAfterCheckout = await json('/api/backend/cart', { headers: { cookie } });
  assert(Array.isArray(cartAfterCheckout.payload?.data?.items) && cartAfterCheckout.payload.data.items.length === 0, 'checkout did not clear the cart');

  const orderHistory = await json('/api/backend/orders?page=1&limit=10', { headers: { cookie } });
  assert(orderHistory.payload?.success === true, 'order history did not report success');
  assert(Array.isArray(orderHistory.payload?.data) && orderHistory.payload.data.some((order) => order._id === orderId), 'created order missing from order history');
  assert(Number(orderHistory.payload?.meta?.total) === 1, 'order history total should be one for the smoke user');

  const orderDetail = await json(`/api/backend/orders/${encodeURIComponent(orderId)}`, { headers: { cookie } });
  assert(orderDetail.payload?.data?._id === orderId, 'order detail lookup did not return the created order');

  const bookAfterCheckout = await json(`/api/backend/books/${encodeURIComponent(firstBookId)}`);
  assert(Number(bookAfterCheckout.payload?.data?.stock) === originalStock - 1, 'checkout did not decrement inventory exactly once');

  console.log(`[bookhaven-smoke] PASS in ${Date.now() - startedAt}ms`);
} finally {
  await stop(runtime);
}
