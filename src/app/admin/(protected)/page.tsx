import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireContentManager } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const { supabase } = await requireContentManager()
  const { data: videos } = await supabase.from('videos').select('id,title,source,status,created_at').order('created_at', { ascending: false })
  const total = videos?.length ?? 0
  const published = videos?.filter(video => video.status === 'published').length ?? 0
  const scheduled = videos?.filter(video => video.status === 'scheduled').length ?? 0

  return <main className="admin-sub dashboard-page">
    <div className="admin-top"><div><p>ADMINISTRATION</p><h1>Dashboard</h1></div><Link href="/admin/upload" className="primary"><Plus /> ADD VIDEO</Link></div>
    <div className="stats">
      <div><span>TOTAL VIDEOS</span><strong>{total}</strong><em>All content records</em></div>
      <div><span>PUBLISHED</span><strong>{published}</strong><em>Visible on TrapFeed</em></div>
      <div><span>SCHEDULED</span><strong>{scheduled}</strong><em>Queued for publishing</em></div>
      <div><span>DRAFTS</span><strong>{Math.max(0, total - published - scheduled)}</strong><em>Drafts and archived</em></div>
    </div>
    <section className="admin-panel"><div className="panel-head"><div><h2>Recent Videos</h2><p>Manage uploads, YouTube imports, and publishing.</p></div><Link href="/admin/videos">VIEW ALL</Link></div>
      {!videos?.length ? <div className="admin-empty"><h3>No videos yet</h3><p>Upload a video or import an authorized YouTube reference.</p></div> : videos.slice(0, 6).map(video => <div className="cms-row" key={video.id}><b><Link href={`/admin/videos/${video.id}`}>{video.title}</Link></b><span>{video.source.toUpperCase()}</span><i>{video.status.toUpperCase()}</i></div>)}
    </section>
  </main>
}
