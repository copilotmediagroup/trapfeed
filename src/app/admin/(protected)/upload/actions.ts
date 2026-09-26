'use server'

import { requireContentManager } from '@/lib/auth'

const uploadPath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}-[a-zA-Z0-9._-]+$/

export async function createUploadDraft(formData: FormData) {
  const { supabase, user } = await requireContentManager()
  const title = String(formData.get('title') ?? '').trim()
  const videoPath = String(formData.get('videoPath') ?? '').trim()
  if (!title || title.length > 180 || !uploadPath.test(videoPath) || !videoPath.startsWith(`${user.id}/`)) return { error: 'Title and a valid newly uploaded Storage path are required.' }
  const slug = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video') + '-' + Date.now()
  const { error } = await supabase.from('videos').insert({ title, slug, source: 'upload', video_path: videoPath, status: 'draft', created_by: user.id, updated_by: user.id })
  if (error) return { error: `The upload completed, but the draft could not be registered: ${error.message}` }
  return { success: true }
}
