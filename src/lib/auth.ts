import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AppRole = 'viewer' | 'editor' | 'admin'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/admin/login')

  return { supabase, user }
}

export async function requireContentManager() {
  const { supabase, user } = await requireUser()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile || !['editor', 'admin'].includes(profile.role)) redirect('/')

  return { supabase, user, profile: profile as { role: AppRole } }
}

export async function requireAdmin() {
  const context = await requireContentManager()
  if (context.profile.role !== 'admin') redirect('/admin')
  return context
}
