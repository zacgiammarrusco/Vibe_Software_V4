'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';
import { useStudioStore, strengthColorMap } from '@/lib/studioStore';
import type { RedactionEffect, RedactionStrength } from '@/lib/types';

type SidebarProps = {
  onExport: () => void;
};

const effectLabels: Record<RedactionEffect, string> = {
  blur: 'Blur',
  pixelate: 'Pixelate',
  blackout: 'Blackout',
};

const formatTime = (seconds: number) => {
  const num = Math.max(0, seconds);
  const m = Math.floor(num / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(num % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
};

function RedactionManager() {
  const redactions = useStudioStore((state) => state.redactions);
  const selectedId = useStudioStore((state) => state.selectedRedactionId);
  const selectRedaction = useStudioStore((state) => state.selectRedaction);
  const updateRedaction = useStudioStore((state) => state.updateRedaction);
  const toggleRedaction = useStudioStore((state) => state.toggleRedaction);
  const removeRedaction = useStudioStore((state) => state.removeRedaction);
  const setCurrentTime = useStudioStore((state) => state.setCurrentTime);

  const totals = useMemo(() => {
    return redactions.reduce(
      (acc, red) => {
        acc.total += 1;
        acc[red.effect] = (acc[red.effect] ?? 0) + 1;
        return acc;
      },
      { total: 0, blur: 0, pixelate: 0, blackout: 0 } as Record<'total' | RedactionEffect, number>,
    );
  }, [redactions]);

  const handleStrengthChange = (id: string, strength: RedactionStrength, effect: RedactionEffect) => {
    updateRedaction(id, {
      strength,
      color: effect === 'blackout' ? undefined : strengthColorMap[strength],
    });
  };

  const handleEffectChange = (id: string, effect: RedactionEffect, currentStrength: RedactionStrength, color?: string) => {
    if (effect === 'blackout') {
      updateRedaction(id, { effect, color: color ?? '#000000' });
    } else {
      updateRedaction(id, { effect, color: strengthColorMap[currentStrength] });
    }
  };

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-sub">Redaction Manager</h2>
        <div className="text-xs text-sub">
          {totals.total} total • {totals.blur} blur • {totals.pixelate} pixelate • {totals.blackout} blackout
        </div>
      </div>
      <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2">
        {redactions.length === 0 ? (
          <div className="text-xs text-sub/80">No redactions yet. Draw an area in the viewer and press Enter to add one.</div>
        ) : (
          redactions.map((redaction) => (
            <div
              key={redaction.id}
              className={clsx('rounded-xl border px-3 py-3 bg-panel transition shadow-sm', {
                'border-accent/80 shadow-accent/20': redaction.id === selectedId,
                'border-border': redaction.id !== selectedId,
                'opacity-60': !redaction.enabled,
              })}
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  value={redaction.label}
                  onChange={(e) => updateRedaction(redaction.id, { label: e.target.value })}
                  className="flex-1 bg-panel2/40 border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  className={clsx('text-xs px-2 py-1 rounded-md border transition', redaction.enabled ? 'border-emerald-500/70 text-emerald-300 bg-emerald-500/10' : 'border-border text-sub')}
                  onClick={() => toggleRedaction(redaction.id)}
                >
                  {redaction.enabled ? 'Active' : 'Off'}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="text-sub uppercase tracking-wide">Effect</span>
                  <select
                    value={redaction.effect}
                    onChange={(e) => handleEffectChange(redaction.id, e.target.value as RedactionEffect, redaction.strength, redaction.color)}
                    className="bg-panel2 border border-border rounded-md px-2 py-1"
                  >
                    {Object.entries(effectLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {redaction.effect !== 'blackout' ? (
                  <label className="flex flex-col gap-1">
                    <span className="text-sub uppercase tracking-wide">Strength</span>
                    <select
                      value={redaction.strength}
                      onChange={(e) => handleStrengthChange(redaction.id, e.target.value as RedactionStrength, redaction.effect)}
                      className="bg-panel2 border border-border rounded-md px-2 py-1"
                    >
                      <option value="soft">Soft</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </label>
                ) : (
                  <label className="flex flex-col gap-1">
                    <span className="text-sub uppercase tracking-wide">Color</span>
                    <input
                      type="color"
                      value={redaction.color ?? '#000000'}
                      onChange={(e) => updateRedaction(redaction.id, { color: e.target.value })}
                      className="h-9 w-full rounded border border-border"
                    />
                  </label>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-sub">
                <div>
                  {formatTime(redaction.start)} – {formatTime(redaction.end)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => {
                      setCurrentTime(redaction.start);
                      selectRedaction(redaction.id);
                    }}
                  >
                    Seek
                  </button>
                  <button
                    type="button"
                    className="text-rose-400 hover:text-rose-300"
                    onClick={() => removeRedaction(redaction.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AnnotationPanel() {
  const annotations = useStudioStore((state) => state.annotations);
  const redactions = useStudioStore((state) => state.redactions);
  const updateAnnotation = useStudioStore((state) => state.updateAnnotation);
  const removeAnnotation = useStudioStore((state) => state.removeAnnotation);
  const setCurrentTime = useStudioStore((state) => state.setCurrentTime);
  const selectRedaction = useStudioStore((state) => state.selectRedaction);

  const redactionLookup = useMemo(() => {
    const map = new Map<string, string>();
    redactions.forEach((red) => map.set(red.id, red.label));
    return map;
  }, [redactions]);

  if (annotations.length === 0) {
    return (
      <section className="card p-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-sub mb-2">Annotations</h2>
        <div className="text-xs text-sub/80">Add notes while you redact to keep track of context.</div>
      </section>
    );
  }

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-sub">Annotations</h2>
        <span className="text-xs text-sub">{annotations.length}</span>
      </div>
      <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
        {annotations.map((annotation) => (
          <div key={annotation.id} className="rounded-xl border border-border bg-panel p-3">
            <div className="flex items-center justify-between text-xs text-sub">
              <span className="font-mono text-accent">{formatTime(annotation.time)}</span>
              {annotation.redactionId && (
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => {
                    setCurrentTime(annotation.time);
                    selectRedaction(annotation.redactionId);
                  }}
                >
                  {redactionLookup.get(annotation.redactionId) ?? 'View'}
                </button>
              )}
            </div>
            <textarea
              value={annotation.text}
              onChange={(e) => updateAnnotation(annotation.id, { text: e.target.value })}
              className="mt-2 w-full h-16 resize-none rounded-lg bg-panel2 border border-border px-2 py-1 text-sm"
            />
            <div className="flex items-center justify-end text-xs mt-2">
              <button
                type="button"
                className="text-rose-400 hover:text-rose-300"
                onClick={() => removeAnnotation(annotation.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExportPanel({ onExport }: SidebarProps) {
  const video = useStudioStore((state) => state.video);
  const redactions = useStudioStore((state) => state.redactions);
  const exportSettings = useStudioStore((state) => state.exportSettings);
  const setExportSettings = useStudioStore((state) => state.setExportSettings);
  const processing = useStudioStore((state) => state.processing);

  const exporting = processing.state === 'initializing' || processing.state === 'rendering';
  const exportDisabled = !video || redactions.length === 0 || exporting;

  const filenameWithExtension = exportSettings.filename.endsWith(`.${exportSettings.format}`)
    ? exportSettings.filename
    : `${exportSettings.filename}.${exportSettings.format}`;

  return (
    <section className="card p-4 space-y-3">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-sub">Export</h2>
      <div className="space-y-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-sub uppercase tracking-wide">File name</span>
          <input
            type="text"
            value={exportSettings.filename}
            onChange={(e) => setExportSettings({ filename: e.target.value })}
            className="px-2 py-1.5 rounded-lg bg-panel border border-border focus:outline-none focus:border-accent"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-sub uppercase tracking-wide">Preset</span>
            <select
              value={exportSettings.preset}
              onChange={(e) => setExportSettings({ preset: e.target.value as typeof exportSettings.preset })}
              className="px-2 py-1.5 rounded-lg bg-panel border border-border"
            >
              <option value="veryfast">Very Fast</option>
              <option value="faster">Faster</option>
              <option value="medium">Medium</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-sub uppercase tracking-wide">CRF</span>
            <input
              type="number"
              min={10}
              max={35}
              value={exportSettings.crf}
              onChange={(e) => setExportSettings({ crf: Number(e.target.value) })}
              className="px-2 py-1.5 rounded-lg bg-panel border border-border"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-sub">
          <input
            type="checkbox"
            checked={exportSettings.includeAudio}
            onChange={(e) => setExportSettings({ includeAudio: e.target.checked })}
            className="accent-accent"
          />
          Include original audio track
        </label>
      </div>
      <button
        type="button"
        className="w-full bg-accent/90 hover:bg-accent text-black font-semibold py-2 rounded-lg disabled:opacity-40"
        onClick={onExport}
        disabled={exportDisabled}
      >
        {exporting ? 'Rendering…' : `Export ${filenameWithExtension}`}
      </button>
      <div className="text-xs text-sub">
        {processing.state === 'idle' && 'Ready to export.'}
        {processing.state === 'initializing' && (processing.message ?? 'Loading FFmpeg…')}
        {processing.state === 'rendering' && `Encoding (${Math.round(processing.progress)}%)…`}
        {processing.state === 'complete' && `Done! Saved as ${processing.filename}.`}
        {processing.state === 'error' && (
          <span className="text-rose-400">{processing.message ?? 'Something went wrong.'}</span>
        )}
      </div>
    </section>
  );
}

export default function AssistantsPanel({ onExport }: SidebarProps) {
  return (
    <aside className="sidebar w-80 p-4 hidden lg:flex flex-col gap-4">
      <RedactionManager />
      <AnnotationPanel />
      <ExportPanel onExport={onExport} />
    </aside>
  );
}
