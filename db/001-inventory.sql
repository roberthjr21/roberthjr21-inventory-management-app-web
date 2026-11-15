CREATE TABLE IF NOT EXISTS inventory_state (
  id integer PRIMARY KEY CHECK (id = 1),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  checkpoint jsonb CHECK (jsonb_typeof(checkpoint) = 'object')
);

CREATE TABLE IF NOT EXISTS inventory_sessions (
  token_hash text PRIMARY KEY,
  credential_tag text NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS inventory_sessions_expires_at_idx ON inventory_sessions (expires_at);

CREATE TABLE IF NOT EXISTS inventory_login_limit (
  id integer PRIMARY KEY CHECK (id = 1),
  attempts integer NOT NULL CHECK (attempts > 0),
  expires_at timestamptz NOT NULL
);
