-- TrapFeed's initial database contract. Apply with `supabase db push` to a new project.
create extension if not exists pgcrypto;

create type public.app_role as enum ('viewer', 'editor', 'admin');
create type public.video_source as enum ('upload', 'youtube');
create type public.video_status as enum ('draft', 'scheduled', 'published', 'archived');
create type public.reaction_kind as enum ('fire', 'like');
create type public.comment_status as enum ('pending', 'visible', 'hidden', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  bio text,
  image_path text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  source public.video_source not null,
  provider_video_id text,
  video_path text,
  thumbnail_path text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  category_id uuid references public.categories(id) on delete set null,
  status public.video_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint videos_source_payload check (
    (source = 'youtube' and provider_video_id is not null and video_path is null)
    or (source = 'upload' and video_path is not null and provider_video_id is null)
  ),
  constraint videos_publish_state check (
    (status = 'published' and published_at is not null and scheduled_for is null)
    or (status = 'scheduled' and scheduled_for is not null and published_at is null)
    or (status in ('draft', 'archived') and scheduled_for is null)
  )
);

create unique index videos_youtube_provider_id_unique
  on public.videos(provider_video_id) where source = 'youtube';
create index videos_public_feed_idx on public.videos(published_at desc)
  where status = 'published';
create index videos_category_idx on public.videos(category_id, published_at desc)
  where status = 'published';
create index videos_search_idx on public.videos
  using gin (to_tsvector('english', title || ' ' || coalesce(description, '')));

create table public.video_artists (
  video_id uuid not null references public.videos(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (video_id, artist_id)
);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  section_type text not null check (section_type in ('hero', 'grid', 'rail')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_section_videos (
  section_id uuid not null references public.homepage_sections(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (section_id, video_id),
  unique (section_id, sort_order)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status public.comment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_video_idx on public.comments(video_id, created_at desc);

create table public.reactions (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id, kind)
);

create table public.video_events (
  id bigint generated always as identity primary key,
  video_id uuid not null references public.videos(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  anonymous_id uuid,
  event_type text not null check (event_type in ('impression', 'play', 'progress', 'complete')),
  progress_seconds integer check (progress_seconds is null or progress_seconds >= 0),
  occurred_at timestamptz not null default now(),
  constraint video_events_actor check (viewer_id is not null or anonymous_id is not null)
);
create index video_events_rollup_idx on public.video_events(video_id, occurred_at desc);

create table public.moderation_actions (
  id bigint generated always as identity primary key,
  comment_id uuid not null references public.comments(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id) on delete restrict,
  previous_status public.comment_status not null,
  next_status public.comment_status not null,
  note text,
  created_at timestamptz not null default now()
);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.create_profile_for_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.create_profile_for_user();

create function public.is_content_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('editor', 'admin')
  );
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only admins can change roles';
  end if;
  return new;
end;
$$;

create function public.publish_due_videos() returns integer
language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  if not public.is_admin() and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'not authorized';
  end if;
  update public.videos
    set status = 'published', published_at = scheduled_for, scheduled_for = null
    where status = 'scheduled' and scheduled_for <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger profiles_protect_role before update on public.profiles for each row execute function public.protect_profile_role();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger artists_updated_at before update on public.artists for each row execute function public.set_updated_at();
create trigger videos_updated_at before update on public.videos for each row execute function public.set_updated_at();
create trigger homepage_sections_updated_at before update on public.homepage_sections for each row execute function public.set_updated_at();
create trigger comments_updated_at before update on public.comments for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.artists enable row level security;
alter table public.videos enable row level security;
alter table public.video_artists enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.homepage_section_videos enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.video_events enable row level security;
alter table public.moderation_actions enable row level security;

create policy profiles_read_self_or_staff on public.profiles for select
  using (id = auth.uid() or public.is_content_manager());
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

create policy categories_public_read on public.categories for select using (is_active or public.is_content_manager());
create policy categories_staff_write on public.categories for all using (public.is_content_manager()) with check (public.is_content_manager());
create policy artists_public_read on public.artists for select using (true);
create policy artists_staff_write on public.artists for all using (public.is_content_manager()) with check (public.is_content_manager());
create policy videos_public_read on public.videos for select
  using ((status = 'published' and published_at <= now()) or public.is_content_manager());
create policy videos_staff_write on public.videos for all using (public.is_content_manager()) with check (public.is_content_manager());
create policy video_artists_public_read on public.video_artists for select using (
  public.is_content_manager() or exists (
    select 1 from public.videos where videos.id = video_artists.video_id
      and videos.status = 'published' and videos.published_at <= now()
  )
);
create policy video_artists_staff_write on public.video_artists for all using (public.is_content_manager()) with check (public.is_content_manager());
create policy homepage_sections_public_read on public.homepage_sections for select using (is_active or public.is_content_manager());
create policy homepage_sections_staff_write on public.homepage_sections for all using (public.is_content_manager()) with check (public.is_content_manager());
create policy homepage_items_public_read on public.homepage_section_videos for select using (
  public.is_content_manager() or exists (
    select 1 from public.videos where videos.id = homepage_section_videos.video_id
      and videos.status = 'published' and videos.published_at <= now()
  )
);
create policy homepage_items_staff_write on public.homepage_section_videos for all using (public.is_content_manager()) with check (public.is_content_manager());

create policy comments_public_read on public.comments for select using (status = 'visible' or author_id = auth.uid() or public.is_content_manager());
create policy comments_author_insert on public.comments for insert with check (author_id = auth.uid() and status = 'pending');
create policy comments_author_update on public.comments for update using (author_id = auth.uid() and status = 'pending') with check (author_id = auth.uid() and status = 'pending');
create policy comments_staff_update on public.comments for update using (public.is_content_manager()) with check (public.is_content_manager());
create policy reactions_public_read on public.reactions for select using (true);
create policy reactions_owner_write on public.reactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy events_insert on public.video_events for insert
  with check (viewer_id = auth.uid() or (viewer_id is null and anonymous_id is not null));
create policy events_staff_read on public.video_events for select using (public.is_content_manager());
create policy moderation_staff_all on public.moderation_actions for all using (public.is_content_manager()) with check (public.is_content_manager());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('videos', 'videos', false, 1073741824, array['video/mp4', 'video/webm']),
  ('thumbnails', 'thumbnails', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy storage_staff_select on storage.objects for select to authenticated
  using (bucket_id in ('videos', 'thumbnails') and public.is_content_manager());
create policy storage_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('videos', 'thumbnails') and public.is_content_manager());
create policy storage_staff_update on storage.objects for update to authenticated
  using (bucket_id in ('videos', 'thumbnails') and public.is_content_manager())
  with check (bucket_id in ('videos', 'thumbnails') and public.is_content_manager());
create policy storage_staff_delete on storage.objects for delete to authenticated
  using (bucket_id in ('videos', 'thumbnails') and public.is_content_manager());
create policy thumbnails_public_read on storage.objects for select
  using (bucket_id = 'thumbnails');

revoke all on function public.publish_due_videos() from public, anon, authenticated;
grant execute on function public.publish_due_videos() to authenticated, service_role;

-- Explicitly constrain callable helper functions and Data API privileges.
revoke all on function public.create_profile_for_user() from public, anon, authenticated;
revoke all on function public.is_content_manager() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.protect_profile_role() from public, anon, authenticated;
grant execute on function public.is_content_manager() to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.artists, public.videos, public.video_artists, public.homepage_sections, public.homepage_section_videos, public.comments, public.reactions to anon;
grant select on public.profiles, public.categories, public.artists, public.videos, public.video_artists, public.homepage_sections, public.homepage_section_videos, public.comments, public.reactions, public.video_events, public.moderation_actions to authenticated;
grant insert, update on public.profiles, public.comments to authenticated;
grant insert, delete on public.reactions to authenticated;
grant insert on public.video_events to authenticated, anon;
grant insert, update, delete on public.categories, public.artists, public.videos, public.video_artists, public.homepage_sections, public.homepage_section_videos, public.moderation_actions to authenticated;
grant usage, select on all sequences in schema public to authenticated;
