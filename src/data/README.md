# Data boundary

`localRepository` is the only active adapter. It stores one validated, versioned
demo snapshot with Expo Go compatible AsyncStorage. No network requests or secrets
are needed. Its storage is local and unencrypted; use demo information only.

`StateRepository` in `repository.ts` separates persistence from the UI and domain.
The provider saves transitions before publishing them and surfaces failed loads or
writes. Invalid saved data is preserved for explicit user recovery; it is never
silently replaced. Writes are queued in invocation order.

For a future Supabase implementation, first design tables for organisations,
memberships, facilities, areas, tasks, checklist items, products, and stock
movements. Use real Supabase Auth and server-enforced row-level security for each
organisation and role. Stock changes need an atomic database transaction to avoid
lost updates and negative inventory. Stock movements should be append-only.

A future repository adapter can map table data into the domain models. The whole
snapshot save interface is suitable for this offline prototype; production should
evolve to entity-level mutations, conflict handling and tenant-scoped queries
before introducing multi-user writes. Demo role checks are not security controls.

No Supabase client, URL, anon key, service-role key, production authentication or
network connection is configured. Never place a Supabase service-role key in an
Android app. Add and test schema migrations, RLS policies, authentication,
organisation membership and recovery before enabling a live adapter.
