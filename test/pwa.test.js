'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));

function pngSize(file) {
  const data = read(file);
  assert.equal(data.subarray(1, 4).toString(), 'PNG');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

test('manifesto PWA tem os dados e ícones necessários', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest').toString());
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.name);

  const icons = new Map(manifest.icons.map(icon => [icon.sizes, icon]));
  assert.ok(icons.has('192x192'));
  assert.ok(icons.has('512x512'));
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  assert.deepEqual(pngSize('public/icons/icon-192.png'), [192, 192]);
  assert.deepEqual(pngSize('public/icons/icon-512.png'), [512, 512]);
  assert.deepEqual(pngSize('public/icons/icon-maskable-512.png'), [512, 512]);
  assert.deepEqual(pngSize('public/icons/apple-touch-icon.png'), [180, 180]);
});

test('página registra a PWA e o servidor conhece o manifesto', () => {
  const html = read('public/index.html').toString();
  const server = read('server.js').toString();
  const worker = read('public/service-worker.js').toString();
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /src="\/pwa\.js"/);
  assert.match(server, /application\/manifest\+json/);
  assert.match(worker, /caches\.open\(CACHE\)/);
});
