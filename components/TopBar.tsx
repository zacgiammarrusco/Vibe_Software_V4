
'use client';
export default function TopBar({ onUpload }:{ onUpload:(f:File)=>void }){
  return (
    <div className="toolbar px-3 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="font-semibold">Video Redaction</div>
        <div className="kb hidden md:block">Draw → S (start), E (end), Enter (add)</div>
      </div>
      <div className="flex items-center gap-2">
        <input id="file" type="file" accept="video/*" className="hidden" onChange={(e)=>{
          const f=e.target.files?.[0]; if(f) onUpload(f);
        }}/>
        <label htmlFor="file" className="btn cursor-pointer">Upload</label>
      </div>
    </div>
  );
}
