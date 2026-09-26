'use server'

import { redirect } from 'next/navigation'
import { requireContentManager } from '@/lib/auth'

function youtubeId(input: string) { let candidate = ''; try { const url = new URL(input); if (url.hostname === 'youtu.be') candidate = url.pathname.slice(1).split('/')[0]; if (url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com')) candidate = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop() || '' } catch { candidate = input } return /^[\w-]{11}$/.test(candidate) ? candidate : '' }
function seconds(value?: string) { const match = value?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/); return match ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0) : null }

export async function importYoutubeDraft(formData: FormData) {
  const { supabase, user } = await requireContentManager()
  let title = String(formData.get('title') ?? '').trim(); let description = String(formData.get('description') ?? '').trim(); const id = youtubeId(String(formData.get('youtubeUrl') ?? '').trim())
  if (!id) redirect('/admin/youtube?error=Enter%20a%20valid%20YouTube%20URL')
  let duration: number | null = null; let thumbnailPath = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  if (process.env.YOUTUBE_API_KEY) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(id)}&key=${encodeURIComponent(process.env.YOUTUBE_API_KEY)}`, { cache: 'no-store' })
    if (response.ok) { const payload = await response.json() as { items?: Array<{ snippet?: { title?: string; description?: string; channelTitle?: string; thumbnails?: Record<string,{url?:string;width?:number;height?:number}> }; contentDetails?: { duration?: string } }> }; const metadata = payload.items?.[0]; if (!metadata) redirect('/admin/youtube?error=YouTube%20could%20not%20find%20that%20video'); title ||= metadata.snippet?.title?.trim() ?? ''; description ||= metadata.snippet?.description?.trim() ?? ''; duration = seconds(metadata.contentDetails?.duration); const thumbs=Object.values(metadata.snippet?.thumbnails??{}).filter(t=>t.url); const best=thumbs.sort((a,b)=>(b.width??0)*(b.height??0)-(a.width??0)*(a.height??0))[0]; if(best?.url) thumbnailPath=best.url }
  }
  if (!title || title.length > 180) redirect('/admin/youtube?error=Enter%20a%20title%20of%20180%20characters%20or%20fewer')
  const slug = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video') + '-' + Date.now()
  const { data, error } = await supabase.from('videos').insert({ title, description: description || null, slug, source: 'youtube', provider_video_id: id, duration_seconds: duration, thumbnail_path: thumbnailPath, status: 'draft', created_by: user.id, updated_by: user.id }).select('id').single()
  if (error) redirect('/admin/youtube?error=' + encodeURIComponent(error.message))
  redirect(`/admin/videos/${data.id}`)
}
