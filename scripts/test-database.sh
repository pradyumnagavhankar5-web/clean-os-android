#!/usr/bin/env bash
# Run real PostgreSQL tests in an isolated, disposable local container.
set -Eeuo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
container_name="cleanos-sql-test-${RANDOM}-${RANDOM}"
result_dir="$(mktemp -d "${TMPDIR:-/tmp}/cleanos-sql-results.XXXXXX")"
docker_local() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
    docker --host=unix:///var/run/docker.sock "$@"
}
db() { docker_local exec -i "$container_name" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d cleanos_test "$@"; }
cleanup() {
  local result=$?
  trap - EXIT
  if [[ "${CLEANOS_TEST_KEEP_CONTAINER:-0}" == 1 ]]; then
    printf 'Retained test container: %s\n' "$container_name"
  else
    docker_local rm -f "$container_name" >/dev/null 2>&1 || true
  fi
  printf 'Database test logs: %s\n' "$result_dir"
  exit "$result"
}
trap cleanup EXIT

docker_local info >/dev/null
docker_local run --detach --name "$container_name" \
  --env POSTGRES_DB=cleanos_test --env POSTGRES_PASSWORD=cleanos-local-test-only \
  postgres:17 >/dev/null
for attempt in {1..30}; do
  if docker_local exec "$container_name" pg_isready -U postgres -d cleanos_test >/dev/null 2>&1; then break; fi
  if (( attempt == 30 )); then docker_local logs "$container_name"; exit 1; fi
  sleep 1
done

db < "$repo_root/supabase/tests/bootstrap.sql" > "$result_dir/bootstrap.log" 2>&1
for migration in "$repo_root"/supabase/migrations/*.sql; do
  if ! db < "$migration" >> "$result_dir/migration.log" 2>&1; then
    cat "$result_dir/migration.log" >&2
    exit 1
  fi
done
if ! db < "$repo_root/supabase/tests/shared-workspaces.sql" > "$result_dir/functional.log" 2>&1; then
  tail -80 "$result_dir/functional.log" >&2
  exit 1
fi
awk '/PASS:/{ print }' "$result_dir/functional.log"
org_a="$(db -Atc "SELECT value FROM test.context WHERE key='org_a'")"

run_race() {
  local case_name="$1" product_id="$2" request_a="$3" request_b="$4" expect_both="$5"
  local status_a status_b
  cat > "$result_dir/$case_name-a.sql" <<SQL
BEGIN;
SET LOCAL lock_timeout = '8s';
SET ROLE authenticated;
SELECT test.actor('00000000-0000-4000-8000-000000000001');
SELECT public.cleanos_record_stock('$org_a','main','$product_id','out',6,'Concurrent issue','$request_a');
SELECT pg_sleep(1);
COMMIT;
SQL
  cat > "$result_dir/$case_name-b.sql" <<SQL
BEGIN;
SET LOCAL lock_timeout = '8s';
SET ROLE authenticated;
SELECT test.actor('00000000-0000-4000-8000-000000000001');
SELECT public.cleanos_record_stock('$org_a','main','$product_id','out',6,'Concurrent issue','$request_b');
COMMIT;
SQL
  db < "$result_dir/$case_name-a.sql" > "$result_dir/$case_name-a.log" 2>&1 &
  local first_pid=$!
  sleep 0.15
  db < "$result_dir/$case_name-b.sql" > "$result_dir/$case_name-b.log" 2>&1 &
  local second_pid=$!
  set +e
  wait "$first_pid"; status_a=$?
  wait "$second_pid"; status_b=$?
  set -e
  if [[ "$expect_both" == yes ]]; then
    if (( status_a != 0 || status_b != 0 )); then cat "$result_dir/$case_name-"*.log >&2; exit 1; fi
  else
    if ! (( (status_a == 0 && status_b != 0) || (status_a != 0 && status_b == 0) )); then
      cat "$result_dir/$case_name-"*.log >&2; exit 1
    fi
    if ! grep -Eiq 'stock|available|quantity|exceed|insufficient' "$result_dir/$case_name-"*.log; then
      cat "$result_dir/$case_name-"*.log >&2; exit 1
    fi
  fi
}
run_race stock-overdraft race-product race-issue-a race-issue-b no
run_race stock-idempotency replay-product replay-same-request replay-same-request yes

db -v org_a="$org_a" < "$repo_root/supabase/tests/concurrency-assertions.sql" \
  > "$result_dir/concurrency-assertions.log" 2>&1
awk '/PASS:/{ print }' "$result_dir/concurrency-assertions.log"

# Two active admins try to disable one another from separate transactions.
for side in a b; do
  if [[ "$side" == a ]]; then
    actor=00000000-0000-4000-8000-000000000001
    target=00000000-0000-4000-8000-000000000005
    wait_sql='SELECT pg_sleep(1);'
  else
    actor=00000000-0000-4000-8000-000000000005
    target=00000000-0000-4000-8000-000000000001
    wait_sql=''
  fi
  cat > "$result_dir/admin-$side.sql" <<SQL
BEGIN;
SET LOCAL lock_timeout = '8s';
SET ROLE authenticated;
SELECT test.actor('$actor');
SELECT public.cleanos_update_member('$org_a','$target','Admin', 'admin',false,
  (SELECT revision FROM public.cleanos_members WHERE org_id='$org_a' AND user_id='$target'));
$wait_sql
COMMIT;
SQL
done
db < "$result_dir/admin-a.sql" > "$result_dir/admin-a.log" 2>&1 &
first_admin_pid=$!
sleep 0.15
db < "$result_dir/admin-b.sql" > "$result_dir/admin-b.log" 2>&1 &
second_admin_pid=$!
set +e
wait "$first_admin_pid"; first_admin_status=$?
wait "$second_admin_pid"; second_admin_status=$?
set -e
if ! (( (first_admin_status == 0 && second_admin_status != 0) || (first_admin_status != 0 && second_admin_status == 0) )); then
  cat "$result_dir/admin-"*.log >&2; exit 1
fi
if ! grep -Eiq 'admin|active|member|access|permission|denied' "$result_dir/admin-"*.log; then
  cat "$result_dir/admin-"*.log >&2; exit 1
fi
db -v org_a="$org_a" <<'SQL'
SELECT test.assert_true((SELECT count(*)=1 FROM public.cleanos_members
  WHERE org_id=:'org_a' AND role='admin' AND active),'concurrent admin revocation preserves an active admin');
SELECT 'Database integration assertions passed: ' || count(*) FROM test.results;
SQL
