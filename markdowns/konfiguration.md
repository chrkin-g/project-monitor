# Konfiguration

## `config/projects.json`

Diese Datei ist **nicht im Repo** (steht in `.gitignore`). Lokal aus `config/projects.example.json` kopieren und befüllen.

### Schema

```json
[
  {
    "name": "string — Pflichtfeld, Anzeigename im Dashboard",
    "url": "string — Pflichtfeld, vollständige URL des Endpunkts (wird gepingt)",
    "headers": {
      "optionaler-header": "wert"
    },
    "frontendUrl": "string — optional, Frontend-URL für Website-Status-Karte im Dashboard"
  }
]
```

- `headers` ist optional. Ohne `headers` wird ein einfaches GET ohne Auth-Header gesendet.
- `frontendUrl` ist optional. Wenn gesetzt, erscheint das Projekt im **Website-Status**-Bereich des Dashboards und wird direkt im Browser live geprüft.

### Supabase-Konfiguration (Datenbank-Ping)

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

### Website-Konfiguration (Frontend-Check)

```json
{
  "name": "Meine Website",
  "url": "https://meine-website.de",
  "frontendUrl": "https://meine-website.de"
}
```

Wenn `url` und `frontendUrl` identisch sind (z.B. bei reinen Websites ohne separaten DB-Endpunkt), wird der Eintrag trotzdem korrekt verarbeitet. Das Dashboard zeigt dann nur eine Website-Karte, keine separate DB-Karte.

## `config/neon-projects.json`

Diese Datei ist **nicht im Repo** (steht in `.gitignore`). Lokal aus `config/neon-projects.example.json` kopieren und befüllen.

Wird in GitHub Actions aus dem Secret **`NEON_PROJECTS_CONFIG`** geschrieben. Ist das Secret nicht gesetzt, werden keine Neon-Datenbanken geprüft — der Rest läuft normal weiter.

### Neon-Schema

```json
[
  {
    "name": "string — Pflichtfeld, Anzeigename im Dashboard",
    "connectionString": "string — Pflichtfeld, PostgreSQL Connection String"
  }
]
```

### Neon-Beispiel

```json
{
  "name": "Mein Projekt DB",
  "connectionString": "postgresql://user:password@ep-xyz.eu-central-1.aws.neon.tech/dbname?sslmode=require"
}
```

Den Connection String findest du in Neon unter **Dashboard → Connection Details → Connection string**.

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
      "error": "string — nur bei status: error",
      "frontendUrl": "string — optional, nur wenn in projects.json gesetzt"
    }
  ]
}
```

### Website-Status im Dashboard

Projekte mit `frontendUrl` werden im Dashboard direkt im Browser geprüft (kein GitHub Actions nötig). Mögliche Zustände:

| Status | Bedeutung |
|---|---|
| `ok` | Website erreichbar, Antwortzeit in ms |
| `error` | Website nicht erreichbar |
| `NICHT PRÜFBAR` | Browser-Sicherheitsrichtlinie (CORS/mixed content) verhindert den Check — manuell über den Link prüfen |

## Sicherheit

- Nur `anon`-Keys verwenden (eingeschränkte Rechte)
- **Niemals** `service_role`-Keys — diese haben vollen Datenbankzugriff
- `config/projects.json` niemals committen
