CREATE TABLE IF NOT EXISTS prep_history (
  list_id TEXT NOT NULL,
  list_date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('prep', 'order')),
  subject_key TEXT NOT NULL,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  added_at INTEGER NOT NULL,
  done_at INTEGER,
  revision INTEGER NOT NULL,
  PRIMARY KEY (list_id, kind, subject_key)
);

CREATE INDEX IF NOT EXISTS prep_history_subject ON prep_history(kind, subject_key, list_date);
