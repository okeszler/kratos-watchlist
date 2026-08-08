-- Kratos' Watchlist – D1-Schema
-- Ausführen z. B. über Cloudflare Dashboard: D1 -> Datenbank -> Console -> Query einfügen

CREATE TABLE IF NOT EXISTS filme (
  id TEXT PRIMARY KEY,
  titel TEXT NOT NULL,
  jahr TEXT,
  notiz TEXT,
  prioritaet TEXT DEFAULT 'Normal',
  status TEXT DEFAULT 'offen',
  hinzugefuegt TEXT,
  gesehen_am TEXT,
  bewertung INTEGER,
  poster TEXT,
  tmdb_rating REAL,
  genres TEXT,
  laufzeit INTEGER,
  beschreibung TEXT,
  streaming TEXT,
  rewatch INTEGER DEFAULT 0,
  tmdb_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_filme_status ON filme(status);
