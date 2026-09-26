import Link from 'next/link'
import { requireContentManager } from '@/lib/auth'
import { addVideo, createSection, removePlacement, updatePlacement, updateSection } from './actions'

export const dynamic = 'force-dynamic'

export default async function HomepageAdmin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const { supabase } = await requireContentManager()
  const now = new Date().toISOString()
  const [{ data: sections }, { data: videos }] = await Promise.all([
    supabase.from('homepage_sections').select('id,title,slug,section_type,sort_order,is_active,homepage_section_videos(section_id,video_id,sort_order,videos(id,title))').order('sort_order').order('id'),
    supabase.from('videos').select('id,title').eq('status', 'published').lte('published_at', now).order('published_at', { ascending: false }).limit(200),
  ])

  return <main className="admin-sub homepage-admin">
    <div className="admin-top"><div><p>DATABASE COMPOSITION</p><h1>Homepage</h1></div><Link className="secondary" href="/admin">DASHBOARD</Link></div>
    {error && <div className="login-error">{error}</div>}
    <form action={createSection} className="cms-form homepage-create">
      <h2>Create section</h2>
      <div className="homepage-fields"><label>Title<input name="title" maxLength={100} required /></label><label>Key<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label>Type<select name="sectionType"><option value="grid">Grid</option><option value="rail">Rail</option><option value="hero">Hero</option></select></label><label>Order<input name="sortOrder" type="number" step="1" defaultValue="0" required /></label></div>
      <label className="check"><input name="isActive" type="checkbox" defaultChecked /> Active</label><button className="primary">CREATE SECTION</button>
    </form>
    <section className="homepage-sections">
      {sections?.map(section => {
        const placements = [...(section.homepage_section_videos ?? [])].sort((a, b) => a.sort_order - b.sort_order)
        return <article className="admin-panel homepage-section" key={section.id}>
          <form action={updateSection} className="homepage-section-head"><input type="hidden" name="id" value={section.id} /><label>Title<input name="title" maxLength={100} defaultValue={section.title} required /></label><label>Key<input name="slug" defaultValue={section.slug} required /></label><label>Type<select name="sectionType" defaultValue={section.section_type}><option value="hero">Hero</option><option value="grid">Grid</option><option value="rail">Rail</option></select></label><label>Order<input name="sortOrder" type="number" step="1" defaultValue={section.sort_order} required /></label><label className="check"><input name="isActive" type="checkbox" defaultChecked={section.is_active} /> Active</label><button className="secondary">SAVE</button></form>
          <div className="homepage-items">{placements.map(item => <form action={updatePlacement} className="homepage-item" key={item.video_id}><input type="hidden" name="sectionId" value={section.id} /><input type="hidden" name="videoId" value={item.video_id} /><b>{item.videos?.[0]?.title ?? 'Unavailable video'}</b><label>Order<input name="sortOrder" type="number" step="1" defaultValue={item.sort_order} required /></label><button className="secondary">MOVE</button><button formAction={removePlacement} className="danger">REMOVE</button></form>)}</div>
          <form action={addVideo} className="homepage-add"><input type="hidden" name="sectionId" value={section.id} /><label>Published video<select name="videoId" required><option value="">Choose video</option>{videos?.map(video => <option value={video.id} key={video.id}>{video.title}</option>)}</select></label><label>Order<input name="sortOrder" type="number" step="1" defaultValue={placements.length ? Math.max(...placements.map(x => x.sort_order)) + 10 : 0} required /></label><button className="primary">ADD VIDEO</button></form>
        </article>
      })}
      {!sections?.length && <div className="admin-empty">No homepage sections yet. Create the first section above.</div>}
    </section>
  </main>
}
