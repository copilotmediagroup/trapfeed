'use server'

import { redirect } from 'next/navigation'
import { requireContentManager } from '@/lib/auth'

export async function createUploadDraft(formData: FormData) {
  const { supabase, user } = await requireContentManager()
  const title = String(formData.get('title') ?? '').trim()
  const videoPath = String(formData.get('videoPath') ?? '').trim()
  if (!title || !videoPath.startsWith(`${user.id}/`)) redirect('/admin/upload?error=Title%20and%20a%20valid%20storage%20path%20are%20required')
  const slug = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video') + '-' + Date.now()
  const { error } = await supabase.from('videos').insert({ title, slug, source: 'upload', video_path: videoPath, status: 'draft', created_by: user.id, updated_by: user.id })
  if (error) redirect('/admin/upload?error=' + encodeURIComponent(error.message))
  redirect('/admin/videos')
}
