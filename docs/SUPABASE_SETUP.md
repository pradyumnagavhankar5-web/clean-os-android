# CleanOS shared workspace setup

This guide connects the shared-workspace Android app to the Supabase project
owned by Aura Tradings. It can be followed in Chrome on an Android phone or
tablet. Use Chrome's **Desktop site** option if a dashboard control is hidden.

Project: `zhfvvumdgidiognelnqh`  
Project URL: `https://zhfvvumdgidiognelnqh.supabase.co`

The Project URL and publishable key are public app settings. Access to staff,
tasks and stock is enforced by verified accounts, workspace membership and
database permissions. Keep database passwords, SMTP passwords, secret keys and
`service_role` keys private; they must never be placed in the Android app.

The steps below still require the project owner to configure the dashboard.
Providing a publishable key does not grant the app or Codex permission to create
database tables. [Download the shared-workspace APK](https://github.com/pradyumnagavhankar5-web/clean-os-android/releases/download/shared-preview-6-1-11f6b0f/CleanOS-team-preview.apk);
the earlier demo APKs store sample data locally.

1. **Open the project and install the database schema.**

   Open the [project's SQL Editor](https://supabase.com/dashboard/project/zhfvvumdgidiognelnqh/sql/new).
   In another browser tab, open the complete
   [CleanOS database setup script](../supabase/migrations/202611040001_shared_workspaces.sql).
   Tap **Raw** in GitHub, select all of the script and copy it. Return to the SQL
   Editor, paste it into a new query and tap **Run**.

   Run the migration once in the intended new project. It creates tables and
   functions whose names start with `cleanos_`; it does not import demo data.
   The script uses a transaction, so a failed run should roll back its changes.
   If it reports an error, keep the error text and line number for diagnosis.
   Avoid removing tables or rerunning fragments to work around an error.

   Then run the small [consistent-read update](../supabase/migrations/202611040002_consistent_reads.sql)
   in a new SQL Editor query. This update is also safe when the first script was
   applied earlier. It makes concurrent workspace reads consistent.

   After both scripts succeed, create another query and run:

   ```sql
   select public.cleanos_schema_version();
   ```

   The result must be `2`. A result of `1` means only the initial migration has
   been applied; run the small update. Do not run the table-creation script again.

2. **Check email sign-in and confirmation.**

   Open **Authentication → Sign In / Providers → Email**, or the equivalent Email
   provider page in the dashboard. Enable email/password sign-in and allow new
   users to sign up. Set the server minimum password length to **10** to match
   the app. Keep **Confirm email** enabled: creating or joining a CleanOS
   workspace requires a verified email address.

   The public project settings observed during implementation had email sign-in
   and sign-up enabled, with automatic email confirmation disabled. This does
   not verify delivery of a confirmation or recovery email.

3. **Allow the Android confirmation and password-reset callback.**

   In **Authentication → URL Configuration → Redirect URLs**, add this exact URL:

   ```text
   cleanos-team://auth/callback
   ```

   Save the setting. The shared Android app must register the same scheme.
   Supabase confirmation and password-reset links must be opened on the device
   that requested them because the app uses PKCE verification.

   If a link opens a browser page such as `localhost` instead of the app, check
   the redirect allowlist and the app build's callback configuration. A full
   confirmation or recovery link contains sign-in information; keep it private.

4. **Configure email delivery before inviting staff.**

   Supabase's built-in mail service has testing restrictions and low sending
   limits. Configure custom SMTP in the project's **Authentication → Email /
   SMTP settings** for team confirmation and recovery emails.

   Obtain the SMTP host, port, username, password and a verified sender address
   from your mail provider. Enter them in the Supabase dashboard only, then save
   the settings. A sender name such as **CleanOS** helps staff recognise the mail.
   Provider quotas and domain-verification requirements depend on the provider.
   Follow the [official SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

   Test one confirmation and one recovery email using an account you control
   before inviting the team. No staff emails are sent by the repository setup
   script or by this guide.

5. **Create the administrator's account and workspace.**

   Install the shared-workspace APK supplied for testing and open **Create
   account**. Enter your own email and password. When **Check your email** appears,
   open the confirmation message on that same Android device, then return to the
   app and sign in.

   On **Choose your workspace**, select **Create workspace**. Enter the workspace
   name, such as **Aura Tradings**, and your name. Choose the inventory arrangement
   that matches your operations: one shared stock room, or facility stock
   locations. The server makes the workspace creator its first Facility Admin.

   The workspace starts empty. The demo's sample staff, facilities, tasks and
   stock are not copied into the shared database automatically.

6. **Add your facilities, cleaning areas and supplies.**

   As Facility Admin, open **Facilities** and add the real facility details and
   cleaning areas. Add a facility stock location when stock is tracked separately
   at that site.

   In **Stock**, select the stock location and add the products you use. Enter
   each product's unit, INR unit value, low-stock threshold and any opening
   quantity. Opening quantities create stock-history entries. Future receipts
   and issues use **Stock in** and **Stock out** so the ledger remains traceable.

   Archive records when they are no longer used rather than replacing their
   historical identity. Existing task and stock-history references are retained.

7. **Invite each supervisor or staff member.**

   Open the workspace's team-management screen as Facility Admin. Enter the
   person's exact email address, choose their role and create an invite. Copy
   the displayed invite code and share it directly with that person through your
   normal trusted channel. CleanOS does not send the invitation automatically.

   On their own phone, the person creates an account with that same email,
   confirms it on that phone, signs in and selects **Join with invite code**.
   They enter their name and the code. The server checks the verified email,
   expiry and invitation role before granting membership. If an invitation
   expires or is revoked, create a new one. Keep invite codes private.

8. **Check the shared workflow on two phones.**

   On the administrator's phone, assign a task to a staff member. On the staff
   phone, refresh, complete the checklist and finish the task. Refresh the
   administrator's dashboard and confirm the change appears.

   As a manager, record a small stock receipt or issue and confirm the other
   authorised phone sees the updated balance and history after refreshing. A
   staff account should be able to read supplies but should not be able to
   change stock or another person's tasks. Use
   [the shared release checklist](SHARED_RELEASE_CHECKLIST.md) to record results.

Shared changes require an internet connection. A successful save means the
server has accepted the operation. Refresh after reconnecting or returning to the
app. This version does not promise queued offline edits or automatic conflict
merging. If stock saving fails, reuse the same request when retrying and check
history before entering another issue.

Before operational rollout, assign responsibility for backups and restores.
Review the project's current Free-plan limits and inactivity rules in Supabase;
Free projects can be paused after inactivity, which interrupts phone syncing
until the project is resumed. Plan availability and backup facilities can change.
Confirm which backups your
plan supplies, arrange a protected export if needed, and test restoring a backup
into a separate project. A phone's displayed data is not a database backup.

The existing Expo-template signing key is for preview testing. The operational
release needs an owner-controlled Android signing key, a protected backup of that
key and the release checks below. Database setup alone does not make a preview
APK a completed production release.
