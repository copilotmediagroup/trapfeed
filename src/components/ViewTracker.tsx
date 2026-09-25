'use client';
import {useEffect} from 'react';import {createClient} from '@/lib/supabase/client';
export function ViewTracker({videoId}:{videoId:string}){useEffect(()=>{let id=localStorage.getItem('trapfeed-anonymous-id');if(!id){id=crypto.randomUUID();localStorage.setItem('trapfeed-anonymous-id',id)}const supabase=createClient();void supabase.rpc('record_video_play',{p_video_id:videoId,p_anonymous_id:id})},[videoId]);return null}
