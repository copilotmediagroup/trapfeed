import { createCategory, updateCategory } from './actions'
import { requireContentManager } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const { supabase } = await requireContentManager()
  const { data: categories } = await supabase.from('categories').select('id,name,slug,description,sort_order,is_active').order('sort_order').order('name')

  return <main className="admin-sub">
    <div className="admin-top"><div><p>CONTENT TAXONOMY</p><h1>Categories</h1></div></div>
    {error && <div className="login-error category-error">{error}</div>}
    <section className="category-layout">
      <form action={createCategory} className="cms-form category-create">
        <h2>Create category</h2>
        <p>Slugs are stable public keys. Use lowercase letters, numbers, and hyphens.</p>
        <label>Name<input name="name" required maxLength={80} /></label>
        <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
        <label>Description<textarea name="description" /></label>
        <label>Sort order<input name="sortOrder" type="number" step="1" defaultValue="0" required /></label>
        <label className="check"><input name="isActive" type="checkbox" defaultChecked /> Active</label>
        <button className="primary" type="submit">CREATE CATEGORY</button>
      </form>
      <section className="category-list">
        {!categories?.length && <div className="admin-empty"><h3>No categories yet</h3><p>Create the first category for the video editor.</p></div>}
        {categories?.map(category => <form action={updateCategory} className="category-card" key={category.id}>
          <input type="hidden" name="id" value={category.id} />
          <div className="category-card-head"><strong>{category.name}</strong><span className={category.is_active ? 'status-active' : 'status-inactive'}>{category.is_active ? 'ACTIVE' : 'INACTIVE'}</span></div>
          <div className="category-fields">
            <label>Name<input name="name" defaultValue={category.name} required maxLength={80} /></label>
            <label>Slug<input name="slug" defaultValue={category.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
            <label className="category-description">Description<input name="description" defaultValue={category.description ?? ''} /></label>
            <label>Sort order<input name="sortOrder" type="number" step="1" defaultValue={category.sort_order} required /></label>
          </div>
          <div className="category-card-actions"><label className="check"><input name="isActive" type="checkbox" defaultChecked={category.is_active} /> Active</label><button className="secondary" type="submit">SAVE CHANGES</button></div>
        </form>)}
      </section>
    </section>
  </main>
}
