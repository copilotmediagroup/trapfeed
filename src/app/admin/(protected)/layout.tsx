import Link from 'next/link'
import { AdminNav } from '@/components/admin/AdminNav'
import { requireContentManager } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireContentManager()

  return <div className="admin-shell">
    <aside className="admin-side">
      <Link href="/" className="brand">TRAP<span>FEED</span></Link>
      <small>ADMIN CONTROL</small>
      <AdminNav />
      <Link href="/" className="back-site">← View public site</Link>
    </aside>
    <div className="admin-main">{children}</div>
  </div>
}
