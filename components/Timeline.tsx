
'use client';
import type { Region } from '@/lib/buildFilter';

export default function Timeline({ duration = 30, regions }:{ duration?:number; regions:Region[]; }){
  const pxPerSec = 40;
  const width = Math.max(600, duration * pxPerSec);
  const rows = [0,1,2];
  return (
    <div className="card p-3">
      <div className="text-sm mb-2">Tracks</div>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]" style={{ width }}>
          {rows.map((rIdx)=> (
            <div className="relative h-10 bg-panel2 border border-border rounded-md mb-2" key={rIdx}>
              {regions.filter((_,i)=> i % 3 === rIdx).map((seg, i)=>{
                const left = seg.start * pxPerSec;
                const w = Math.max(6, (seg.end - seg.start) * pxPerSec);
                return <div key={i} className="absolute top-0 h-10 bg-accent/70 rounded-md" style={{ left, width:w }} />;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
