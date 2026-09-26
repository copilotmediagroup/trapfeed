'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutDashboard, Link2, LogOut, Tags, Upload, Video } from 'lucide-react'
import { logout } from '@/app/admin/(protected)/actions'

const items = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/videos', label: 'Videos', icon: Video },
  { href: '/admin/upload', label: 'Upload', icon: Upload },
  { href: '/admin/youtube', label: 'YouTube Import', icon: Link2 },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/homepage', label: 'Homepage', icon: Home },
]

export function AdminNav() {
  const pathname = usePathname()

  return <nav className="admin-nav" aria-label="Admin navigation">
    {items.map(({ href, label, icon: Icon, exact }) => {
      const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
      return <Link href={href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined} key={href}><Icon />{label}</Link>
    })}
    <form action={logout}><button type="submit"><LogOut />Log out</button></form>
  </nav>
}
