# Backlog — Erledigte Aufgaben

Abgeschlossene Tickets.

---

## MVP

- [x] **MVP-001** Projekt-Grundgerüst einrichten (.gitignore, package.json, Beispielkonfig)
- [x] **MVP-002** keepalive.js mit Unit-Tests implementieren (TDD, node:test)
- [x] **MVP-003** GitHub Actions Workflow mit Cron und Secret-Handling
- [x] **MVP-004** Status-Dashboard (docs/index.html) mit Karten-Grid und Auto-Refresh
- [x] **MVP-005** Vollständige Dokumentation (CLAUDE.md, README.md, markdowns/)

## Phase 1 — Erweiterungen

- [x] **P1-001** Frontend-Links in Dashboard-Karten (`frontendUrl` in projects.json)
- [x] **P1-002** Dashboard in DB-Status und Website-Status aufgeteilt (zwei Sektionen)
- [x] **P1-003** Website-Status direkt im Browser live prüfen (parallele fetch-Checks)
- [x] **P1-004** Manueller Refresh-Button für Website-Status (statt 60s-Countdown)
- [x] **P1-005** Nächster Ping-Zeitpunkt im Footer anzeigen
- [x] **P1-006** Ping-Timeout von 10s auf 30s erhöht (stabilere Checks bei langsamen Hosts)
- [x] **P1-007** Bild-Fallback für Browser-Checks bei blockierten fetch-Requests
- [x] **P1-008** „NICHT PRÜFBAR" statt „FEHLER" wenn Browser-Sicherheit den Check blockiert
- [x] **P1-009** Node.js auf Version 24 aktualisiert (GitHub Actions)
