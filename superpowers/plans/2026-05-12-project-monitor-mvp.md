# Projekt Monitor MVP — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen generischen HTTP-Projekt-Monitor bauen, der via GitHub Actions alle 3 Tage beliebige Endpunkte pingt, einen Keep-Alive-Effekt erzeugt und den Status auf einer GitHub-Pages-Dashboard-Seite anzeigt.

**Architecture:** `scripts/keepalive.js` liest `config/projects.json`, pingt alle Endpunkte mit optionalen Custom-Headers, schreibt `docs/status.json`. Ein GitHub Actions Cron-Job führt das Script aus und committet `status.json` mit `[skip ci]` zurück ins Repo. Das GitHub-Pages-Dashboard (`docs/index.html`) liest `status.json` per `fetch()` und zeigt den Status als Karten-Grid an.

**Tech Stack:** Node.js 18+ (native `fetch`, `node:test`, `node:fs`, `node:path`), GitHub Actions, GitHub Pages, Tailwind CSS CDN

---

## Dateiübersicht

| Datei | Aktion | Verantwortung |
|---|---|---|
| `.gitignore` | Erstellen | `config/projects.json` ausschließen |
| `package.json` | Erstellen | Projektmetadaten, npm-Scripts, `"type": "module"` |
| `config/projects.example.json` | Erstellen | Konfigurationsvorlage (im Repo) |
| `docs/status.json` | Erstellen | Initialer Leerstand (im Repo) |
| `scripts/keepalive.js` | Erstellen | Kern-Script: Ping-Logik, Status schreiben |
| `tests/keepalive.test.js` | Erstellen | Unit-Tests für keepalive.js |
| `.github/workflows/keepalive.yml` | Erstellen | Cron-Workflow, Secret → Config, Commit |
| `docs/index.html` | Erstellen | Dashboard: Karten-Grid, Auto-Refresh |
| `CLAUDE.md` | Erstellen | Projektdoku mit Modul-Verweisen |
| `README.md` | Aktualisieren | Schritt-für-Schritt Einrichtungsanleitung |
| `markdowns/keepalive-script.md` | Erstellen | Script-Dokumentation |
| `markdowns/github-actions.md` | Erstellen | Workflow-Dokumentation |
| `markdowns/dashboard.md` | Erstellen | Dashboard-Dokumentation |
| `markdowns/konfiguration.md` | Erstellen | Konfig-Format und Sicherheit |
| `markdowns/backlog.md` | Erstellen | Offene Aufgaben |
| `markdowns/backlog_erledigt.md` | Erstellen | Abgeschlossene Aufgaben |

---

## Task 1: Projekt-Grundgerüst

**Files:**
- Erstellen: `.gitignore`
- Erstellen: `package.json`
- Erstellen: `config/projects.example.json`
- Erstellen: `docs/status.json`

- [ ] **Schritt 1.1: `.gitignore` anlegen**

```
# Lokale Projektkonfiguration mit echten Keys — niemals committen
config/projects.json

# Node.js
node_modules/

# Brainstorming-Artefakte
.superpowers/
```

- [ ] **Schritt 1.2: `package.json` anlegen**

```json
{
  "name": "project-monitor",
  "version": "1.0.0",
  "description": "Generischer HTTP-Projekt-Monitor mit Keep-Alive und Status-Dashboard",
  "type": "module",
  "scripts": {
    "keepalive": "node scripts/keepalive.js",
    "test": "node --test tests/"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Schritt 1.3: `config/projects.example.json` anlegen**

```json
[
  {
    "name": "Mein Supabase Projekt",
    "url": "https://xxxxx.supabase.co/rest/v1/",
    "headers": {
      "apikey": "REPLACE_WITH_ANON_KEY"
    }
  },
  {
    "name": "Meine Website",
    "url": "https://meinedomain.de/health"
  }
]
```

- [ ] **Schritt 1.4: `docs/status.json` mit Initialwert anlegen**

```json
{
  "lastRun": null,
  "projects": []
}
```

- [ ] **Schritt 1.5: Committen**

```bash
git add .gitignore package.json config/projects.example.json docs/status.json
git commit -m "chore: Projekt-Grundgerüst anlegen"
```

---

## Task 2: keepalive.js — TDD

**Files:**
- Erstellen: `tests/keepalive.test.js`
- Erstellen: `scripts/keepalive.js`

### Tests zuerst

- [ ] **Schritt 2.1: `tests/` Verzeichnis und Testdatei anlegen**

```javascript
// tests/keepalive.test.js
import { test, mock } from 'node:test';
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
  const tmpDir = resolve(tmpdir(), `pm-test-${Date.now()}`, 'tief', 'verschachtelt');
  const outputPath = resolve(tmpDir, 'status.json');

  writeStatus({ lastRun: null, projects: [] }, outputPath);

  assert.ok(existsSync(outputPath));

  rmSync(resolve(tmpdir(), `pm-test-${outputPath.split('pm-test-')[1].split('/')[0]}`), { recursive: true });
});
```

- [ ] **Schritt 2.2: Tests ausführen — müssen fehlschlagen (keepalive.js existiert noch nicht)**

```bash
npm test
```

Erwartetes Ergebnis: `ERR_MODULE_NOT_FOUND` oder ähnlicher Import-Fehler.

- [ ] **Schritt 2.3: `scripts/keepalive.js` implementieren**

```javascript
// scripts/keepalive.js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Liest und parst die Projektkonfiguration aus einer JSON-Datei
export function loadConfig(configPath) {
  const raw = readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

// Pingt einen einzelnen Endpunkt und gibt ein Ergebnisobjekt zurück
export async function pingProject(project) {
  const start = performance.now();
  try {
    const response = await fetch(project.url, {
      headers: project.headers ?? {},
      signal: AbortSignal.timeout(10000)
    });
    const responseTime = Math.round(performance.now() - start);
    if (response.ok) {
      return {
        name: project.name,
        status: 'ok',
        httpStatus: response.status,
        responseTime,
        lastChecked: new Date().toISOString()
      };
    }
    return {
      name: project.name,
      status: 'error',
      httpStatus: response.status,
      responseTime: null,
      lastChecked: new Date().toISOString(),
      error: `HTTP ${response.status} ${response.statusText}`
    };
  } catch (err) {
    return {
      name: project.name,
      status: 'error',
      httpStatus: null,
      responseTime: null,
      lastChecked: new Date().toISOString(),
      error: err.message
    };
  }
}

// Schreibt das Status-Objekt als formatiertes JSON in die Zieldatei
export function writeStatus(statusData, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(statusData, null, 2) + '\n', 'utf-8');
}

async function main() {
  const configPath = resolve(__dirname, '..', 'config', 'projects.json');
  const outputPath = resolve(__dirname, '..', 'docs', 'status.json');

  let projects;
  try {
    projects = loadConfig(configPath);
  } catch (err) {
    console.error(`Fehler beim Laden der Konfiguration (${configPath}): ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(projects) || projects.length === 0) {
    console.error('Konfiguration ist leer oder kein Array.');
    process.exit(1);
  }

  console.log(`Pinge ${projects.length} Projekt(e)...\n`);

  const results = [];
  for (const project of projects) {
    process.stdout.write(`  → ${project.name} (${project.url}) ... `);
    const result = await pingProject(project);
    results.push(result);
    const statusText = result.status === 'ok'
      ? `✓ ${result.httpStatus} (${result.responseTime}ms)`
      : `✗ ${result.error}`;
    console.log(statusText);
  }

  const statusData = {
    lastRun: new Date().toISOString(),
    projects: results
  };

  writeStatus(statusData, outputPath);
  console.log(`\nStatus geschrieben: ${outputPath}`);

  const fehler = results.filter(r => r.status === 'error');
  if (fehler.length > 0) {
    console.error(`\n${fehler.length} Projekt(e) nicht erreichbar:`);
    fehler.forEach(f => console.error(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  }

  console.log(`\nAlle ${results.length} Projekt(e) erreichbar. ✓`);
}

// Nur ausführen wenn direkt aufgerufen (nicht beim Import in Tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Schritt 2.4: Tests ausführen — müssen grün sein**

```bash
npm test
```

Erwartetes Ergebnis:
```
✔ loadConfig liest valide JSON-Datei
✔ loadConfig wirft Fehler wenn Datei nicht existiert
✔ loadConfig wirft Fehler bei ungültigem JSON
✔ pingProject gibt ok-Ergebnis bei HTTP 200 zurück
✔ pingProject gibt error-Ergebnis bei HTTP 503 zurück
✔ pingProject gibt error-Ergebnis bei Netzwerkfehler zurück
✔ pingProject sendet Custom-Headers mit
✔ pingProject funktioniert ohne headers-Feld
✔ writeStatus schreibt valides JSON in Zieldatei
✔ writeStatus erstellt fehlendes Verzeichnis
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

- [ ] **Schritt 2.5: Committen**

```bash
git add scripts/keepalive.js tests/keepalive.test.js
git commit -m "feat: keepalive.js mit Unit-Tests"
```

---

## Task 3: GitHub Actions Workflow

**Files:**
- Erstellen: `.github/workflows/keepalive.yml`

- [ ] **Schritt 3.1: Workflow-Verzeichnis anlegen und `keepalive.yml` erstellen**

```bash
mkdir -p .github/workflows
```

```yaml
# .github/workflows/keepalive.yml
name: Projekt Keep-Alive

on:
  schedule:
    # Alle 3 Tage um 09:00 UTC (Tage 1, 4, 7, 10, ...)
    - cron: '0 9 */3 * *'
  workflow_dispatch:
    # Manueller Trigger für Tests und bei Bedarf

permissions:
  contents: write

jobs:
  keepalive:
    runs-on: ubuntu-latest
    steps:
      - name: Repository auschecken
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Node.js 18 einrichten
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Projektkonfiguration aus Secret erstellen
        env:
          PROJECTS_CONFIG: ${{ secrets.PROJECTS_CONFIG }}
        run: |
          mkdir -p config
          echo "$PROJECTS_CONFIG" > config/projects.json

      - name: Keep-Alive Script ausführen
        run: node scripts/keepalive.js

      - name: Git-Benutzer konfigurieren
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Status committen und pushen
        run: |
          git add docs/status.json
          if git diff --staged --quiet; then
            echo "Keine Änderungen an status.json."
          else
            git commit -m "chore: update status.json [skip ci]"
            git push
          fi
```

- [ ] **Schritt 3.2: Committen**

```bash
git add .github/workflows/keepalive.yml
git commit -m "feat: GitHub Actions Keep-Alive Workflow"
```

---

## Task 4: Dashboard (`docs/index.html`)

**Files:**
- Erstellen: `docs/index.html`

- [ ] **Schritt 4.1: `docs/index.html` erstellen**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Projekt Monitor</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0f172a; }
  </style>
</head>
<body class="min-h-screen text-slate-100 p-4 md:p-8">

  <div class="max-w-4xl mx-auto">

    <!-- Kopfzeile -->
    <div class="flex items-start justify-between mb-8 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-100">📡 Projekt Monitor</h1>
        <p id="lastRun" class="text-sm text-slate-500 mt-1">Lade Status...</p>
      </div>
      <div class="bg-slate-800 rounded-xl px-5 py-3 text-center shrink-0">
        <div id="summary" class="text-2xl font-bold text-green-400">—</div>
        <div class="text-xs text-slate-500 mt-0.5">Projekte online</div>
      </div>
    </div>

    <!-- Fehlermeldung -->
    <div id="error" class="hidden bg-red-950 border border-red-800 text-red-300 rounded-lg p-4 mb-6 text-sm"></div>

    <!-- Karten-Grid -->
    <div id="grid" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>

    <!-- Fußzeile -->
    <div class="mt-8 pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-600">
      <span>Keep-Alive · Ping alle 3 Tage via GitHub Actions</span>
      <span id="refreshTimer">Aktualisiert in 60s</span>
    </div>

  </div>

  <script>
    // Zeitstempel ins Deutsche formatieren
    function formatTimestamp(iso) {
      if (!iso) return '—';
      return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(new Date(iso));
    }

    // Einzelne Projektkarte rendern
    function renderCard(project) {
      const isOk = project.status === 'ok';
      const borderColor = isOk ? 'border-green-500' : 'border-red-500';
      const badgeBg = isOk ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400';
      const badgeText = isOk ? 'ONLINE' : 'FEHLER';
      const responseTime = project.responseTime != null ? `${project.responseTime} ms` : '— ms';
      const httpStatus = project.httpStatus ?? '—';
      const checkedAt = formatTimestamp(project.lastChecked);

      return `
        <div class="bg-slate-800 rounded-xl p-4 border-l-4 ${borderColor}">
          <div class="flex items-start justify-between mb-3 gap-2">
            <span class="font-semibold text-slate-100 text-sm leading-snug">${escapeHtml(project.name)}</span>
            <span class="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${badgeBg}">${badgeText}</span>
          </div>
          <div class="flex gap-5">
            <div>
              <div class="text-xs text-slate-500 uppercase tracking-wide">Antwortzeit</div>
              <div class="text-base font-semibold ${isOk ? 'text-slate-100' : 'text-red-400'}">${responseTime}</div>
            </div>
            <div>
              <div class="text-xs text-slate-500 uppercase tracking-wide">HTTP</div>
              <div class="text-base font-semibold ${isOk ? 'text-slate-100' : 'text-red-400'}">${httpStatus}</div>
            </div>
            <div>
              <div class="text-xs text-slate-500 uppercase tracking-wide">Geprüft</div>
              <div class="text-xs text-slate-400 mt-1">${checkedAt}</div>
            </div>
          </div>
          ${!isOk && project.error ? `<div class="mt-2 text-xs text-red-400 truncate">${escapeHtml(project.error)}</div>` : ''}
        </div>
      `;
    }

    // XSS-Schutz
    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Status laden und Dashboard aktualisieren
    async function loadStatus() {
      try {
        const res = await fetch('./status.json?t=' + Date.now());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        document.getElementById('error').classList.add('hidden');

        const online = data.projects.filter(p => p.status === 'ok').length;
        const total = data.projects.length;
        const summaryEl = document.getElementById('summary');
        summaryEl.textContent = `${online} / ${total}`;
        summaryEl.className = `text-2xl font-bold ${online === total ? 'text-green-400' : online === 0 ? 'text-red-400' : 'text-yellow-400'}`;

        document.getElementById('lastRun').textContent =
          data.lastRun ? `Letzter Run: ${formatTimestamp(data.lastRun)}` : 'Noch kein Run';

        document.getElementById('grid').innerHTML =
          data.projects.length > 0
            ? data.projects.map(renderCard).join('')
            : '<p class="text-slate-500 col-span-2 text-sm">Noch keine Projekte konfiguriert.</p>';

      } catch (err) {
        document.getElementById('error').textContent = `Fehler beim Laden: ${err.message}`;
        document.getElementById('error').classList.remove('hidden');
      }
    }

    // Auto-Refresh-Countdown
    let countdown = 60;
    function tick() {
      document.getElementById('refreshTimer').textContent = `Aktualisiert in ${countdown}s`;
      if (countdown <= 0) {
        countdown = 60;
        loadStatus();
      }
      countdown--;
    }

    loadStatus();
    setInterval(tick, 1000);
  </script>

</body>
</html>
```

- [ ] **Schritt 4.2: Dashboard lokal testen**

```bash
# Einfachen HTTP-Server starten (Python ist auf den meisten Systemen verfügbar)
cd docs && python3 -m http.server 8080
```

Browser öffnen: `http://localhost:8080`

Erwartetes Ergebnis: Dashboard lädt, zeigt "Noch keine Projekte konfiguriert." (da `status.json` leer ist).

- [ ] **Schritt 4.3: Committen**

```bash
git add docs/index.html
git commit -m "feat: Status-Dashboard für GitHub Pages"
```

---

## Task 5: Dokumentation

**Files:**
- Erstellen/Aktualisieren: `CLAUDE.md`
- Aktualisieren: `README.md`
- Erstellen: `markdowns/keepalive-script.md`
- Erstellen: `markdowns/github-actions.md`
- Erstellen: `markdowns/dashboard.md`
- Erstellen: `markdowns/konfiguration.md`
- Erstellen: `markdowns/backlog.md`
- Erstellen: `markdowns/backlog_erledigt.md`

- [ ] **Schritt 5.1: `markdowns/` Verzeichnis anlegen**

```bash
mkdir -p markdowns
```

- [ ] **Schritt 5.2: `CLAUDE.md` anlegen**

```markdown
# Projekt Monitor

Generischer HTTP-Projekt-Monitor mit Keep-Alive-Funktion und Status-Dashboard.
Primärer Use-Case: Supabase Free-Plan-Projekte am Leben halten (pausieren nach 7 Tagen Inaktivität).

## Architektur

```
GitHub Actions (Cron alle 3 Tage)
  → scripts/keepalive.js (liest config/projects.json, pingt URLs)
  → docs/status.json (Ergebnis)
  → git push [skip ci]
  → GitHub Pages (docs/index.html zeigt status.json)
```

## Module

| Modul | Datei | Dokumentation |
|---|---|---|
| Kern-Script | `scripts/keepalive.js` | [markdowns/keepalive-script.md](markdowns/keepalive-script.md) |
| Workflow | `.github/workflows/keepalive.yml` | [markdowns/github-actions.md](markdowns/github-actions.md) |
| Dashboard | `docs/index.html` | [markdowns/dashboard.md](markdowns/dashboard.md) |
| Konfiguration | `config/projects.json` | [markdowns/konfiguration.md](markdowns/konfiguration.md) |

## Backlog

- Offene Aufgaben: [markdowns/backlog.md](markdowns/backlog.md)
- Erledigte Aufgaben: [markdowns/backlog_erledigt.md](markdowns/backlog_erledigt.md)

## Dokumentationsregel

**Wichtig:** Bei jeder Änderung an einem Modul die zugehörige `.md`-Datei in `markdowns/` aktualisieren.
Bei neuen Modulen oder größeren Features eine neue `.md`-Datei anlegen und hier in CLAUDE.md verlinken.
```

- [ ] **Schritt 5.3: `README.md` ersetzen**

```markdown
# Projekt Monitor

Generischer HTTP-Projekt-Monitor mit Keep-Alive für Supabase Free-Plan und Status-Dashboard via GitHub Pages.

## Was macht das Tool?

- Pingt alle konfigurierten Endpunkte alle 3 Tage per GitHub Actions
- Verhindert damit das Pausieren von Supabase Free-Plan-Projekten
- Zeigt Status, Antwortzeit und HTTP-Code auf einer öffentlichen Dashboard-Seite

---

## Einrichtung (Schritt für Schritt)

### 1. Repository einrichten

```bash
git clone https://github.com/DEIN-USERNAME/project-monitor.git
cd project-monitor
```

### 2. Lokale `projects.json` anlegen (zum Testen)

**Wo findest du URL und anon Key in Supabase?**
1. Öffne [supabase.com](https://supabase.com) → Dein Projekt → **Settings** → **API**
2. Kopiere **Project URL** → das ist deine `url` (hänge `/rest/v1/` an)
3. Kopiere **anon public** Key → das ist dein `apikey`

```bash
cp config/projects.example.json config/projects.json
# Datei öffnen und mit echten Werten befüllen
```

Beispiel `config/projects.json`:
```json
[
  {
    "name": "Mein Supabase Projekt",
    "url": "https://abcdefghij.supabase.co/rest/v1/",
    "headers": {
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
]
```

> ⚠️ **Sicherheit:** Nur `anon`-Keys verwenden — niemals `service_role`-Keys.
> Die Datei `config/projects.json` ist in `.gitignore` und wird **niemals committet**.

Lokaler Test:
```bash
node scripts/keepalive.js
# → Gibt Ping-Ergebnis aus und schreibt docs/status.json
```

### 3. GitHub Secret `PROJECTS_CONFIG` anlegen

Das Secret enthält den kompletten JSON-Inhalt deiner `projects.json`.

1. GitHub Repo öffnen → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** klicken
3. Name: `PROJECTS_CONFIG`
4. Value: Den kompletten Inhalt deiner `config/projects.json` einfügen (das ganze JSON-Array)
5. **Add secret** klicken

### 4. GitHub Pages aktivieren

1. GitHub Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, Ordner: `/docs`
4. **Save** klicken
5. Nach ~2 Minuten ist das Dashboard unter `https://DEIN-USERNAME.github.io/project-monitor` erreichbar

### 5. Neue Projekte hinzufügen

Eintrag in `config/projects.json` (lokal) ergänzen:

```json
{
  "name": "Neues Projekt",
  "url": "https://neues-projekt.supabase.co/rest/v1/",
  "headers": {
    "apikey": "ANON_KEY"
  }
}
```

Dann das GitHub Secret `PROJECTS_CONFIG` mit dem neuen Inhalt aktualisieren.

Für Endpunkte ohne Auth reicht:
```json
{
  "name": "Meine Website",
  "url": "https://meinedomain.de/health"
}
```

### 6. Workflow manuell testen

1. GitHub Repo → **Actions** → **Projekt Keep-Alive**
2. **Run workflow** → **Run workflow** klicken
3. Workflow-Log prüfen: Alle Projekte sollten mit ✓ erscheinen
4. Nach dem Run: `docs/status.json` im Repo sollte aktualisiert sein
5. Dashboard prüfen: `https://DEIN-USERNAME.github.io/project-monitor`

---

## Sicherheitshinweise

- **Nur `anon`-Keys** — der anon Key ist öffentlich lesbar und hat eingeschränkte Rechte
- **Niemals `service_role`-Keys** in die Konfiguration — diese haben vollen DB-Zugriff
- `config/projects.json` steht in `.gitignore` und wird nie ins Repo committet
- GitHub Secrets sind verschlüsselt und in Logs nicht sichtbar
```

- [ ] **Schritt 5.4: `markdowns/keepalive-script.md` anlegen**

```markdown
# Keepalive Script

**Datei:** `scripts/keepalive.js`  
**Ausführen:** `npm run keepalive` oder `node scripts/keepalive.js`  
**Tests:** `npm test`

## Exported Functions

### `loadConfig(configPath: string): Array`
Liest und parst `config/projects.json`. Wirft bei fehlender Datei (`ENOENT`) oder ungültigem JSON (`SyntaxError`).

### `pingProject(project: object): Promise<object>`
Sendet HTTP GET auf `project.url` mit optionalen `project.headers`. Timeout: 10 Sekunden.

Rückgabe:
```json
{
  "name": "Projektname",
  "status": "ok | error",
  "httpStatus": 200,
  "responseTime": 142,
  "lastChecked": "2026-05-12T09:00:01.234Z",
  "error": "nur bei status: error"
}
```

### `writeStatus(statusData: object, outputPath: string): void`
Schreibt `statusData` als formatiertes JSON. Erstellt fehlendes Verzeichnis automatisch.

## Verhalten

- Pingt Projekte sequenziell (kein paralleles Pingen → einfacheres Logging)
- Exit Code 0: alle Projekte erreichbar
- Exit Code 1: mindestens ein Projekt fehlgeschlagen oder Konfigurationsfehler

## Konfiguration

Liest `config/projects.json` relativ zum Projektroot. Pfad kann nicht per CLI-Argument überschrieben werden (YAGNI — bei Bedarf in Phase 2 ergänzen).
```

- [ ] **Schritt 5.5: `markdowns/github-actions.md` anlegen**

```markdown
# GitHub Actions Workflow

**Datei:** `.github/workflows/keepalive.yml`

## Trigger

- **Cron:** `0 9 */3 * *` — täglich 09:00 UTC an Tag 1, 4, 7, 10, ...
- **Manuell:** `workflow_dispatch` — über GitHub Actions UI auslösbar

## Ablauf

1. Repository auschecken
2. Node.js 18 einrichten
3. `config/projects.json` aus Secret `PROJECTS_CONFIG` erstellen
4. `node scripts/keepalive.js` ausführen
5. `docs/status.json` committen mit `[skip ci]` (verhindert Endlosschleife)
6. Pushen (nur wenn Änderungen vorhanden)

## Secret einrichten

Secret `PROJECTS_CONFIG` muss den kompletten JSON-Inhalt der Projektkonfiguration enthalten.
Siehe README.md für Schritt-für-Schritt-Anleitung.

## Permissions

Der Workflow benötigt `contents: write` um `status.json` zurück ins Repo committen zu können.

## Warum `[skip ci]`?

Ohne diesen Tag würde jeder automatische Commit einen neuen Workflow-Run auslösen → Endlosschleife.
```

- [ ] **Schritt 5.6: `markdowns/dashboard.md` anlegen**

```markdown
# Status-Dashboard

**Datei:** `docs/index.html`  
**URL:** `https://DEIN-USERNAME.github.io/project-monitor`

## Technik

- Statische HTML-Seite, kein Build-Step
- Tailwind CSS via CDN
- Lädt `docs/status.json` per `fetch('./status.json')`
- Auto-Refresh alle 60 Sekunden

## Layout

- Dunkles Theme (Slate-Palette, Hintergrund `#0f172a`)
- Karten-Grid: 2 Spalten (Desktop), 1 Spalte (Mobil)
- Pro Karte: Name, Status-Badge (ONLINE/FEHLER), Antwortzeit, HTTP-Code, Prüf-Zeitstempel
- Gesamtzähler oben rechts (X / Y Projekte online)

## `status.json` Format

Siehe [konfiguration.md](konfiguration.md) für das vollständige Schema.

## Lokales Testen

```bash
cd docs && python3 -m http.server 8080
# → http://localhost:8080
```
```

- [ ] **Schritt 5.7: `markdowns/konfiguration.md` anlegen**

```markdown
# Konfiguration

## `config/projects.json`

Diese Datei ist **nicht im Repo** (steht in `.gitignore`). Lokal aus `config/projects.example.json` kopieren und befüllen.

### Schema

```json
[
  {
    "name": "string, Pflichtfeld — Anzeigename im Dashboard",
    "url": "string, Pflichtfeld — vollständige URL des Endpunkts",
    "headers": {
      "optionaler-header": "wert"
    }
  }
]
```

`headers` ist optional. Ohne `headers` wird ein einfaches GET ohne Auth-Header gesendet.

### Supabase-spezifisch

```json
{
  "name": "Mein Projekt",
  "url": "https://PROJEKT-ID.supabase.co/rest/v1/",
  "headers": {
    "apikey": "ANON_KEY"
  }
}
```

URL und anon Key findest du in Supabase unter **Settings → API**.

## `docs/status.json` Schema

```json
{
  "lastRun": "ISO-Timestamp oder null",
  "projects": [
    {
      "name": "string",
      "status": "ok | error",
      "httpStatus": "number | null",
      "responseTime": "number (ms) | null",
      "lastChecked": "ISO-Timestamp",
      "error": "string — nur bei status: error"
    }
  ]
}
```

## Sicherheit

- Nur `anon`-Keys verwenden (eingeschränkte Rechte, öffentlich lesbar)
- **Niemals** `service_role`-Keys — diese haben vollen Datenbankzugriff
- `config/projects.json` niemals committen
```

- [ ] **Schritt 5.8: `markdowns/backlog.md` anlegen**

```markdown
# Backlog — Offene Aufgaben

Offene Tickets und Ideen für zukünftige Entwicklung.

---

## Phase 2 — Ideen

- [ ] **P2-001** Historien-Tracking: Status-History der letzten N Runs in `docs/history.json`
- [ ] **P2-002** E-Mail-Benachrichtigung bei Fehler (via GitHub Actions + SMTP Secret)
- [ ] **P2-003** Response-Time-Verlauf als Sparkline-Diagramm im Dashboard
- [ ] **P2-004** Kategorien/Tags pro Projekt (z.B. "Supabase", "API", "Frontend")
- [ ] **P2-005** Konfigurierbare Check-Intervalle pro Projekt
- [ ] **P2-006** Slack-Webhook-Benachrichtigung bei Statuswechsel
```

- [ ] **Schritt 5.9: `markdowns/backlog_erledigt.md` anlegen**

```markdown
# Backlog — Erledigte Aufgaben

Abgeschlossene Tickets.

---

## MVP

- [x] **MVP-001** Projekt-Grundgerüst einrichten (.gitignore, package.json, Beispielkonfig)
- [x] **MVP-002** keepalive.js mit Unit-Tests implementieren
- [x] **MVP-003** GitHub Actions Workflow mit Cron und Secret-Handling
- [x] **MVP-004** Status-Dashboard (docs/index.html) mit Karten-Grid und Auto-Refresh
- [x] **MVP-005** Vollständige Dokumentation (CLAUDE.md, README.md, markdowns/)
```

- [ ] **Schritt 5.10: Alles committen**

```bash
git add CLAUDE.md README.md markdowns/
git commit -m "docs: CLAUDE.md, README.md und Modul-Dokumentationen"
```

---

## Abschluss-Check

Nach allen Tasks:

- [ ] `npm test` läuft durch (10 Tests grün)
- [ ] `config/projects.json` ist in `.gitignore` eingetragen
- [ ] `.github/workflows/keepalive.yml` existiert
- [ ] `docs/index.html` lädt lokal via `python3 -m http.server`
- [ ] `CLAUDE.md` verlinkt alle `markdowns/`-Dateien
- [ ] `markdowns/backlog.md` und `markdowns/backlog_erledigt.md` existieren

```bash
git log --oneline
# Erwartete Commits (neueste zuerst):
# docs: CLAUDE.md, README.md und Modul-Dokumentationen
# feat: Status-Dashboard für GitHub Pages
# feat: GitHub Actions Keep-Alive Workflow
# feat: keepalive.js mit Unit-Tests
# chore: Projekt-Grundgerüst anlegen
# docs: add project monitor MVP design spec
# Initial commit
```
