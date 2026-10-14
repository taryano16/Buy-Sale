const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');

let server;
let baseUrl;
let tempDirectory;

before(async () => {
  tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'second-story-'));
  const app = createApp(path.join(tempDirectory, 'listings.json'));
  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(tempDirectory, { recursive: true, force: true });
});

test('reports a healthy service status', async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('creates a listing and returns it from the listings API', async () => {
  const response = await fetch(`${baseUrl}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Vintage floor lamp',
      price: '65',
      category: 'Home & Living',
      description: 'A lovely brass lamp in working order with a new warm bulb.',
      location: 'Astoria, NY',
      image: ''
    })
  });

  assert.equal(response.status, 201);
  const { listing } = await response.json();
  assert.equal(listing.title, 'Vintage floor lamp');
  assert.equal(listing.price, 65);

  const results = await fetch(`${baseUrl}/api/listings?q=brass&category=Home+%26+Living`);
  const data = await results.json();
  assert.equal(data.total, 1);
  assert.equal(data.listings[0].id, listing.id);
});

test('rejects invalid listing details', async () => {
  const response = await fetch(`${baseUrl}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'X', price: -1, category: 'Unknown' })
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.ok(data.fields.title);
  assert.ok(data.fields.price);
  assert.ok(data.fields.category);
});