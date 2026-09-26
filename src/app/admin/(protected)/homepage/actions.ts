'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireContentManager } from '@/lib/auth'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function fail(message: string): never {
  redirect(`/admin/homepage?error=${encodeURIComponent(message)}`)
}

function sectionInput(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim()
  const key = String(formData.get('slug') ?? '').trim().toLowerCase()
  const sectionType = String(formData.get('sectionType') ?? 'grid')
  const sortOrder = Number(formData.get('sortOrder'))
  if (!title || title.length > 100 || !slug.test(key) || !['hero', 'grid', 'rail'].includes(sectionType) || !Number.isSafeInteger(sortOrder)) {
    fail('Enter a title, valid key, section type, and whole-number order')
  }
  return { title, slug: key, section_type: sectionType, sort_order: sortOrder, is_active: formData.get('isActive') === 'on' }
}

function validId(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? '')
  if (!uuid.test(value)) fail(`Invalid ${name}`)
  return value
}

function refresh() {
  revalidatePath('/admin/homepage')
  revalidatePath('/')
}

export async function createSection(formData: FormData) {
  const { supabase } = await requireContentManager()
  const { error } = await supabase.from('homepage_sections').insert(sectionInput(formData))
  if (error) fail(error.message)
  refresh()
}

export async function updateSection(formData: FormData) {
  const { supabase } = await requireContentManager()
  const id = validId(formData, 'id')
  const { error } = await supabase.from('homepage_sections').update(sectionInput(formData)).eq('id', id)
  if (error) fail(error.message)
  refresh()
}

export async function addVideo(formData: FormData) {
  const { supabase } = await requireContentManager()
  const sectionId = validId(formData, 'sectionId')
  const videoId = validId(formData, 'videoId')
  const sortOrder = Number(formData.get('sortOrder'))
  if (!Number.isSafeInteger(sortOrder)) fail('Video order must be a whole number')
  const { data: video } = await supabase.from('videos').select('id').eq('id', videoId).eq('status', 'published').lte('published_at', new Date().toISOString()).maybeSingle()
  if (!video) fail('Only currently published videos can be placed on the homepage')
  const { error } = await supabase.from('homepage_section_videos').insert({ section_id: sectionId, video_id: videoId, sort_order: sortOrder })
  if (error) fail(error.message)
  refresh()
}

export async function updatePlacement(formData: FormData) {
  const { supabase } = await requireContentManager()
  const sectionId = validId(formData, 'sectionId')
  const videoId = validId(formData, 'videoId')
  const sortOrder = Number(formData.get('sortOrder'))
  if (!Number.isSafeInteger(sortOrder)) fail('Video order must be a whole number')
  const { error } = await supabase.from('homepage_section_videos').update({ sort_order: sortOrder }).eq('section_id', sectionId).eq('video_id', videoId)
  if (error) fail(error.message)
  refresh()
}

export async function removePlacement(formData: FormData) {
  const { supabase } = await requireContentManager()
  const sectionId = validId(formData, 'sectionId')
  const videoId = validId(formData, 'videoId')
  const { error } = await supabase.from('homepage_section_videos').delete().eq('section_id', sectionId).eq('video_id', videoId)
  if (error) fail(error.message)
  refresh()
}
