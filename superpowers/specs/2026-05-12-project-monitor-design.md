# Design-Dokument: Projekt Monitor MVP

**Datum:** 2026-05-12  
**Status:** Freigegeben  
**Scope:** MVP — Keep-Alive + Status-Dashboard

---

## 1. Zielsetzung

Ein generischer HTTP-Projekt-Monitor mit zwei Kernaufgaben:

1. **Keep-Alive:** Beliebige HTTP-Endpunkte (primär Supabase Free-Plan-Projekte) regelmäßig anpingen, damit sie nicht nach 7 Tagen Inaktivität pausiert werden.
2. **Status-Dashboard:** Statische GitHub-Pages-Seite, die den letzten Ping-Status aller Projekte anzeigt.

Das Tool ist bewusst schlank gehalten und auf Erweiterbarkeit ausgelegt (Phase 2: Historien-Tracking, Benachrichtigungen etc.).

---

## 2. Architektur & Datenfluss

```
GitHub Actions (Cron alle 3 Tage, 09:00 UTC + manueller Dispatch)
        │
        ▼
  Secret PROJECTS_CONFIG → config/projects.json (temporär, nicht committet)
        │
        ▼
  scripts/keepalive.js
  ├── liest config/projects.json
  ├── HTTP GET auf jede URL mit optionalen Custom-Headers
  ├── misst Antwortzeit (performance.now)
  └── schreibt docs/status.json
        │
        ├── Exit Code 0: alle Projekte erreichbar
        └── Exit Code 1: mindestens ein Projekt fehlgeschlagen
        │
        ▼
  git commit "chore: update status.json [skip ci]"
  git push → main
        │
        ▼
  GitHub Pages (aus /docs)
        │
        ▼
  docs/index.html
  ├── fetch("./status.json") beim Laden
  └── Auto-Refresh alle 60 Sekunden
```

**Warum `[skip ci]` im Commit:** Verhindert, dass der automatische Status-Commit einen neuen Workflow-Run triggert (Endlosschleife).

---

## 3. Konfigurationsformat

### `config/projects.json` (lokal, nie committen)
```json
[
  {
    "name": "InnoMee Production",
    "url": "https://xxxxx.supabase.co/rest/v1/",
    "headers": {
      "apikey": "DEIN_ANON_KEY"
    }
  },
  {
    "name": "Meine Website",
    "url": "https://meinedomain.de/health"
  },
  {
    "name": "Bubensause API",
    "url": "https://api.bubensause.de",
    "headers": {
      "Authorization": "Bearer TOKEN"
    }
  }
]
```

`headers` ist optional. Ohne `headers` wird ein einfaches GET ohne Auth-Header gesendet.

### `config/projects.example.json` (im Repo, als Vorlage)
```json
[
  {
    "name": "Mein Projekt",
    "url": "https://xxxxx.supabase.co/rest/v1/",
    "headers": {
      "apikey": "REPLACE_WITH_ANON_KEY"
    }
  }
]
```

---

## 4. `docs/status.json` Schema

```json
{
  "lastRun": "2026-05-12T09:00:00.000Z",
  "projects": [
    {
      "name": "InnoMee Production",
      "status": "ok",
      "httpStatus": 200,
      "responseTime": 142,
      "lastChecked": "2026-05-12T09:00:01.234Z"
    },
    {
      "name": "Test-Datenbank",
      "status": "error",
      "httpStatus": 503,
      "responseTime": null,
      "lastChecked": "2026-05-12T09:00:03.456Z",
      "error": "HTTP 503 Service Unavailable"
    }
  ]
}
```

`responseTime` ist `null` bei Fehler. `error` ist nur bei `status: "error"` vorhanden.

---

## 5. Komponenten

### `scripts/keepalive.js`
- Läuft mit Node.js 18+ (natives `fetch`, keine externen Abhängigkeiten)
- Liest `config/projects.json` relativ zum Script-Verzeichnis
- Pingt alle Projekte sequenziell (einfacher, kein Race-Condition-Risiko)
- Schreibt `docs/status.json`
- Loggt jeden Ping-Versuch auf stdout (für GitHub Actions Logs)
- Exit Code 1 wenn mindestens ein Projekt `status: "error"` hat

### `.github/workflows/keepalive.yml`
- **Trigger:** `schedule: '0 9 */3 * *'` + `workflow_dispatch`
- **Steps:**
  1. Checkout (mit `token: ${{ secrets.GITHUB_TOKEN }}`)
  2. Node.js 18 setup
  3. `echo $PROJECTS_CONFIG > config/projects.json` aus Secret
  4. `node scripts/keepalive.js`
  5. Commit + Push `docs/status.json` mit `[skip ci]`
- Workflow-Permissions: `contents: write` (für den Commit)

### `docs/index.html`
- Tailwind CSS via CDN (kein Build-Step nötig)
- Dunkles Theme (Slate-Palette: `#0f172a` Hintergrund)
- **Layout:** Karten-Grid (2 Spalten Desktop, 1 Spalte Mobil)
- **Kopfzeile:** Titel "Projekt Monitor", Gesamtzähler (X von Y online), letzter Run-Zeitstempel
- **Karte pro Projekt:** Name, Status-Badge (ONLINE/FEHLER), Antwortzeit, HTTP-Code, Prüf-Zeitstempel
- **Farben:** Grün (`#22c55e`) für online, Rot (`#ef4444`) für Fehler
- Auto-Refresh via `setTimeout(() => location.reload(), 60000)`
- Lädt Status-JSON: `fetch('./status.json')` — funktioniert sowohl lokal als auch auf GitHub Pages

---

## 6. Dateistruktur

```
project-monitor/
├── .github/
│   └── workflows/
│       └── keepalive.yml
├── .gitignore
├── config/
│   └── projects.example.json
├── docs/
│   ├── index.html
│   ├── status.json              ← Initialwert: leeres Schema
│   └── superpowers/
│       └── specs/               ← Brainstorming-Specs (dieses Dokument)
├── markdowns/
│   ├── keepalive-script.md
│   ├── github-actions.md
│   ├── dashboard.md
│   ├── konfiguration.md
│   ├── backlog.md
│   └── backlog_erledigt.md
├── scripts/
│   └── keepalive.js
├── CLAUDE.md
├── README.md
└── package.json
```

---

## 7. Sicherheit

- `config/projects.json` steht in `.gitignore` — wird nie committet
- Nur `anonKey` / öffentliche Bearer-Tokens verwenden — **niemals** `service_role`-Keys
- GitHub Secret `PROJECTS_CONFIG` enthält den vollständigen JSON-Inhalt der Konfiguration
- Das Script validiert beim Start, dass `config/projects.json` vorhanden und valides JSON ist

---

## 8. Dokumentation

### CLAUDE.md (Projektwurzel)
Enthält:
- Kurzen Projektüberblick
- Architekturdiagramm (Textform)
- Verweise auf alle Module in `markdowns/`
- **Arbeitsregel:** Bei Änderungen an einem Modul → zugehörige `.md` in `markdowns/` aktualisieren. Bei neuen Modulen oder größeren Features → neue `.md` anlegen und in CLAUDE.md verlinken.

### `markdowns/` Dateien
| Datei | Inhalt |
|---|---|
| `keepalive-script.md` | Script-Logik, Konfigurationsformat, Fehlerbehandlung |
| `github-actions.md` | Workflow-Setup, Secrets, Cron-Syntax, Permissions |
| `dashboard.md` | Dashboard-Aufbau, status.json-Format, Auto-Refresh |
| `konfiguration.md` | projects.json-Format, Supabase-spezifische Hinweise, Sicherheit |
| `backlog.md` | Offene Aufgaben/Tickets |
| `backlog_erledigt.md` | Abgeschlossene Aufgaben/Tickets |

---

## 9. Phase 2 — mögliche Erweiterungen (nicht im MVP)

- Historien-Tracking: Status-History in `docs/history.json` (letzte N Runs)
- E-Mail / Slack-Benachrichtigungen bei Fehler (via GitHub Actions + Secret)
- Response-Time-Verlauf als Sparkline im Dashboard
- Kategorien/Tags für Projekte (z.B. "Supabase", "API", "Frontend")
- Eigene Check-Intervalle pro Projekt
