-- Local test harness only. Supabase supplies these roles and auth functions in production.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  email_confirmed_at timestamptz
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO anon, authenticated, service_role;
INSERT INTO auth.users(id, email, email_confirmed_at) VALUES
('00000000-0000-4000-8000-000000000001','owner-a@cleanos.example',now()),
('00000000-0000-4000-8000-000000000002','staff-a@cleanos.example',now()),
('00000000-0000-4000-8000-000000000003','supervisor-a@cleanos.example',now()),
('00000000-0000-4000-8000-000000000004','owner-b@cleanos.example',now()),
('00000000-0000-4000-8000-000000000005','admin-two@cleanos.example',now()),
('00000000-0000-4000-8000-000000000006','unverified@cleanos.example',null),
('00000000-0000-4000-8000-000000000007','staff-two@cleanos.example',now()),
('00000000-0000-4000-8000-000000000008','revoked@cleanos.example',now()),
('00000000-0000-4000-8000-000000000009','expired@cleanos.example',now());

CREATE SCHEMA test;
CREATE TABLE test.results(label text NOT NULL);
CREATE TABLE test.context(key text PRIMARY KEY, value text NOT NULL);
GRANT USAGE ON SCHEMA test TO anon, authenticated;
GRANT INSERT ON test.results TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON test.context TO authenticated;
CREATE FUNCTION test.actor(p_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_id::text, false);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',p_id,'role','authenticated','email',
    CASE p_id::text
      WHEN '00000000-0000-4000-8000-000000000001' THEN 'owner-a@cleanos.example'
      WHEN '00000000-0000-4000-8000-000000000002' THEN 'staff-a@cleanos.example'
      WHEN '00000000-0000-4000-8000-000000000003' THEN 'supervisor-a@cleanos.example'
      WHEN '00000000-0000-4000-8000-000000000004' THEN 'owner-b@cleanos.example'
      WHEN '00000000-0000-4000-8000-000000000005' THEN 'admin-two@cleanos.example'
      WHEN '00000000-0000-4000-8000-000000000006' THEN 'unverified@cleanos.example'
      WHEN '00000000-0000-4000-8000-000000000007' THEN 'staff-two@cleanos.example'
      WHEN '00000000-0000-4000-8000-000000000008' THEN 'revoked@cleanos.example'
      WHEN '00000000-0000-4000-8000-000000000009' THEN 'expired@cleanos.example'
    END,'user_metadata',p_metadata)::text, false);
END $$;
CREATE FUNCTION test.assert_true(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',p_label; END IF;
  INSERT INTO test.results VALUES(p_label);
  RAISE NOTICE 'PASS: %',p_label;
END $$;
CREATE FUNCTION test.assert_raises(p_sql text,p_label text,p_pattern text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF p_pattern IS NOT NULL AND (SQLERRM || ' ' || SQLSTATE) !~* p_pattern THEN
      RAISE EXCEPTION 'FAIL: % (unexpected rejection: % [%])',p_label,SQLERRM,SQLSTATE;
    END IF;
    rejected := true;
  END;
  PERFORM test.assert_true(rejected,p_label);
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test TO anon,authenticated;
