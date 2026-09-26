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
## Production package 2 audit

The checked-in migration history is the schema source used for this package; no live
database connection was available. The existing `homepage_sections` table owns section
titles, keys, types, active state, and section order. The existing
`homepage_section_videos` table owns unique video placement and order within a section.
The `hero` section type is the primary featured-content owner, with the existing
`videos.is_featured` flag retained only as the deterministic empty-composition fallback.
No second homepage-ordering schema was added.

Trending is intentionally simple: the public `get_trending_videos` function counts only
recorded `play` events in a seven-day window, restricts results to currently published
videos, and orders equal counts by video ID. The function caps caller-controlled windows
and result sizes, and a partial recent-play index supports the aggregation. The existing
30-minute identity-based suppression remains in `record_video_play`.

Generated Supabase types were not checked in because this environment has no linked
Supabase project against which schema generation can be verified. Generate them from the
target project only after applying migrations, then parameterize the browser and server
clients with that generated `Database` type.
