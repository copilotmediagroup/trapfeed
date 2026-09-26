'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireContentManager } from '@/lib/auth'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function categoryInput(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase()
  const description = String(formData.get('description') ?? '').trim() || null
  const rawOrder = String(formData.get('sortOrder') ?? '0')
  const sort_order = Number(rawOrder)
  const is_active = formData.get('isActive') === 'on'

  if (!name || !slugPattern.test(slug) || !Number.isInteger(sort_order)) {
    redirect('/admin/categories?error=Enter%20a%20name%2C%20valid%20slug%2C%20and%20whole-number%20sort%20order')
  }

  return { name, slug, description, sort_order, is_active }
}

export async function createCategory(formData: FormData) {
  const { supabase } = await requireContentManager()
  const input = categoryInput(formData)
  const { error } = await supabase.from('categories').insert(input)
  if (error) redirect(`/admin/categories?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/admin/categories')
  revalidatePath('/')
}

export async function updateCategory(formData: FormData) {
  const { supabase } = await requireContentManager()
  const id = String(formData.get('id') ?? '')
  if (!id) redirect('/admin/categories?error=Missing%20category')
  const input = categoryInput(formData)
  const { error } = await supabase.from('categories').update(input).eq('id', id)
  if (error) redirect(`/admin/categories?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/admin/categories')
  revalidatePath('/')
}
