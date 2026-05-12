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
