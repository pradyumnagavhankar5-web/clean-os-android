# CleanOS shared release checklist

Record evidence for the exact source commit, APK and Supabase migration used.
Unchecked items are work to verify, not claims that tests have passed. Earlier
demo acceptance and emulator checks do not verify this shared-workspace release.

Candidate source: `6779dccdd412c58375ece8b64f81b5c87a531ce4`

Migrations: `202611040001_shared_workspaces.sql` and `202611040002_consistent_reads.sql`

| Candidate evidence | Recorded value |
|---|---|
| Release | `shared-preview-7-1-6779dcc` |
| Version / Android code | `2.0.1` / `2` |
| ARM64 APK bytes | `30,919,973` |
| ARM64 APK SHA-256 | `be16fe16a48f259d17a2a1f39d8e417d4a2afdd69d750af47a85b6b6486d003d` |
| ARMv7 APK SHA-256 | `e4fee7df47a5811cdaa4569b7d4d4eb98478bee000aa8a97b73f1609cc4eb5b1` |
| Preview certificate SHA-256 | `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` |
| Automated installation | Android 16, x86_64 emulator; 6 November 2026 |
| Physical test date / tester / devices | Pending |

[Successful Android pipeline](https://github.com/pradyumnagavhankar5-web/clean-os-android/actions/runs/42179926588).
The preview key above is public; owner signing remains a separate release step.

## Database and access control

- [ ] Apply both migrations to the intended project and confirm schema
  version `2`. Record the test database version and command/output for automated
  database tests.
- [ ] Unauthenticated requests cannot read business rows or perform mutations.
- [ ] A member of one workspace cannot read, reference or change another
  workspace's tasks, facilities, stock, members or invitations.
- [ ] Forging a role, user ID or organisation ID cannot grant additional access.
  Direct table writes are denied; checked server operations enforce permissions.
- [ ] Staff can change only their assigned task's allowed status/checklist fields.
  They cannot assign tasks, edit the catalogue or record stock movements.
- [ ] Invitation acceptance requires the invited, verified email. Expired,
  revoked, reused and wrong-email codes are rejected appropriately.
- [ ] Member deactivation removes access; an operation cannot remove the last
  active administrator, including two competing administrator changes.

## Stock, task conflicts and retry behaviour

- [ ] Stock balances cannot become negative. Invalid quantities and failed
  stock-outs leave both balance and history unchanged.
- [ ] Two concurrent stock-outs cannot spend the same remaining balance twice.
- [ ] Repeating the same stock request changes stock once. Reusing its ID with a
  different actor or payload is rejected. Actors and times come from the server.
- [ ] Ledger entries cannot be edited or deleted by app users.
- [ ] Retrying a checklist update sets its desired value without toggling it back.
- [ ] Completion requires all checklist steps. Reopening a step and completing
  a task concurrently leave a valid task state.
- [ ] A stale task, product, facility or threshold edit reports a conflict rather
  than silently replacing another phone's newer changes.
- [ ] Opening stock is recorded in history. Archives preserve earlier references;
  product units cannot reinterpret an existing stock history.

## Client and Android build evidence

- [ ] Lint, TypeScript and the automated domain/storage/client tests pass. Record
  commands and result counts.
- [ ] Secure session storage tests cover large values, replacement, removal and
  interrupted or failed writes. Tokens and private links do not appear in logs.
- [ ] Public project configuration, schema detection and invalid/missing backend
  states produce useful errors without creating or uploading demo data.
- [ ] Sign-out and workspace/account switching clear the previous workspace's
  displayed data. A later account cannot reuse its cached role or records.
- [ ] Android bundling/prebuild succeeds with Expo-compatible dependencies.
- [ ] APK checks verify package, version code, intended processor architecture,
  embedded JavaScript, signature, ZIP alignment and ARM64 native alignment.
- [ ] Install/launch evidence identifies whether it came from an emulator or a
  physical Android device. Preserve the exact APK checksum with the evidence.

## Supabase project and email configuration

- [ ] The project owner has applied the reviewed migration. Public URL and
  publishable key match the intended project; no privileged key is in the app.
- [ ] Confirm email remains enabled. Custom SMTP can deliver confirmation and
  recovery mail to ordinary staff addresses within the provider's limits.
- [ ] `cleanos-team://auth/callback` is allowed and matches the APK's scheme.
  Confirmation and recovery work on the requesting device.
- [ ] Workspace creation, a verified-email invitation and joining have been
  checked against the actual configured Supabase project.

## Two physical phones

- [ ] Record both device models and Android versions above. Install the exact
  shared-workspace candidate, then create or join the intended workspace.
- [ ] Admin creates a facility, area, product and opening stock; manager creates
  and assigns a task to the staff account on the other phone.
- [ ] Staff receives the assignment after refresh, completes its checklist and
  finishes the task; the manager sees the changed dashboard after refresh.
- [ ] Both authorised phones see matching stock balances and movement history.
  Staff can read stock but cannot mutate it.
- [ ] Two users editing the same task receive the expected conflict handling.
- [ ] Closing/reopening the app restores the correct signed-in account. A lost
  connection gives a recoverable error and does not report an unsaved operation
  as successful or silently queue offline writes.
- [ ] Larger fonts, TalkBack, the keyboard, Android Back and all setup forms work
  on the actual devices. WhatsApp enquiries preserve quantities and require the
  user to choose a recipient and send the message themselves.

## Operational release and recovery

- [ ] Final package ID and callback scheme are recorded. The release is signed
  with an owner-controlled key; that key and recovery instructions are backed up
  privately. Preview-template signing is not represented as production signing.
- [ ] Install/update instructions match the candidate's package and signing
  history; any separate demo installation and its local data are accounted for.
- [ ] The business has a named workspace administrator and an account recovery
  route. Role changes and staff departures have been tested.
- [ ] A backup owner, backup frequency and restore procedure are recorded; a
  restore into a separate project succeeds. Supabase plan limits, inactivity and
  availability fit the intended daily use.
- [ ] Staff know what account and housekeeping data is collected, who can access
  it, how long it is retained and how to request correction or account removal.
  The published privacy notice and support contact match the actual service.
- [ ] Open failures from this checklist are resolved or recorded as explicit
  rollout limitations before the build is described as a final shared release.

## Implementation evidence — 4 November 2026

- Local lint and TypeScript checks passed.
- 57 JavaScript/TypeScript tests passed, including secure credential persistence,
  strict callback handling, RFC7636 S256 transport, account-switch isolation,
  canonical server reads and retry IDs.
- 67 assertions passed in real PostgreSQL 17 with isolated Auth fixtures,
  including cross-organisation denial, forged roles, staff permissions,
  immutable stock history, stale revisions and simultaneous stock/admin changes.
- Android JavaScript export passed with Expo SDK 58.
- Hosted SQL deployment, real email delivery, owner signing and real-phone
  acceptance are not established by these local checks.

## Build evidence — 6 November 2026

- The candidate's GitHub build, database, Android 16 emulator and publication jobs
  all passed. Fresh installation returned `Success`; launch returned `Status: ok`.
- The emulator displayed real account sign-in and account creation. A registered
  invalid email callback safely returned to sign-in with its recovery message.
  This test did not create an account or send email.
- The final emulator screenshot confirms dark, readable status-bar icons on the
  light sign-in screen.
- Both published phone APKs match the original immutable Actions artifact
  `13486030971`. Its archive SHA-256 is
  `b73a0bbe070f3d035c40d354af4d0059e5363f90021a1b5c47fb4dde5dd83370`.
- The actual PostgreSQL workspace responses also passed the client's decoder for
  admin, supervisor, staff and an empty workspace in the isolated test database.
- The private signing tools passed local signature/payload verification with a
  temporary test identity. No owner production key was generated or published.
- Hosted schema deployment remains unverified: the project's read-only schema
  endpoint still returned missing-function `PGRST202` on 6 November 2026.
- Six release-provenance tests passed, covering exact run/attempt binding,
  manual builds, forks, failed attempts, expired artifacts and digest metadata.
