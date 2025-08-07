
'use client';
import { useEffect, useRef, useState } from 'react';
import type { Region } from '@/lib/buildFilter';

export default function Viewer({ src, onDraftCommit, onDims }:{ src?:string; onDraftCommit:(r:Region)=>void; onDims:(w:number,h:number)=>void; }){
  const videoRef = useRef<HTMLVideoElement|null>(null);
  const overlayRef = useRef<HTMLDivElement|null>(null);
  const [drawing,setDrawing]=useState(false);
  const [rect,setRect]=useState<{x:number,y:number,w:number,h:number}|null>(null);
  const [draft,setDraft]=useState<Region|null>(null);

  useEffect(()=>{
    const v=videoRef.current; if(!v) return;
    const onLoaded=()=> onDims(v.videoWidth, v.videoHeight);
    v.addEventListener('loadedmetadata', onLoaded);
    return ()=> v.removeEventListener('loadedmetadata', onLoaded);
  },[onDims]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      const v=videoRef.current, el=overlayRef.current; if(!v||!rect||!el) return;
      if(e.key.toLowerCase()==='s') setDraft(p=> ({...(p??{x:rect.x,y:rect.y,w:rect.w,h:rect.h,start:0,end:0}), start:v.currentTime}));
      if(e.key.toLowerCase()==='e') setDraft(p=> ({...(p??{x:rect.x,y:rect.y,w:rect.w,h:rect.h,start:0,end:0}), end:v.currentTime}));
      if(e.key==='Enter' && draft){
        const overlayW = el.clientWidth, overlayH = el.clientHeight;
        const scaleX = v.videoWidth / overlayW, scaleY = v.videoHeight / overlayH;
        const r = {
          ...draft,
          x: Math.round(Math.min(draft.x, draft.x+draft.w) * scaleX),
          y: Math.round(Math.min(draft.y, draft.y+draft.h) * scaleY),
          w: Math.round(Math.abs(draft.w) * scaleX),
          h: Math.round(Math.abs(draft.h) * scaleY),
        };
        if (r.end < r.start) { const t=r.start; r.start=r.end; r.end=t; }
        onDraftCommit(r); setRect(null); setDraft(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  },[rect,draft,onDraftCommit]);

  const mousePos=(e:React.MouseEvent)=>{
    const el=overlayRef.current; if(!el) return {x:0,y:0};
    const R=el.getBoundingClientRect();
    return {x:e.clientX-R.left, y:e.clientY-R.top};
  };

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="relative bg-black rounded-xl overflow-hidden border border-border">
        <video ref={videoRef} src={src} controls className="w-full h-auto" />
        <div
          ref={overlayRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={(e)=>{ setDrawing(true); const {x,y}=mousePos(e); setRect({x,y,w:0,h:0}); setDraft(null);}}
          onMouseMove={(e)=>{ if(!drawing||!rect) return; const {x,y}=mousePos(e); setRect(p=> p?({ ...p, w: x - p.x, h: y - p.y }):null); }}
          onMouseUp={()=> setDrawing(false)}
        >
          {rect && (
            <div className="pointer-events-none" style={{
              position:'absolute',
              left: Math.min(rect.x, rect.x+rect.w),
              top: Math.min(rect.y, rect.y+rect.h),
              width: Math.abs(rect.w),
              height: Math.abs(rect.h),
              border: '2px solid #febb3b',
              background: 'rgba(254,187,59,0.2)',
            }}/>
          )}
        </div>
      </div>
    </div>
  );
}
