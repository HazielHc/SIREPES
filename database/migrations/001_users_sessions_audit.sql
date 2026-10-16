CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('administrador', 'capturista', 'personal_seder', 'invitado')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  password_hash text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT false,
  password_changed_at timestamptz,
  last_login_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_username_normalized CHECK (username = lower(btrim(username)) AND username <> ''),
  CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email)) AND email <> ''),
  CONSTRAINT users_full_name_nonempty CHECK (btrim(full_name) <> ''),
  CONSTRAINT users_password_hash_nonempty CHECK (btrim(password_hash) <> '')
);

CREATE INDEX users_role_status_idx ON users (role, status);
CREATE INDEX users_created_at_idx ON users (created_at DESC);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT auth_sessions_token_hash_nonempty CHECK (btrim(token_hash) <> ''),
  CONSTRAINT auth_sessions_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX auth_sessions_user_expiry_idx ON auth_sessions (user_id, expires_at);
CREATE INDEX auth_sessions_active_expiry_idx ON auth_sessions (expires_at) WHERE revoked_at IS NULL;

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  result text NOT NULL CHECK (result IN ('success', 'failure', 'denied')),
  module text,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_events_action_nonempty CHECK (btrim(action) <> ''),
  CONSTRAINT audit_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT audit_events_metadata_size CHECK (octet_length(metadata::text) <= 8192)
);

CREATE INDEX audit_events_actor_created_idx ON audit_events (actor_user_id, created_at DESC);
CREATE INDEX audit_events_target_created_idx ON audit_events (target_type, target_id, created_at DESC);
CREATE INDEX audit_events_action_created_idx ON audit_events (action, created_at DESC);

CREATE FUNCTION prevent_audit_event_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
