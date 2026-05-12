// tests/keepalive.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Wir importieren die Funktionen aus dem Script
// (keepalive.js muss ES-Module-Exports bereitstellen)
import { loadConfig, pingProject, writeStatus } from '../scripts/keepalive.js';

// --- loadConfig ---

test('loadConfig liest valide JSON-Datei', () => {
  const tmpDir = resolve(tmpdir(), `pm-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  const configPath = resolve(tmpDir, 'projects.json');
  writeFileSync(configPath, JSON.stringify([{ name: 'Test', url: 'https://example.com' }]), 'utf-8');

  const config = loadConfig(configPath);

  assert.equal(config.length, 1);
  assert.equal(config[0].name, 'Test');

  rmSync(tmpDir, { recursive: true });
});

test('loadConfig wirft Fehler wenn Datei nicht existiert', () => {
  assert.throws(
    () => loadConfig('/nicht/vorhanden/projects.json'),
    { code: 'ENOENT' }
  );
});

test('loadConfig wirft Fehler bei ungültigem JSON', () => {
  const tmpDir = resolve(tmpdir(), `pm-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  const configPath = resolve(tmpDir, 'projects.json');
  writeFileSync(configPath, 'kein valides json{{{', 'utf-8');

  assert.throws(() => loadConfig(configPath), SyntaxError);

  rmSync(tmpDir, { recursive: true });
});

// --- pingProject ---

test('pingProject gibt ok-Ergebnis bei HTTP 200 zurück', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    status: 200,
    statusText: 'OK'
  }));

  const result = await pingProject({
    name: 'Test-Projekt',
    url: 'https://example.com',
    headers: { apikey: 'test-key' }
  });

  assert.equal(result.name, 'Test-Projekt');
  assert.equal(result.status, 'ok');
  assert.equal(result.httpStatus, 200);
  assert.ok(typeof result.responseTime === 'number');
  assert.ok(result.responseTime >= 0);
  assert.ok(result.lastChecked.match(/^\d{4}-\d{2}-\d{2}T/));
  assert.equal(result.error, undefined);
});

test('pingProject gibt ok-Ergebnis bei HTTP 401 zurück (Server läuft)', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: false,
    status: 401,
    statusText: 'Unauthorized'
  }));

  const result = await pingProject({
    name: 'Auth-Geschütztes-Projekt',
    url: 'https://example.com'
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.httpStatus, 401);
  assert.ok(typeof result.responseTime === 'number');
});

test('pingProject gibt error-Ergebnis bei HTTP 503 zurück', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: false,
    status: 503,
    statusText: 'Service Unavailable'
  }));

  const result = await pingProject({
    name: 'Fehler-Projekt',
    url: 'https://example.com'
  });

  assert.equal(result.status, 'error');
  assert.equal(result.httpStatus, 503);
  assert.equal(result.responseTime, null);
  assert.ok(result.error.includes('503'));
});

test('pingProject gibt error-Ergebnis bei Netzwerkfehler zurück', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('fetch failed');
  });

  const result = await pingProject({
    name: 'Offline-Projekt',
    url: 'https://example.com'
  });

  assert.equal(result.status, 'error');
  assert.equal(result.httpStatus, null);
  assert.equal(result.responseTime, null);
  assert.equal(result.error, 'fetch failed');
});

test('pingProject sendet Custom-Headers mit', async (t) => {
  let capturedInit;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    capturedInit = init;
    return { ok: true, status: 200, statusText: 'OK' };
  });

  await pingProject({
    name: 'Auth-Projekt',
    url: 'https://example.com',
    headers: { Authorization: 'Bearer TOKEN', apikey: 'KEY' }
  });

  assert.equal(capturedInit.headers.Authorization, 'Bearer TOKEN');
  assert.equal(capturedInit.headers.apikey, 'KEY');
});

test('pingProject gibt frontendUrl weiter wenn vorhanden', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    status: 200,
    statusText: 'OK'
  }));

  const result = await pingProject({
    name: 'Frontend-Projekt',
    url: 'https://example.com',
    frontendUrl: 'https://frontend.example.com'
  });

  assert.equal(result.frontendUrl, 'https://frontend.example.com');
});

test('pingProject enthält kein frontendUrl wenn nicht konfiguriert', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    status: 200,
    statusText: 'OK'
  }));

  const result = await pingProject({ name: 'Kein-Frontend', url: 'https://example.com' });

  assert.equal(result.frontendUrl, undefined);
});

test('pingProject funktioniert ohne headers-Feld', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    status: 200,
    statusText: 'OK'
  }));

  const result = await pingProject({ name: 'Kein-Header', url: 'https://example.com' });

  assert.equal(result.status, 'ok');
});

// --- writeStatus ---

test('writeStatus schreibt valides JSON in Zieldatei', () => {
  const tmpDir = resolve(tmpdir(), `pm-test-${Date.now()}`);
  const outputPath = resolve(tmpDir, 'status.json');

  const statusData = {
    lastRun: '2026-05-12T09:00:00.000Z',
    projects: [{ name: 'Test', status: 'ok', httpStatus: 200, responseTime: 100, lastChecked: '2026-05-12T09:00:01.000Z' }]
  };

  writeStatus(statusData, outputPath);

  assert.ok(existsSync(outputPath));
  const parsed = JSON.parse(readFileSync(outputPath, 'utf-8'));
  assert.equal(parsed.lastRun, '2026-05-12T09:00:00.000Z');
  assert.equal(parsed.projects.length, 1);

  rmSync(tmpDir, { recursive: true });
});

test('writeStatus erstellt fehlendes Verzeichnis', () => {
  const tmpBase = resolve(tmpdir(), `pm-test-${Date.now()}`);
  const tmpDir = resolve(tmpBase, 'tief', 'verschachtelt');
  const outputPath = resolve(tmpDir, 'status.json');

  writeStatus({ lastRun: null, projects: [] }, outputPath);

  assert.ok(existsSync(outputPath));

  rmSync(tmpBase, { recursive: true });
});
