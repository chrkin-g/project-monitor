# Status-Dashboard

**Datei:** `docs/index.html`
**URL:** `https://DEIN-USERNAME.github.io/project-monitor`

## Technik

- Statische HTML-Seite, kein Build-Step
- Tailwind CSS via CDN
- Lädt `docs/status.json` per `fetch('./status.json?t=...')` (Cache-Busting)
- Kein Auto-Refresh — nur manuell per Button oder beim Seitenload

## Layout

- Dunkles Theme (Slate-Palette, Hintergrund `#0f172a`)
- Karten-Grid: 3 Spalten (Desktop ≥ lg), 2 Spalten (sm–md), 1 Spalte (Mobil)
- Kompakte Karten: Name, Status-Badge (ONLINE/FEHLER), Antwortzeit, HTTP-Code, Prüf-Zeitstempel
- Gesamtzähler oben rechts (X / Y Datenbanken online)
- Gelbe Farbe wenn teilweise online, Grün wenn alle online, Rot wenn alle offline

## Lokales Testen

```bash
cd docs && python3 -m http.server 8080
# → http://localhost:8080
```

## `status.json` Format

Siehe [konfiguration.md](konfiguration.md) für das vollständige Schema.
