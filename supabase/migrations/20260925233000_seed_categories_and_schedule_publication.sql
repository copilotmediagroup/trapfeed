insert into public.categories (name,slug,description,sort_order,is_active) values
('Music','music','Music videos and releases',10,true),('Interviews','interviews','Artist and culture interviews',20,true),('Viral','viral','Viral culture and moments',30,true),('News','news','Hip-hop and culture news',40,true) on conflict (slug) do nothing;
create or replace function private.publish_due_videos() returns integer language plpgsql security definer set search_path='' as $$ declare affected integer; begin update public.videos set status='published'::public.video_status,published_at=coalesce(published_at,scheduled_for,now()),scheduled_for=null,updated_at=now() where status='scheduled'::public.video_status and scheduled_for is not null and scheduled_for<=now(); get diagnostics affected=row_count; return affected; end; $$;
revoke all on function private.publish_due_videos() from public,anon,authenticated;
create extension if not exists pg_cron with schema pg_catalog;
do $$ begin if not exists(select 1 from cron.job where jobname='trapfeed-publish-due-videos') then perform cron.schedule('trapfeed-publish-due-videos','* * * * *','select private.publish_due_videos();'); end if; end $$;
