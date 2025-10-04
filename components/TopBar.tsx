'use client';

import React from 'react';
import { useStudioStore } from '@/lib/studioStore';
import { useProcessing } from '@/lib/studioStore';

type TopBarProps = {
  onUpload: (file: File) => void;
  onReset: () => void;
  onExport: () => void;
};

export default function TopBar({ onUpload, onReset, onExport }: TopBarProps) {
  const video = useStudioStore((state) => state.video);
  const redactions = useStudioStore((state) => state.redactions);
  const processing = useProcessing();
  const exporting = processing.state === 'initializing' || processing.state === 'rendering';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
      event.target.value = '';
    }
  };

  return (
    <header className="toolbar px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold">Vibe Redaction Studio</h1>
          <div className="kb hidden md:flex items-center gap-3">
            <span>Draw area then use</span>
            <code className="rounded bg-panel2 px-2 py-0.5">S</code>
            <code className="rounded bg-panel2 px-2 py-0.5">E</code>
            <code className="rounded bg-panel2 px-2 py-0.5">Enter</code>
          </div>
        </div>
        {video ? (
          <div className="hidden md:flex items-center gap-3 text-sm text-sub">
            <span className="font-medium text-text">{video.name}</span>
            <span>• {Math.round(video.duration)}s</span>
            <span>• {video.width}×{video.height}</span>
            <span>• {redactions.length} redactions</span>
          </div>
        ) : (
          <div className="hidden md:block text-sm text-sub">Upload a clip to begin annotating.</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input id="file" type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
        <label htmlFor="file" className="btn cursor-pointer">Upload</label>
        <button
          type="button"
          className="btn"
          onClick={onReset}
          disabled={!video || exporting}
        >
          Reset
        </button>
        <button
          type="button"
          className="btn bg-accent/90 text-black hover:bg-accent disabled:opacity-40"
          onClick={onExport}
          disabled={!video || redactions.length === 0 || exporting}
        >
          {exporting ? 'Rendering…' : 'Export'}
        </button>
      </div>
    </header>
  );
}
