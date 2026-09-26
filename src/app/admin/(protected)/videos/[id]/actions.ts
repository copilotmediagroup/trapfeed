'use server'

import { redirect } from 'next/navigation'
import { requireContentManager } from '@/lib/auth'

export async function updateVideo(formData: FormData) {
  const { supabase, user } = await requireContentManager()
  const id = String(formData.get('id') ?? '')
  const intent = String(formData.get('intent') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  if (!id || !title || !['publish', 'draft', 'schedule'].includes(intent)) redirect('/admin/videos?error=Invalid%20video%20update')
  const base = { title, description: String(formData.get('description') ?? '').trim() || null, is_featured: formData.get('featured') === 'on', category_id: String(formData.get('categoryId') || '') || null, updated_by: user.id }
  let patch: Record<string, unknown> = { ...base }
  if (intent === 'publish') patch = { ...patch, status: 'published', published_at: new Date().toISOString(), scheduled_for: null }
  if (intent === 'draft') patch = { ...patch, status: 'draft', published_at: null, scheduled_for: null }
  if (intent === 'schedule') {
    const when = String(formData.get('scheduledFor') ?? '')
    const scheduled = new Date(when)
    if (!when || Number.isNaN(scheduled.getTime())) redirect(`/admin/videos/${id}?error=Choose%20a%20valid%20schedule%20time`)
    patch = { ...patch, status: 'scheduled', scheduled_for: scheduled.toISOString(), published_at: null }
  }
  const { error } = await supabase.from('videos').update(patch).eq('id', id)
  if (error) redirect(`/admin/videos/${id}?error=${encodeURIComponent(error.message)}`)
  redirect('/admin/videos')
}

export async function setThumbnail(formData: FormData) {
  const { supabase, user } = await requireContentManager()
  const id = String(formData.get('id') ?? '')
  const thumbnailPath = String(formData.get('thumbnailPath') ?? '')
  if (!id || !thumbnailPath.startsWith(`${id}/`)) redirect(`/admin/videos/${id}?error=Invalid%20thumbnail%20path`)
  const { error } = await supabase.from('videos').update({ thumbnail_path: thumbnailPath, updated_by: user.id }).eq('id', id)
  if (error) redirect(`/admin/videos/${id}?error=${encodeURIComponent(error.message)}`)
  redirect(`/admin/videos/${id}`)
}
