# Kratos' Watchlist 🎬

Cloudflare Pages + D1 App – Filme vormerken, per TMDb anreichern (Poster,
Genre, Streaming-Verfügbarkeit AT), bewerten, Ranking, Rewatch, Teilen.
Migriert von Google Apps Script/Sheets, gleiche Architektur wie
Kratos' GymTracker und Facility Management GW5.

## Voraussetzungen

Es gibt zwei Wege, die App zu deployen — beide führen zum selben Ergebnis,
du kannst jederzeit zwischen ihnen wechseln (z. B. jetzt Browser, später
Claude Code am Terminal):

- **A) Nur Browser** (siehe Abschnitt "Browser-Weg" weiter unten) — kein
  Terminal, kein wrangler nötig
- **B) Terminal/wrangler** (Schritte 1–6 unten) — z. B. mit Claude Code

Außerdem brauchst du einen kostenlosen TMDb-API-Key:
https://www.themoviedb.org/settings/api → "API Key (v3 auth)"

---

## Terminal-Weg (wrangler / Claude Code)

### 1 — Abhängigkeiten installieren
```bash
npm install
```

### 2 — Bei Cloudflare einloggen
```bash
npx wrangler login
```

### 3 — D1-Datenbank anlegen
```bash
npx wrangler d1 create kratos-watchlist-db
```
Die Ausgabe enthält eine `database_id` — die trägst du in `wrangler.toml`
bei `database_id = "..."` ein.

### 4 — Schema anlegen
```bash
npx wrangler d1 execute kratos-watchlist-db --remote --file=./schema.sql
```

### 5 — TMDb-Key als Secret hinterlegen
```bash
npx wrangler pages secret put TMDB_API_KEY --project-name=kratos-watchlist
```
(Falls das Pages-Projekt noch nicht existiert, einmal `npm run deploy`
laufen lassen — das legt es automatisch an — und den Secret-Befehl danach
nochmal ausführen.)

### 6 — Deployen
```bash
npm run deploy
```
Danach die D1-Datenbank noch im Cloudflare-Dashboard unter
**Pages-Projekt → Settings → Functions → D1 database bindings** an die
Variable `DB` binden (einmalig nötig, das kann wrangler beim ersten
Deploy nicht automatisch).

Lokal testen (mit lokaler D1-Kopie):
```bash
npm run dev
```

---

## Browser-Weg (ohne Terminal)

### B1 — GitHub-Repo anlegen
1. Auf https://github.com einloggen (Account erstellen, falls noch keiner da)
2. Oben rechts **+ → New repository**
3. Name z. B. `kratos-watchlist`, **Public** auswählen (für spätere
   GitHub-Pages-Spielereien praktisch, ist hier aber nicht zwingend),
   **Create repository**
4. **Add file → Upload files** → alle Dateien/Ordner aus diesem Projekt
   reinziehen (inkl. `functions/`-Ordner mit Unterordnern) → **Commit changes**

### B2 — Cloudflare Pages verbinden
1. Cloudflare-Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. Das eben erstellte Repo auswählen
3. Build-Einstellungen: **Framework preset: None**, Build command leer
   lassen, Output-Verzeichnis: `/`
4. **Save and Deploy** — die App ist danach unter `*.pages.dev` erreichbar
   (die API-Calls schlagen noch fehl, bis D1 gebunden ist — siehe B3)

### B3 — D1-Datenbank & Schema (ohne Terminal)
1. Dashboard → **D1 → Create database** → Name z. B. `kratos-watchlist-db`
2. Im neuen Pages-Projekt → **Settings → Functions → D1 database bindings**
   → Variable name `DB`, Datenbank auswählen → **Save**
3. In der D1-Datenbank → Tab **Console** → Inhalt von `schema.sql` reinkopieren
   und ausführen

### B4 — TMDb-Key hinterlegen (ohne Terminal)
Pages-Projekt → **Settings → Environment variables → Add variable**
→ Name `TMDB_API_KEY`, Wert dein TMDb-Key, als **Secret** markieren → **Save**

Danach im Pages-Projekt auf **Deployments → letztes Deployment → Retry
deployment**, damit die neue Umgebungsvariable/Bindung aktiv wird.

---

## Alte Daten aus dem Google Sheet übernehmen

Die App startet mit einer leeren Datenbank. Falls du deine bisherigen
Filme (aus dem Google Sheet der Apps-Script-Version) übernehmen willst:
Sheet als CSV exportieren und Claude geben — daraus lassen sich passende
`INSERT INTO filme (...) VALUES (...)`-Statements generieren, die du dann
genau wie `schema.sql` in der D1-Konsole (oder per
`wrangler d1 execute ... --file=migration.sql`) ausführst.

## Projektstruktur

```
index.html              App-Oberfläche (ruft /api/... per fetch auf)
manifest.json            PWA-Manifest
sw.js                     Service Worker (cached nur die Oberfläche, keine API-Daten)
icon-*.png, apple-touch-icon.png, favicon-32.png
schema.sql                D1-Tabellendefinition
functions/api/
  _utils.js                Gemeinsame Helfer (TMDb-Anbindung, JSON-Responses)
  filme.js                 GET /api/filme, POST /api/filme
  filme/[id].js             PATCH/DELETE /api/filme/:id
  search.js                 GET /api/search?q=... (Live-Suchvorschläge)
  sync.js                   POST /api/sync (Streaming-Abgleich, wird vom cron-worker aufgerufen)
wrangler.toml              Wrangler-Konfiguration (D1-Binding für lokale Dev/CLI-Deploys)
cron-worker/                Separater Cloudflare Worker mit täglichem Cron Trigger
```

## Streaming-Verfügbarkeit (automatischer Abgleich)

Damit vorgemerkte Filme automatisch als "✨ Neu verfügbar" markiert werden,
sobald sie in Österreich neu bei einem Streaming-Dienst auftauchen, ruft
ein separater kleiner Worker (`cron-worker/`) einmal täglich
`POST /api/sync` auf. Cron Triggers hängen bei Cloudflare direkt an
Workers, nicht an Pages-Projekten — daher der eigene, minimale Worker.

Einmalig deployen:
```bash
cd cron-worker
npx wrangler deploy
```

Manuell testen (ruft denselben Endpunkt auf wie der Cron):
```bash
curl -X POST https://kratos-watchlist.pages.dev/api/sync
```
