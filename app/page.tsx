
'use client';
import { useEffect, useRef, useState } from 'react';
import TopBar from '@/components/TopBar';
import Viewer from '@/components/Viewer';
import AssistantsPanel from '@/components/AssistantsPanel';
import Timeline from '@/components/Timeline';
import { buildFilter, type Region } from '@/lib/buildFilter';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export default function Page(){
  const [file,setFile]=useState<File|null>(null);
  const [videoUrl,setVideoUrl]=useState<string|undefined>(undefined);
  const [regions,setRegions]=useState<Region[]>([]);
  const [dims,setDims]=useState<{w:number,h:number}>({w:1280,h:720});
  const [processing,setProcessing]=useState(false);
  const ffmpegRef = useRef<FFmpeg|null>(null);

  useEffect(()=>{
    if(file){ const url=URL.createObjectURL(file); setVideoUrl(url); return ()=>URL.revokeObjectURL(url); }
    setVideoUrl(undefined);
  },[file]);

  const onDraftCommit = (r:Region)=> setRegions(p=>[...p, r]);

  const loadFFmpeg = async ()=>{
    if(ffmpegRef.current) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const onExport = async ()=>{
    if(!file || regions.length===0) return;
    setProcessing(true);
    try{
      const ffmpeg = await loadFFmpeg();
      const data = new Uint8Array(await file.arrayBuffer());
      await ffmpeg.writeFile('input.mp4', data);
      const filter = buildFilter(regions, dims.w, dims.h);
      const args = ['-i','input.mp4','-filter_complex',filter,'-map','[outv]','-map','0:a?','-c:v','libx264','-preset','veryfast','-crf','23','-movflags','faststart','out.mp4'];
      await ffmpeg.exec(args);
      const out = await ffmpeg.readFile('out.mp4');
      const blob = new Blob([out], { type:'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='redacted.mp4'; a.click();
      URL.revokeObjectURL(url);
    }catch(e){ console.error(e); alert('Export failed. Try a shorter clip or fewer regions.'); }
    finally{ setProcessing(false); }
  };

  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen">
      <TopBar onUpload={setFile} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-0">
        <div className="p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="kb">File: {file?.name || '—'}</div>
            <button onClick={onExport} className="btn disabled:opacity-50" disabled={!file || regions.length===0 || processing}>Export</button>
          </div>
          <Viewer src={videoUrl} onDraftCommit={onDraftCommit} onDims={(w,h)=>setDims({w,h})} />
        </div>
        <AssistantsPanel />
      </div>
      <div className="p-3">
        <Timeline regions={regions} />
      </div>
    </div>
  );
}
