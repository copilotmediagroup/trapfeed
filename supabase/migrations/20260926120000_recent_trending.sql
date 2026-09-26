-- A deliberately simple trending signal: legitimate plays recorded in the last 7 days.
create index video_events_recent_plays_idx
  on public.video_events (occurred_at desc, video_id)
  where event_type = 'play';

create or replace function public.get_trending_videos(
  p_since timestamptz default now() - interval '7 days',
  p_limit integer default 4
) returns table(video_id uuid, recent_play_count bigint)
language sql stable security definer set search_path = '' as $$
  select e.video_id, count(*)::bigint as recent_play_count
  from public.video_events e
  join public.videos v on v.id = e.video_id
  where e.event_type = 'play'
    and e.occurred_at >= greatest(p_since, now() - interval '31 days')
    and v.status = 'published'::public.video_status
    and v.published_at <= now()
  group by e.video_id
  order by recent_play_count desc, e.video_id
  limit least(greatest(p_limit, 1), 20)
$$;

revoke all on function public.get_trending_videos(timestamptz, integer) from public;
grant execute on function public.get_trending_videos(timestamptz, integer) to anon, authenticated;
