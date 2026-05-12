# GitHub Actions Workflow

**Datei:** `.github/workflows/keepalive.yml`

## Trigger

- **Cron:** `0 9 */3 * *` — 09:00 UTC an Tag 1, 4, 7, 10, ...
- **Manuell:** `workflow_dispatch` — über GitHub Actions UI auslösbar

## Ablauf

1. Repository auschecken (mit `GITHUB_TOKEN`)
2. Node.js 18 einrichten
3. `config/projects.json` aus Secret `PROJECTS_CONFIG` erstellen
4. `node scripts/keepalive.js` ausführen
5. Git-Benutzer konfigurieren
6. `docs/status.json` committen mit `[skip ci]` — nur wenn Änderungen vorhanden
7. Pushen

## Secret einrichten

Secret `PROJECTS_CONFIG` muss den kompletten JSON-Inhalt der Projektkonfiguration enthalten.
Siehe README.md Abschnitt 3 für die Schritt-für-Schritt-Anleitung.

## Permissions

`contents: write` — nötig um `status.json` zurück ins Repo committen zu können.

## Warum `[skip ci]`?

Ohne diesen Tag würde jeder automatische Commit einen neuen Workflow-Run triggern (Endlosschleife).
