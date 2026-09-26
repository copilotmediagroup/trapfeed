import Link from 'next/link'
import { ChevronRight, Flame, Play } from 'lucide-react'
import { Header } from '@/components/Header'
import { VideoCard, type FeedVideo } from '@/components/VideoCard'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
type VideoRow = { id: string; title: string; slug: string; thumbnail_path: string | null; duration_seconds: number | null; is_featured: boolean; published_at: string | null; category: { name: string }[] | null }
type Placement = { video_id: string; sort_order: number }
type HomepageSection = { id: string; title: string; slug: string; section_type: string; sort_order: number; homepage_section_videos: Placement[] | null }

function ago(value: string | null) { if (!value) return 'just now'; const s = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago` }
function duration(n: number | null) { return n ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : '' }
function views(n: number) { return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n) }
const Section = ({ title, id, items }: { title: string; id: string; items: FeedVideo[] }) => items.length ? <section className="feed-section" id={id}><div className="section-head"><h2>{title}</h2><span>CURATED <ChevronRight /></span></div><div className="video-grid">{items.map(v => <VideoCard key={v.id} video={v} />)}</div></section> : null

export default async function Home() {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const [{ data: rows }, { data: viewRows }, { data: trendRows }, { data: sections }] = await Promise.all([
    supabase.from('videos').select('id,title,slug,thumbnail_path,duration_seconds,is_featured,published_at,category:categories(name)').eq('status', 'published').lte('published_at', now).order('published_at', { ascending: false }).limit(80),
    supabase.rpc('get_video_view_counts'),
    supabase.rpc('get_trending_videos', { p_since: new Date(new Date(now).getTime() - 7 * 86400000).toISOString(), p_limit: 5 }),
    supabase.from('homepage_sections').select('id,title,slug,section_type,sort_order,homepage_section_videos(video_id,sort_order)').eq('is_active', true).order('sort_order').order('id'),
  ])
  const videoRows = (rows ?? []) as VideoRow[]
  if (!videoRows.length) return <><Header /><main className="empty-home"><div><span className="feature-pill">TRAPFEED</span><h1>The feed is getting loaded.</h1><p>Published videos will appear here automatically.</p></div></main></>
  const countMap = new Map<string, number>(((viewRows ?? []) as Array<{ video_id: string; view_count: number }>).map(x => [x.video_id, Number(x.view_count)]))
  const itemMap = new Map<string, FeedVideo>(videoRows.map(v => [v.id, { id: v.id, title: v.title, slug: v.slug, category: v.category?.[0]?.name ?? 'Culture', views: views(countMap.get(v.id) ?? 0), age: ago(v.published_at), duration: duration(v.duration_seconds), thumbnailUrl: v.thumbnail_path ? (v.thumbnail_path.startsWith('https://') ? v.thumbnail_path : supabase.storage.from('thumbnails').getPublicUrl(v.thumbnail_path).data.publicUrl) : null }]))
  const activeSections = ((sections ?? []) as HomepageSection[]).map(section => ({ ...section, items: [...(section.homepage_section_videos ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(x => itemMap.get(x.video_id)).filter((x): x is FeedVideo => Boolean(x)) }))
  const heroSection = activeSections.find(section => section.section_type === 'hero' && section.items.length)
  const fallbackHeroId = videoRows.find(v => v.is_featured)?.id ?? videoRows[0].id
  const hero = heroSection?.items[0] ?? itemMap.get(fallbackHeroId)!
  const trending = ((trendRows ?? []) as Array<{ video_id: string }>).map(row => itemMap.get(row.video_id)).filter((x): x is FeedVideo => x !== undefined && x.id !== hero.id).slice(0, 4)
  const composed = activeSections.filter(section => section.section_type !== 'hero' && section.items.length)
  const fallback = composed.length ? [] : [{ id: 'videos', title: 'Newest Videos', slug: 'videos', items: videoRows.slice(0, 8).map(v => itemMap.get(v.id)!) }]
  return <><Header /><main><section className="hero-wrap"><div className="hero"><Link href={`/watch/${hero.slug}`} className="hero-art" style={hero.thumbnailUrl ? { backgroundImage: `linear-gradient(0deg,rgba(0,0,0,.75),rgba(0,0,0,.05)),url(${hero.thumbnailUrl})` } : undefined}><div className="hero-glow" /><span className="hero-play"><Play fill="currentColor" /></span><div className="hero-content"><span className="feature-pill">FEATURED</span><h1>{hero.title}</h1><p>{hero.views} views <b>•</b> {hero.age}</p><span className="hero-deck">Watch what the culture is talking about right now.</span></div></Link><aside className="trending"><h2><Flame /> TRENDING — 7 DAY PLAYS</h2>{trending.length ? trending.map((v, i) => <div className="trend-row" key={v.id}><span className="rank">0{i + 1}</span><VideoCard video={v} compact /></div>) : <p className="trend-empty">Trending appears after legitimate plays are recorded.</p>}</aside></div></section><div className="content-shell">{[...composed, ...fallback].map(section => <Section title={section.title} id={section.slug} items={section.items} key={section.id} />)}</div></main><footer><div className="brand">TRAP<span>FEED</span></div><p>HIP-HOP. CULTURE. UNFILTERED.</p><small>© 2026 TrapFeed. All rights reserved.</small></footer></>
}
