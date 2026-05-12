# Keepalive Script

**Datei:** `scripts/keepalive.js`
**Ausführen:** `npm run keepalive` oder `node scripts/keepalive.js`
**Tests:** `npm test`

## Exported Functions

### `loadConfig(configPath: string): Array`
Liest und parst `config/projects.json`. Wirft bei fehlender Datei (`ENOENT`) oder ungültigem JSON (`SyntaxError`).

### `pingProject(project: object): Promise<object>`
Sendet HTTP GET auf `project.url` mit optionalen `project.headers`. Timeout: 10 Sekunden (`PING_TIMEOUT_MS`).

Rückgabe bei Erfolg:
```json
{
  "name": "Projektname",
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

### `writeStatus(statusData: object, outputPath: string): void`
Schreibt `statusData` als formatiertes JSON. Erstellt fehlendes Verzeichnis automatisch.

## Verhalten

- Pingt Projekte sequenziell (kein paralleles Pingen, einfacheres Logging)
- Exit Code 0: alle Projekte erreichbar
- Exit Code 1: mindestens ein Projekt fehlgeschlagen oder Konfigurationsfehler

## Konfiguration

Liest `config/projects.json` relativ zum Projektroot. Pfad ist nicht per CLI-Argument überschreibbar (bei Bedarf in Phase 2 ergänzen).
