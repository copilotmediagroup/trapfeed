# TrapFeed architecture

## Audit baseline

The current application is a Next.js App Router UI prototype. Its public feed and admin dashboard both read the same compile-time fixture in `src/data/videos.ts`; there is no persisted ownership, authentication, upload pipeline, or runtime backend yet. The first backend gate therefore defines the data contract without pretending those fixtures are production records.

## Backend boundary

Supabase owns identity, PostgreSQL data, row-level authorization, and object storage. Next.js Server Components and route handlers will orchestrate requests, but publishing rules, staff authorization, source integrity, and public visibility remain enforced by PostgreSQL.

The initial migration intentionally separates:

- user profiles and roles;
- categories, artists, videos, and ordered artist credits;
- ordered homepage sections;
- comments, reactions, immutable analytics events, and moderation actions;
- uploaded objects from authorized YouTube identifiers.

Uploaded videos are private objects and must later be served through short-lived signed URLs. Thumbnails are public. YouTube records store only the provider video ID; the application must obtain metadata through an authorized YouTube integration and render the official embed player.

## Authorization model

`viewer` can manage only their own pending comments and reactions. `editor` can manage content and moderation. `admin` additionally owns role assignment and scheduled publishing. Client-side route protection is never authoritative: every table has RLS and privileged helpers derive the actor from `auth.uid()`.

The user-creation trigger assigns `viewer` only. The first admin must be promoted deliberately in the Supabase SQL editor after verifying the account ID:

```sql
update public.profiles set role = 'admin' where id = '<verified auth.users id>';
```

## Delivery gates

1. Link a Supabase project and apply the migration in a disposable branch environment.
2. Generate TypeScript database types from that applied schema; do not hand-author them.
3. Add server/browser Supabase clients and session refresh using Next.js 16 `proxy.ts`.
4. Replace the admin fixture with authenticated database reads, then implement mutations as server-side commands.
5. Build signed direct uploads, media validation/transcoding, and authorized YouTube import.
6. Replace the public fixture only after publishing and homepage queries are covered by integration tests.

No production schema has been inferred by this change: this migration is the proposed source of truth and must be reviewed and applied before application code depends on it.
