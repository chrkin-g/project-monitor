# Projekt Monitor

Generischer HTTP-Projekt-Monitor mit Keep-Alive für Supabase Free-Plan und Status-Dashboard via GitHub Pages.

## Was macht das Tool?

- Pingt alle konfigurierten Endpunkte alle 3 Tage per GitHub Actions
- Verhindert damit das Pausieren von Supabase Free-Plan-Projekten
- Zeigt Status, Antwortzeit und HTTP-Code auf einer öffentlichen Dashboard-Seite

---

## Einrichtung (Schritt für Schritt)

### 1. Repository einrichten

Forke oder klone dieses Repo auf GitHub und checke es lokal aus:

    git clone https://github.com/DEIN-USERNAME/project-monitor.git
    cd project-monitor

### 2. Lokale `projects.json` anlegen (zum Testen)

**Wo findest du URL und anon Key in Supabase?**
1. Öffne [supabase.com](https://supabase.com) → Dein Projekt → **Settings** → **API**
2. Kopiere **Project URL** → das ist deine `url` (hänge `/rest/v1/` an)
3. Kopiere **anon public** Key → das ist dein `apikey`

    cp config/projects.example.json config/projects.json

Öffne `config/projects.json` und befülle die Werte. Beispiel:

    [
      {
        "name": "Mein Supabase Projekt",
        "url": "https://abcdefghij.supabase.co/rest/v1/",
        "headers": {
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
      }
    ]

> **Sicherheit:** Nur `anon`-Keys verwenden — niemals `service_role`-Keys.
> Die Datei `config/projects.json` ist in `.gitignore` und wird **niemals committet**.

Lokaler Test:

    node scripts/keepalive.js

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
5. Nach ca. 2 Minuten ist das Dashboard unter `https://DEIN-USERNAME.github.io/project-monitor` erreichbar

### 5. Neue Projekte hinzufügen

Eintrag in `config/projects.json` (lokal) ergänzen:

    {
      "name": "Neues Projekt",
      "url": "https://neues-projekt.supabase.co/rest/v1/",
      "headers": {
        "apikey": "ANON_KEY"
      }
    }

Dann das GitHub Secret `PROJECTS_CONFIG` mit dem neuen vollständigen JSON-Inhalt aktualisieren.

Für Endpunkte ohne Auth reicht:

    {
      "name": "Meine Website",
      "url": "https://meinedomain.de/health"
    }

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