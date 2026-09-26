'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as tus from 'tus-js-client'
import { createClient } from '@/lib/supabase/client'
import { createUploadDraft } from './actions'

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null); const [title, setTitle] = useState(''); const [progress, setProgress] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const router = useRouter()
  async function upload() {
    if (!file || !title.trim()) return setError('Choose a video and enter a title.')
    setBusy(true); setError(''); const supabase = createClient(); const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); return setError('Your admin session expired. Sign in again.') }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-'); const path = `${session.user.id}/${crypto.randomUUID()}-${safe}`; const endpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('.supabase.co', '.storage.supabase.co')}/storage/v1/upload/resumable`
    const task = new tus.Upload(file, { endpoint, retryDelays: [0, 3000, 5000, 10000, 20000], headers: { authorization: `Bearer ${session.access_token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! }, uploadDataDuringCreation: true, removeFingerprintOnSuccess: true, chunkSize: 6 * 1024 * 1024, metadata: { bucketName: 'videos', objectName: path, contentType: file.type || 'video/mp4', cacheControl: '3600' }, onError(e) { setBusy(false); setError(e.message) }, onProgress(done, total) { setProgress(Math.round(done / total * 100)) }, async onSuccess() { const fd = new FormData(); fd.set('title', title); fd.set('videoPath', path); let result: Awaited<ReturnType<typeof createUploadDraft>>; try { result = await createUploadDraft(fd) } catch { setBusy(false); setError('Draft registration could not be confirmed. The object was retained to avoid deleting media that may already be registered.'); return } if (result?.error) { const { error: cleanupError } = await supabase.storage.from('videos').remove([path]); setBusy(false); setError(`${result.error}${cleanupError ? ` Cleanup also failed: ${cleanupError.message}` : ' The newly uploaded object was removed.'}`); return } router.push('/admin/videos'); router.refresh() } })
    const previous = await task.findPreviousUploads(); if (previous.length) task.resumeFromPreviousUpload(previous[0]); task.start()
  }
  return <div className="cms-form"><h2>Upload authorized video</h2><p>Large files upload directly to TrapFeed Storage using resumable chunks. If draft registration fails, only the path generated for this upload is removed.</p>{error && <div className="login-error">{error}</div>}<label>Video title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title" /></label><label>Video file<input type="file" accept="video/mp4,video/webm" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>{busy && <div className="upload-progress"><span style={{ width: `${progress}%` }} /><b>{progress}%</b></div>}<button type="button" className="primary" disabled={busy} onClick={upload}>{busy ? 'UPLOADING…' : 'UPLOAD & CREATE DRAFT'}</button></div>
}
