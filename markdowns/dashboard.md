# Status-Dashboard

**Datei:** `docs/index.html`
**URL:** `https://DEIN-USERNAME.github.io/project-monitor`

## Technik

- Statische HTML-Seite, kein Build-Step
- Tailwind CSS via CDN
- Lädt `docs/status.json` per `fetch('./status.json?t=...')` (Cache-Busting)
- Auto-Refresh alle 60 Sekunden

## Layout

- Dunkles Theme (Slate-Palette, Hintergrund `#0f172a`)
- Karten-Grid: 2 Spalten (Desktop), 1 Spalte (Mobil)
- Pro Karte: Name, Status-Badge (ONLINE/FEHLER), Antwortzeit, HTTP-Code, Prüf-Zeitstempel
- Gesamtzähler oben rechts (X / Y Projekte online)
- Gelbe Farbe wenn teilweise online, Grün wenn alle online, Rot wenn alle offline

## Lokales Testen

```bash
cd docs && python3 -m http.server 8080
# → http://localhost:8080
```

## `status.json` Format

Siehe [konfiguration.md](konfiguration.md) für das vollständige Schema.
