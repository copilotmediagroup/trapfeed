'use server'

import { redirect } from 'next/navigation'
import { requireContentManager } from '@/lib/auth'

function youtubeId(input: string) {
  let candidate = ''
  try {
    const url = new URL(input)
    if (url.hostname === 'youtu.be') candidate = url.pathname.slice(1).split('/')[0]
    if (url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com')) candidate = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop() || ''
  } catch {
    candidate = input
  }
  return /^[\w-]{11}$/.test(candidate) ? candidate : ''
}

export async function importYoutubeDraft(formData: FormData) {
  const { supabase, user } = await requireContentManager()
  const title = String(formData.get('title') ?? '').trim()
  const id = youtubeId(String(formData.get('youtubeUrl') ?? '').trim())
  if (!title || !id) redirect('/admin/youtube?error=Enter%20a%20valid%20YouTube%20URL%20and%20title')
  const slug = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video') + '-' + Date.now()
  const { error } = await supabase.from('videos').insert({ title, slug, source: 'youtube', provider_video_id: id, status: 'draft', created_by: user.id, updated_by: user.id })
  if (error) redirect('/admin/youtube?error=' + encodeURIComponent(error.message))
  redirect('/admin/videos')
}
