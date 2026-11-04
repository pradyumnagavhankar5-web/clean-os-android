# Local demo data adapter

`localRepository` and `StateRepository.load/save` serve only the explicitly
selected local demo. AsyncStorage stores a validated, versioned sample snapshot;
this is not the shared-workspace persistence interface. Local demo role selection
is not authentication. Existing saved samples are never silently replaced.

The real client uses `src/cloud/repository.ts`: authenticated entity RPC commands
and a canonical, user/organisation-scoped server read model. It never uploads a
replacement AppState. Real accounts and memberships come from Supabase Auth and
the database. The SQL migrations enforce tenant isolation, allowed task fields,
revision checks, atomic stock changes and append-only history.

See `src/cloud/CONTRACT.md` and `docs/SUPABASE_SETUP.md`. Only a project URL and
publishable key belong in the app; privileged database and service keys remain
outside the Android client. Demo data is never imported into a real workspace
automatically. Production sign-in credentials use native SecureStore, while
workspace records are loaded from the server into memory.
