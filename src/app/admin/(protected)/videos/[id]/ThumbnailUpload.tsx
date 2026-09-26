'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { setThumbnail } from './actions'

export default function ThumbnailUpload({ videoId, current, videoUrl }: { videoId: string; current?: string | null; videoUrl?: string }) {
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const router=useRouter();const videoRef=useRef<HTMLVideoElement>(null)
  async function save(file:File){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return setError('Use a JPG, PNG, or WebP image.')
    if(file.size>10*1024*1024)return setError('Thumbnail must be 10 MB or smaller.')
    setBusy(true);setError('');setNotice('');const supabase=createClient();const ext=file.type==='image/jpeg'?'jpg':file.type.split('/')[1];const path=`${videoId}/${crypto.randomUUID()}.${ext}`
    const {error:uploadError}=await supabase.storage.from('thumbnails').upload(path,file,{contentType:file.type,upsert:false});if(uploadError){setBusy(false);return setError(uploadError.message)}
    const fd=new FormData();fd.set('id',videoId);fd.set('thumbnailPath',path);let result:Awaited<ReturnType<typeof setThumbnail>>
    try{result=await setThumbnail(fd)}catch{setBusy(false);setError('The update could not be confirmed. The new object was retained to avoid deleting a thumbnail the database may reference.');return}
    if(result?.error){const {error:cleanupError}=await supabase.storage.from('thumbnails').remove([path]);setBusy(false);return setError(`${result.error}${cleanupError?` New-object cleanup failed: ${cleanupError.message}`:' The new object was removed.'}`)}
    setBusy(false);setNotice(result?.warning??'Thumbnail replaced safely.');router.refresh()
  }
  async function capture(){const v=videoRef.current;if(!v||!v.videoWidth)return setError('Play or seek the video to the frame you want first.');const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d')?.drawImage(v,0,0);const blob=await new Promise<Blob|null>(resolve=>c.toBlob(resolve,'image/jpeg',0.9));if(!blob)return setError('That frame could not be captured.');await save(new File([blob],`frame-${Math.round(v.currentTime)}.jpg`,{type:'image/jpeg'}))}
  return <div className="thumb-upload"><b>Thumbnail</b><p>{videoUrl?'Upload your own image, or seek the video below and capture the exact frame you want.':current?.startsWith('https://')?'Using the official YouTube thumbnail automatically.':'Upload a 16:9 image for homepage and video cards.'}</p>{error&&<div className="login-error">{error}</div>}{notice&&<div className="success-notice">{notice}</div>}{videoUrl&&<div className="frame-picker"><video ref={videoRef} src={videoUrl} controls crossOrigin="anonymous"/><button type="button" className="secondary" disabled={busy} onClick={capture}>USE CURRENT FRAME</button></div>}{(!current?.startsWith('https://')||videoUrl)&&<label className="secondary">{busy?'UPLOADING…':'UPLOAD THUMBNAIL'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void save(f)}}/></label>}</div>
}
