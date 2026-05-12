# Konfiguration

## `config/projects.json`

Diese Datei ist **nicht im Repo** (steht in `.gitignore`). Lokal aus `config/projects.example.json` kopieren und befüllen.

### Schema

```json
[
  {
    "name": "string — Pflichtfeld, Anzeigename im Dashboard",
    "url": "string — Pflichtfeld, vollständige URL des Endpunkts",
    "headers": {
      "optionaler-header": "wert"
    }
  }
]
```

`headers` ist optional. Ohne `headers` wird ein einfaches GET ohne Auth-Header gesendet.

### Supabase-Konfiguration

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

- Nur `anon`-Keys verwenden (eingeschränkte Rechte)
- **Niemals** `service_role`-Keys — diese haben vollen Datenbankzugriff
- `config/projects.json` niemals committen
