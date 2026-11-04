\set admin_a 00000000-0000-4000-8000-000000000001
\set staff_a 00000000-0000-4000-8000-000000000002
\set supervisor_a 00000000-0000-4000-8000-000000000003
\set admin_b 00000000-0000-4000-8000-000000000004
\set admin_two 00000000-0000-4000-8000-000000000005
\set unverified 00000000-0000-4000-8000-000000000006
\set staff_two 00000000-0000-4000-8000-000000000007
\set revoked_user 00000000-0000-4000-8000-000000000008
\set expired_user 00000000-0000-4000-8000-000000000009

SET ROLE anon;
SELECT test.assert_true(public.cleanos_schema_version()=2,'anonymous may inspect only the schema version');
SELECT test.assert_raises('SELECT public.cleanos_workspace(''10000000-0000-4000-8000-000000000001'')',
  'anonymous cannot load workspace data','permission|auth|access|member|sign');
SELECT test.assert_raises('SELECT * FROM public.cleanos_members',
  'anonymous cannot read memberships','permission|privilege|denied');
RESET ROLE;

SET ROLE authenticated;
SELECT test.actor(:'unverified');
SELECT test.assert_raises('SELECT public.cleanos_create_workspace(''Unverified org'',''Person'')',
  'unverified email cannot create a workspace','verif|confirm|email');
SELECT test.actor(:'admin_a');
SELECT public.cleanos_create_workspace('Aura Test A','Owner A','shared') AS org_a \gset
INSERT INTO test.context VALUES('org_a',:'org_a');
SELECT test.assert_true(public.cleanos_workspace(:'org_a')#>>'{workspace,role}'='admin',
  'workspace owner receives server-derived admin membership');
SELECT test.assert_true(public.cleanos_workspace(:'org_a')#>>'{state,session,staffId}'=:'admin_a',
  'snapshot session is bound to the authenticated user');
SELECT test.assert_true(jsonb_array_length(public.cleanos_workspace(:'org_a')#>'{state,tasks}')=0,
  'real workspace starts empty instead of seeding demo tasks');
SELECT public.cleanos_create_invite(:'org_a','staff-a@cleanos.example','staff') AS staff_code \gset
SELECT test.assert_true((SELECT token_hash<>:'staff_code' AND length(token_hash)>=64 FROM public.cleanos_invites WHERE org_id=:'org_a' AND email='staff-a@cleanos.example'),
  'invitation stores a hash instead of the raw join code');
SELECT public.cleanos_create_invite(:'org_a','supervisor-a@cleanos.example','supervisor') AS supervisor_code \gset
SELECT public.cleanos_create_invite(:'org_a','admin-two@cleanos.example','admin') AS second_admin_code \gset
SELECT public.cleanos_create_invite(:'org_a','staff-two@cleanos.example','staff') AS other_staff_code \gset

SELECT test.actor(:'admin_b');
SELECT public.cleanos_create_workspace('Other Organisation','Owner B','shared') AS org_b \gset
INSERT INTO test.context VALUES('org_b',:'org_b');
SELECT test.assert_raises(format('SELECT public.cleanos_join_workspace(%L,%L)',:'staff_code','Intruder'),
  'invite is bound to its intended verified email','email|invite|match|invalid');
SELECT test.assert_raises(format('SELECT public.cleanos_workspace(%L)',:'org_a'),
  'another organisation cannot call the workspace RPC','member|access|permission|authoriz');
SELECT test.assert_true((SELECT count(*)=0 FROM public.cleanos_members WHERE org_id=:'org_a'),
  'membership RLS hides another organisation');
SELECT test.assert_raises(format('SELECT public.cleanos_update_member(%L,%L,%L,%L,false,1)',
  :'org_b',:'admin_b','Owner B','admin'),'last active admin cannot be deactivated','admin');
SELECT test.assert_raises(format('SELECT public.cleanos_update_member(%L,%L,%L,%L,true,1)',
  :'org_b',:'admin_b','Owner B','staff'),'last active admin cannot be demoted','admin');
SELECT public.cleanos_save_facility(:'org_b',
  '{"id":"facility-b","name":"Other building","type":"Office","address":"Mumbai","areas":[{"id":"area-b","name":"Lobby"}]}',null,false);
SELECT public.cleanos_save_product(:'org_b',
  '{"id":"product-b","name":"Other cleaner","category":"Cleaning","unit":"litres","unitPrice":100,"threshold":1}',null,'main',0);

SELECT test.actor(:'staff_a');
SELECT public.cleanos_join_workspace(:'staff_code','Cleaner A');
SELECT test.assert_true(public.cleanos_workspace(:'org_a')#>>'{workspace,role}'='staff',
  'invite creates exactly the role assigned by the admin');
SELECT test.actor(:'supervisor_a');
SELECT public.cleanos_join_workspace(:'supervisor_code','Supervisor A');
SELECT test.actor(:'admin_two');
SELECT public.cleanos_join_workspace(:'second_admin_code','Admin Two');
SELECT test.actor(:'staff_two');
SELECT public.cleanos_join_workspace(:'other_staff_code','Cleaner Two');

SELECT test.actor(:'admin_a');
SELECT public.cleanos_save_facility(:'org_a',
  '{"id":"facility-a","name":"Aura Business Centre","type":"Office","address":"Pune","areas":[{"id":"lobby","name":"Lobby"},{"id":"washroom","name":"Washroom"}]}',null,false);
SELECT public.cleanos_save_product(:'org_a',
  '{"id":"tissues","name":"Tissue rolls","category":"Paper","unit":"rolls","unitPrice":110,"threshold":3}',null,'main',10);
SELECT public.cleanos_save_product(:'org_a',
  '{"id":"race-product","name":"Race stock","category":"Test","unit":"units","unitPrice":1,"threshold":1}',null,'main',10);
SELECT public.cleanos_save_product(:'org_a',
  '{"id":"replay-product","name":"Replay stock","category":"Test","unit":"units","unitPrice":1,"threshold":1}',null,'main',10);
SELECT public.cleanos_save_task(:'org_a',jsonb_build_object(
  'id','task-own','title','Clean lobby','facilityId','facility-a','areaId','lobby','assigneeId',:'staff_a',
  'dueDate','2026-11-04','priority','high','status','pending','notes','Use labelled supplies',
  'checklist',jsonb_build_array(jsonb_build_object('id','step-one','label','Disinfect surfaces','done',false),
                               jsonb_build_object('id','step-two','label','Mop floor','done',false))),null);
SELECT public.cleanos_save_task(:'org_a',jsonb_build_object(
  'id','task-other','title','Clean washroom','facilityId','facility-a','areaId','washroom','assigneeId',:'staff_two',
  'dueDate','2026-11-04','priority','medium','status','pending','notes','',
  'checklist',jsonb_build_array(jsonb_build_object('id','other-step','label','Restock handwash','done',false))),null);
SELECT revision AS editor_revision FROM public.cleanos_tasks WHERE org_id=:'org_a' AND id='task-own' \gset
SELECT task AS editor_task FROM jsonb_array_elements(public.cleanos_workspace(:'org_a')#>'{state,tasks}') task
  WHERE task->>'id'='task-own' \gset
SELECT test.assert_true((SELECT quantity=10 FROM public.cleanos_balances WHERE org_id=:'org_a' AND product_id='tissues' AND location_id='main'),
  'opening stock is recorded in the balance');
SELECT test.assert_true((SELECT count(*)=1 FROM public.cleanos_stock_movements WHERE org_id=:'org_a' AND product_id='tissues'),
  'opening stock also creates an audit movement');

SELECT test.actor(:'staff_a','{"role":"admin","app_role":"admin"}');
SELECT test.assert_true(public.cleanos_workspace(:'org_a')#>>'{workspace,role}'='staff',
  'forged user metadata cannot change a member role');
SELECT test.assert_true(jsonb_array_length(public.cleanos_workspace(:'org_a')#>'{state,tasks}')=1,
  'staff snapshot contains only their assigned task');
SELECT test.assert_true((SELECT count(*)=0 FROM public.cleanos_invites WHERE org_id=:'org_a'),
  'staff cannot read invitation email addresses or token hashes');
SELECT test.assert_true((SELECT count(*)=1 FROM public.cleanos_tasks WHERE org_id=:'org_a'),
  'task RLS independently filters another staff assignment');
SELECT test.assert_raises(format('SELECT public.cleanos_record_stock(%L,%L,%L,%L,1,%L,%L)',
  :'org_a','main','tissues','out','Forged request','staff-stock'),
  'staff cannot issue stock even with forged role metadata','role|supervisor|admin|permission|access|allow|authoriz');
CREATE TEMP TABLE cleanos_members AS SELECT :'org_a'::uuid AS org_id, :'staff_a'::uuid AS user_id, 'admin'::text AS role, true AS active;
SET search_path=pg_temp,public;
SELECT test.assert_raises(format('SELECT public.cleanos_record_stock(%L,%L,%L,%L,1,%L,%L)',
  :'org_a','main','tissues','out','Shadowed role','staff-shadow'),
  'temporary search-path objects cannot forge administrator access','role|supervisor|admin|permission|access|allow|authoriz');
RESET search_path;
DROP TABLE pg_temp.cleanos_members;
SELECT test.assert_raises(format('SELECT public.cleanos_save_task(%L,%L::jsonb,%s)',
  :'org_a',:'editor_task',:'editor_revision'),'staff cannot edit or reassign task fields','role|supervisor|admin|permission|access|allow|authoriz');
SELECT test.assert_raises(format('SELECT public.cleanos_set_checklist_done(%L,%L,%L,true,1)',
  :'org_a','task-other','other-step'),'staff cannot change another person''s checklist','assign|access|permission|allow|authoriz|task');
SELECT test.assert_raises(format('SELECT public.cleanos_create_invite(%L,%L,%L)',
  :'org_a','intruder@cleanos.example','admin'),'staff cannot invite or promote administrators','role|admin|permission|access|allow|authoriz');
SELECT test.assert_raises(format('SELECT public.cleanos_update_member(%L,%L,%L,%L,true,1)',
  :'org_a',:'staff_a','Cleaner A','admin'),'staff cannot promote themselves','role|admin|permission|access|allow|authoriz');
SELECT test.assert_raises(format('SELECT public.cleanos_set_task_status(%L,%L,%L,1)',
  :'org_a','task-own','completed'),'task cannot complete with unchecked steps','check|complete|step');
SELECT revision AS before_step FROM public.cleanos_tasks WHERE org_id=:'org_a' AND id='task-own' \gset
SELECT public.cleanos_set_checklist_done(:'org_a','task-own','step-one',true,:'before_step');
SELECT public.cleanos_set_checklist_done(:'org_a','task-own','step-one',true,:'before_step');
SELECT test.assert_true((SELECT checklist->0->>'done'='true' FROM public.cleanos_tasks WHERE org_id=:'org_a' AND id='task-own'),
  'replaying desired checklist state does not toggle completed work');
SELECT revision AS next_step FROM public.cleanos_tasks WHERE org_id=:'org_a' AND id='task-own' \gset
SELECT public.cleanos_set_checklist_done(:'org_a','task-own','step-two',true,:'next_step');
SELECT revision AS completion_revision FROM public.cleanos_tasks WHERE org_id=:'org_a' AND id='task-own' \gset
SELECT public.cleanos_set_task_status(:'org_a','task-own','completed',:'completion_revision');
SELECT test.assert_true((SELECT status='completed' FROM public.cleanos_tasks WHERE org_id=:'org_a' AND id='task-own'),
  'staff can complete their fully checked task');
SELECT revision AS reopen_revision FROM public.cleanos_tasks WHERE org_id=:'org_a' AND id='task-own' \gset
SELECT public.cleanos_set_checklist_done(:'org_a','task-own','step-one',false,:'reopen_revision');
SELECT test.assert_true((SELECT status='in_progress' FROM public.cleanos_tasks WHERE org_id=:'org_a' AND id='task-own'),
  'unchecking a completed task atomically reopens it');

SELECT test.actor(:'admin_a');
SELECT test.assert_raises(format('SELECT public.cleanos_save_task(%L,%L::jsonb,%s)',
  :'org_a',:'editor_task',:'editor_revision'),'stale task editor cannot overwrite another phone''s progress','revision|changed|conflict|refresh|stale');
SELECT test.assert_raises(format('UPDATE public.cleanos_balances SET quantity=999 WHERE org_id=%L',:'org_a'),
  'direct balance writes bypassing stock RPC are forbidden','permission|denied|privilege');
SELECT test.assert_raises(format('DELETE FROM public.cleanos_stock_movements WHERE org_id=%L',:'org_a'),
  'stock ledger cannot be deleted by application accounts','permission|denied|privilege');
SELECT test.assert_raises(format('UPDATE public.cleanos_stock_movements SET quantity=999 WHERE org_id=%L',:'org_a'),
  'stock ledger cannot be rewritten by application accounts','permission|denied|privilege');
SELECT test.assert_raises(format('INSERT INTO public.cleanos_members(org_id,user_id,name,role) VALUES(%L,%L,%L,%L)',
  :'org_b',:'admin_a','Forged owner','admin'),'direct membership insertion cannot grant access','permission|denied|privilege');

SELECT test.actor(:'supervisor_a');
SELECT test.assert_true(jsonb_array_length(public.cleanos_workspace(:'org_a')#>'{state,tasks}')=2,
  'supervisor can view the complete organisation task board');
SELECT public.cleanos_record_stock(:'org_a','main','tissues','in',5,'Delivery','receipt-one');
SELECT public.cleanos_record_stock(:'org_a','main','tissues','out',4,'Issued to lobby','issue-one');
SELECT public.cleanos_record_stock(:'org_a','main','tissues','out',4,'Issued to lobby','issue-one');
SELECT test.assert_true((SELECT quantity=11 FROM public.cleanos_balances WHERE org_id=:'org_a' AND product_id='tissues' AND location_id='main'),
  'duplicate stock request applies only once');
SELECT test.assert_true((SELECT count(*)=3 FROM public.cleanos_stock_movements WHERE org_id=:'org_a' AND product_id='tissues'),
  'successful stock balance and ledger remain consistent');
SELECT test.assert_true((SELECT actor_id=:'supervisor_a'::uuid AND created_at BETWEEN now()-interval '2 minutes' AND now()+interval '1 second'
  FROM public.cleanos_stock_movements WHERE org_id=:'org_a' AND request_id='issue-one'),
  'movement actor and timestamp are supplied by the server');
SELECT test.assert_raises(format('SELECT public.cleanos_record_stock(%L,%L,%L,%L,2,%L,%L)',
  :'org_a','main','tissues','out','Issued to lobby','issue-one'),
  'reusing a request ID with different contents is rejected','request|replay|different|conflict|used');
SELECT test.assert_raises(format('SELECT public.cleanos_record_stock(%L,%L,%L,%L,-1,%L,%L)',
  :'org_a','main','tissues','out','','bad-negative'),'negative stock quantity is rejected','quantity|positive|invalid|range');
SELECT test.assert_raises(format('SELECT public.cleanos_record_stock(%L,%L,%L,%L,0,%L,%L)',
  :'org_a','main','tissues','in','','bad-zero'),'zero stock quantity is rejected','quantity|positive|invalid|range');
SELECT test.assert_raises(format('SELECT public.cleanos_record_stock(%L,%L,%L,%L,999,%L,%L)',
  :'org_a','main','tissues','out','','bad-overdraft'),'stock out cannot exceed current server balance','stock|available|quantity|exceed|insufficient');
SELECT test.assert_raises(format('SELECT public.cleanos_record_stock(%L,%L,%L,%L,''NaN''::numeric,%L,%L)',
  :'org_a','main','tissues','in','','bad-nan'),'non-finite stock quantity is rejected','quantity|finite|invalid|range|numeric');
SELECT test.assert_raises(format('SELECT public.cleanos_record_stock(%L,%L,%L,%L,0.0001,%L,%L)',
  :'org_a','main','tissues','in','','bad-precision'),'unrepresentable stock precision is rejected','quantity|precision|decimal|invalid|positive');
SELECT test.assert_true((SELECT quantity=11 FROM public.cleanos_balances WHERE org_id=:'org_a' AND product_id='tissues' AND location_id='main')
  AND (SELECT count(*)=3 FROM public.cleanos_stock_movements WHERE org_id=:'org_a' AND product_id='tissues'),
  'rejected stock operations leave both balance and ledger unchanged');
SELECT revision AS balance_revision FROM public.cleanos_balances WHERE org_id=:'org_a' AND product_id='tissues' AND location_id='main' \gset
SELECT public.cleanos_set_threshold(:'org_a','main','tissues',11,:'balance_revision');
SELECT test.assert_true((SELECT threshold=11 FROM public.cleanos_balances WHERE org_id=:'org_a' AND product_id='tissues' AND location_id='main'),
  'supervisor can configure the selected store threshold');
SELECT test.assert_raises(format('SELECT public.cleanos_set_threshold(%L,%L,%L,12,%s)',
  :'org_a','main','tissues',:'balance_revision'),'stale threshold edit is rejected','revision|changed|conflict|refresh|stale');
SELECT test.assert_raises(format('SELECT public.cleanos_save_facility(%L,%L::jsonb,null,false)',
  :'org_a','{"id":"illegal","name":"Fake","type":"Office","address":"Pune","areas":[]}'),
  'supervisor cannot manage facility administration','admin|role|permission|access|allow|authoriz');

SELECT test.actor(:'admin_a');
SELECT test.assert_raises(format('SELECT public.cleanos_record_stock(%L,%L,%L,%L,4,%L,%L)',
  :'org_a','main','tissues','out','Issued to lobby','issue-one'),
  'another actor cannot reuse a movement request ID','actor|request|different|conflict|used');
SELECT revision AS product_revision FROM public.cleanos_products WHERE org_id=:'org_a' AND id='tissues' \gset
SELECT test.assert_raises(format('SELECT public.cleanos_save_product(%L,%L::jsonb,%s,%L,0)',
  :'org_a','{"id":"tissues","name":"Tissue rolls","category":"Paper","unit":"litres","unitPrice":110,"threshold":3}',:'product_revision','main'),
  'product unit cannot change after stock history','unit|history|movement');
SELECT test.assert_raises(format('SELECT public.cleanos_save_product(%L,%L::jsonb,%s,%L,0)',
  :'org_a','{"id":"tissues","name":"Tissue rolls","category":"Paper","unit":"rolls","unitPrice":110,"threshold":3,"active":false}',:'product_revision','main'),
  'stock-bearing product cannot be archived','stock|quantity|balance|archive');
SELECT revision AS facility_revision FROM public.cleanos_facilities WHERE org_id=:'org_a' AND id='facility-a' \gset
SELECT test.assert_raises(format('SELECT public.cleanos_save_facility(%L,%L::jsonb,%s,false)',
  :'org_a','{"id":"facility-a","name":"Aura Business Centre","type":"Office","address":"Pune","active":false,"areas":[{"id":"lobby","name":"Lobby"},{"id":"washroom","name":"Washroom"}]}',:'facility_revision'),
  'facility with open tasks cannot be archived','task|open|archive');
SELECT public.cleanos_create_location(:'org_a','Facility storeroom','facility-a') AS extra_location \gset
SELECT test.assert_true((SELECT count(*)=3 FROM public.cleanos_balances WHERE org_id=:'org_a' AND location_id=:'extra_location'),
  'new stock location receives balances for existing products');
SELECT test.assert_true((SELECT sum(quantity)=0 FROM public.cleanos_balances WHERE org_id=:'org_a' AND location_id=:'extra_location'),
  'a new location never duplicates opening quantities');
SELECT public.cleanos_create_invite(:'org_a','unverified@cleanos.example','staff') AS unverified_code \gset
SELECT public.cleanos_create_invite(:'org_a','revoked@cleanos.example','staff') AS revoked_code \gset
SELECT public.cleanos_revoke_invite(:'org_a',(SELECT id FROM public.cleanos_invites WHERE org_id=:'org_a' AND email='revoked@cleanos.example' ORDER BY expires_at DESC LIMIT 1));
SELECT public.cleanos_create_invite(:'org_a','expired@cleanos.example','staff') AS expired_code \gset
RESET ROLE;
UPDATE public.cleanos_invites SET expires_at=now()-interval '1 second' WHERE org_id=:'org_a' AND email='expired@cleanos.example';
SELECT test.assert_raises(format('INSERT INTO public.cleanos_balances(org_id,product_id,location_id,quantity,threshold) VALUES(%L,%L,%L,0,0)',
  :'org_a','product-b','main'),'same-organisation foreign keys reject cross-tenant product references','23503|foreign key');
SET ROLE authenticated;
SELECT test.actor(:'unverified');
SELECT test.assert_raises(format('SELECT public.cleanos_join_workspace(%L,%L)',:'unverified_code','Unverified worker'),
  'unverified email cannot accept an invite','verif|confirm|email');
SELECT test.actor(:'revoked_user');
SELECT test.assert_raises(format('SELECT public.cleanos_join_workspace(%L,%L)',:'revoked_code','Revoked worker'),
  'revoked invite cannot be accepted','invite|expired|revok|invalid');
SELECT test.actor(:'expired_user');
SELECT test.assert_raises(format('SELECT public.cleanos_join_workspace(%L,%L)',:'expired_code','Expired worker'),
  'expired invite cannot be accepted','invite|expired|invalid');
SELECT test.actor(:'admin_b');
SELECT test.assert_raises(format('SELECT public.cleanos_join_workspace(%L,%L)',:'staff_code','Second claimant'),
  'used invitation cannot grant access to another user','invite|email|used|invalid|match');
SELECT test.assert_true((SELECT count(*)=0 FROM public.cleanos_tasks WHERE org_id=:'org_a'),
  'another organisation cannot read tasks even when IDs are known');
SELECT test.assert_true((SELECT count(*)=0 FROM public.cleanos_stock_movements WHERE org_id=:'org_a'),
  'another organisation cannot read stock history');
RESET ROLE;
SELECT 'Functional database assertions passed: ' || count(*) FROM test.results;
