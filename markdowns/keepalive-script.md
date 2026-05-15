# Keepalive Script

**Datei:** `scripts/keepalive.js`
**Ausführen:** `npm run keepalive` oder `node scripts/keepalive.js`
**Tests:** `npm test`

## Exported Functions

### `loadConfig(configPath: string): Array`
Liest und parst eine JSON-Konfigurationsdatei. Wirft bei fehlender Datei (`ENOENT`) oder ungültigem JSON (`SyntaxError`).

### `pingProject(project: object): Promise<object>`
Sendet HTTP GET auf `project.url` mit optionalen `project.headers`. Timeout: 30 Sekunden (`PING_TIMEOUT_MS`).

Ist `project.frontendUrl` gesetzt, wird dieser Wert in das Ergebnis übernommen (für das Dashboard-Frontend).

Rückgabe bei Erfolg:
```json
{
  "name": "Projektname",
  "frontendUrl": "https://beispiel.de",
  "status": "ok",
  "httpStatus": 200,
  "responseTime": 142,
  "lastChecked": "2026-05-12T09:00:01.234Z"
}
```

Rückgabe bei Fehler:
```json
{
  "name": "Projektname",
  "status": "error",
  "httpStatus": 503,
  "responseTime": null,
  "lastChecked": "2026-05-12T09:00:01.234Z",
  "error": "HTTP 503 Service Unavailable"
}
```

### `pingNeonDatabase(project: object): Promise<object>`

Führt `SELECT 1` gegen eine Neon-Datenbank aus. Verwendet `@neondatabase/serverless` (HTTP-basiert, kein TCP nötig). Timeout: 10 Sekunden (`NEON_TIMEOUT_MS`).

`project.connectionString` muss ein gültiger PostgreSQL-Connection-String sein.

Rückgabe bei Erfolg:

```json
{
  "name": "Projektname DB",
  "status": "ok",
  "httpStatus": null,
  "responseTime": 87,
  "lastChecked": "2026-05-12T09:00:01.234Z"
}
```

### `writeStatus(statusData: object, outputPath: string): void`
Schreibt `statusData` als formatiertes JSON. Erstellt fehlendes Verzeichnis automatisch.

## Verhalten

- Pingt zuerst alle HTTP-Endpunkte (`config/projects.json`), dann alle Neon-DBs (`config/neon-projects.json`)
- Neon-Konfiguration ist optional — fehlt die Datei, wird sie stillschweigend übersprungen
- Exit Code 0: alle Projekte erreichbar
- Exit Code 1: mindestens ein Projekt fehlgeschlagen oder Konfigurationsfehler

## Konfiguration

- HTTP-Endpunkte: `config/projects.json` (aus GitHub Secret `PROJECTS_CONFIG`)
- Neon-Datenbanken: `config/neon-projects.json` (aus GitHub Secret `NEON_PROJECTS_CONFIG`, optional)
