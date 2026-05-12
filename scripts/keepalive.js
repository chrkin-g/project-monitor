// scripts/keepalive.js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PING_TIMEOUT_MS = 10_000;

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
      signal: AbortSignal.timeout(PING_TIMEOUT_MS)
    });
    const responseTime = Math.round(performance.now() - start);
    // Alles unter 500 gilt als "erreichbar" — auch 401/404 bedeutet, der Server läuft
    if (response.status < 500) {
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
    process.stdout.write(`  -> ${project.name} (${project.url}) ... `);
    const result = await pingProject(project);
    results.push(result);
    const statusText = result.status === 'ok'
      ? `OK ${result.httpStatus} (${result.responseTime}ms)`
      : `FEHLER ${result.error}`;
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

  console.log(`\nAlle ${results.length} Projekt(e) erreichbar.`);
}

// Nur ausführen wenn direkt aufgerufen (nicht beim Import in Tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
