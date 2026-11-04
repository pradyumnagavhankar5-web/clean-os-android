# Shared workspace contract

Production uses Supabase Auth and entity RPCs, never a whole-snapshot write.
All RPC names start `cleanos_`; all business rows are scoped by `org_id` UUID.
Entity IDs are bounded text so stable client request IDs work across retries.
Membership user IDs are Auth UUIDs and become `state.staff[].id` / `session.staffId`.

The snapshot is `{workspace:{id,name,role,memberId,inventoryMode},locations:[{id,name,facilityId,active}],locationId,state:AppState}`.
State is version 1, onboardingDone true, server-derived session; no seeded real data.
Task/Facility/Product revision and inventory balanceRevision are optional domain
extensions, always supplied by the server. Read inactive referenced names for
history; editors select active records. Tasks are filtered by server membership.
Inventory shows the selected location; products and locations are org-wide.

RPC arguments (all writes require authenticated active membership):

- schema_version() -> integer 2 (anonymous may read only this version).
- my_workspaces() -> array `{id,name,role}`.
- create_workspace(p_name,p_display_name,p_inventory_mode='shared') -> UUID.
- join_workspace(p_code,p_display_name) -> UUID. Verified email must match invite.
- workspace(p_org_id,p_location_id=null) -> snapshot above.
- save_task(p_org_id,p_task JSON,p_expected_revision=null) -> void. New tasks have
  no revision; edits require the revision captured when the editor opened.
- set_task_status(p_org_id,p_task_id,p_status,p_expected_revision=null) -> void.
- set_checklist_done(p_org_id,p_task_id,p_item_id,p_done,p_expected_revision=null)
  -> void. Set desired boolean, never replay a toggle.
- record_stock(p_org_id,p_location_id,p_product_id,p_direction,p_quantity,p_note,
  p_request_id) -> void. Atomic row lock + append-only ledger; replay same request
  returns success only for identical actor/payload; server timestamps.
- set_threshold(p_org_id,p_location_id,p_product_id,p_threshold,p_expected_revision=null).
- save_facility(p_org_id,p_facility JSON,p_expected_revision=null,p_create_location=false).
  JSON `{id,name,type,address,areas:[{id,name,active?}],active?}`. Retain/archive
  old area IDs so history is preserved. Admin only.
- save_product(p_org_id,p_product JSON,p_expected_revision=null,p_location_id=null,
  p_opening_quantity=0). JSON `{id,name,category,unit,unitPrice,threshold,active?}`.
  Opening stock is allowed only on creation and creates a ledger entry. Unit is
  immutable after stock history. Admin/supervisor only.
- create_location(p_org_id,p_name,p_facility_id=null) -> text ID. Admin only.
- create_invite(p_org_id,p_email,p_role) -> raw invite code once. Admin only.
- list_invites(p_org_id) -> array `{id,email,role,expiresAt,usedAt}`. Admin only.
- revoke_invite(p_org_id,p_invite_id). Admin only.
- update_member(p_org_id,p_user_id,p_name,p_role,p_active,p_expected_revision=null).
  Admin only; cannot remove the last active admin.

All names above omit the `cleanos_` prefix for readability. SQL writes expose no
direct table INSERT/UPDATE/DELETE to authenticated or anonymous users. Tenant
foreign keys, row-level security, revision checks, verified invitations and
server permissions remain mandatory even if the UI hides a control.
