'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useStudioStore } from '@/lib/studioStore';
import type { RedactionEffect, RedactionStrength } from '@/lib/types';

type DraftRect = { x: number; y: number; w: number; h: number };

const effectOptions: { value: RedactionEffect; label: string }[] = [
  { value: 'blur', label: 'Blur' },
  { value: 'pixelate', label: 'Pixelate' },
  { value: 'blackout', label: 'Blackout' },
];

const strengthOptions: { value: RedactionStrength; label: string }[] = [
  { value: 'soft', label: 'Soft' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const annotationColors: Record<RedactionEffect, string> = {
  blur: '#febb3b',
  pixelate: '#38bdf8',
  blackout: '#f87171',
};

const formatTime = (seconds: number | null | undefined) => {
  if (seconds == null || Number.isNaN(seconds)) return '--:--';
  const num = Math.max(0, seconds);
  const m = Math.floor(num / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(num % 60)
    .toString()
    .padStart(2, '0');
  const ms = Math.floor((num % 1) * 100)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}.${ms}`;
};

export default function Viewer() {
  const video = useStudioStore((state) => state.video);
  const currentTime = useStudioStore((state) => state.currentTime);
  const playing = useStudioStore((state) => state.playing);
  const redactions = useStudioStore((state) => state.redactions);
  const selectedRedactionId = useStudioStore((state) => state.selectedRedactionId);
  const addRedaction = useStudioStore((state) => state.addRedaction);
  const addAnnotation = useStudioStore((state) => state.addAnnotation);
  const setCurrentTime = useStudioStore((state) => state.setCurrentTime);
  const setPlaying = useStudioStore((state) => state.setPlaying);
  const selectRedaction = useStudioStore((state) => state.selectRedaction);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [rect, setRect] = useState<DraftRect | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [effect, setEffect] = useState<RedactionEffect>('blur');
  const [strength, setStrength] = useState<RedactionStrength>('medium');
  const [color, setColor] = useState('#000000');
  const [overlaySize, setOverlaySize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const updateSize = () => setOverlaySize({ w: el.clientWidth, h: el.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [video?.url]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;
    const handleTimeUpdate = () => setCurrentTime(media.currentTime);
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('seeking', handleTimeUpdate);
    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('seeking', handleTimeUpdate);
    };
  }, [setCurrentTime, setPlaying]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;
    if (playing && media.paused) {
      void media.play().catch(() => setPlaying(false));
    }
    if (!playing && !media.paused) {
      media.pause();
    }
  }, [playing, setPlaying]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media || Math.abs(media.currentTime - currentTime) < 0.05) return;
    media.currentTime = currentTime;
  }, [currentTime]);

  const resetDraft = useCallback(() => {
    setRect(null);
    setStartTime(null);
    setEndTime(null);
    setLabel('');
    setNote('');
    setColor('#000000');
  }, []);

  const mousePosition = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const overlay = overlayRef.current;
    if (!overlay) return { x: 0, y: 0 };
    const bounds = overlay.getBoundingClientRect();
    return {
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    };
  };

  const commitDraft = useCallback(() => {
    const overlay = overlayRef.current;
    const media = videoRef.current;
    if (!overlay || !media || !video || !rect || startTime == null || endTime == null) return;
    const start = Math.min(startTime, endTime);
    const end = Math.max(startTime, endTime);
    if (end - start < 0.033) return;
    const scaleX = video.width ? video.width / overlay.clientWidth : 1;
    const scaleY = video.height ? video.height / overlay.clientHeight : 1;
    const width = Math.round(Math.abs(rect.w) * scaleX);
    const height = Math.round(Math.abs(rect.h) * scaleY);
    if (width <= 0 || height <= 0) return;
    const x = Math.round(Math.min(rect.x, rect.x + rect.w) * scaleX);
    const y = Math.round(Math.min(rect.y, rect.y + rect.h) * scaleY);
    const id = addRedaction({
      region: { x, y, width, height },
      start,
      end,
      effect,
      strength,
      color: effect === 'blackout' ? color : undefined,
      label: label || undefined,
    });
    if (note.trim()) {
      const noteColor = effect === 'blackout' ? color : annotationColors[effect];
      addAnnotation({ time: start, text: note.trim(), color: noteColor, redactionId: id });
    }
    resetDraft();
    selectRedaction(id);
  }, [addAnnotation, addRedaction, color, effect, note, rect, resetDraft, selectRedaction, startTime, strength, video, endTime, label]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const media = videoRef.current;
      const overlay = overlayRef.current;
      if (!media || !rect || !overlay) return;
      if (e.key.toLowerCase() === 's') {
        setStartTime(media.currentTime);
      }
      if (e.key.toLowerCase() === 'e') {
        setEndTime(media.currentTime);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        commitDraft();
      }
      if (e.key === 'Escape') {
        resetDraft();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rect, commitDraft, resetDraft]);

  const overlayElements = useMemo(() => {
    if (!video || overlaySize.w === 0 || overlaySize.h === 0) return [];
    const scaleX = overlaySize.w / video.width;
    const scaleY = overlaySize.h / video.height;
    return redactions.map((redaction) => {
      const isActive = currentTime >= redaction.start && currentTime <= redaction.end;
      const left = redaction.region.x * scaleX;
      const top = redaction.region.y * scaleY;
      const width = redaction.region.width * scaleX;
      const height = redaction.region.height * scaleY;
      return {
        id: redaction.id,
        label: redaction.label,
        left,
        top,
        width,
        height,
        color: redaction.color,
        active: isActive,
        enabled: redaction.enabled,
      };
    });
  }, [redactions, video, overlaySize, currentTime]);

  if (!video) {
    return (
      <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-xl bg-panel text-sub">
        Upload a video to start redacting.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="relative bg-black rounded-xl overflow-hidden border border-border">
        <video ref={videoRef} src={video.url} controls className="w-full h-auto max-h-[70vh]" />
        <div
          ref={overlayRef}
          className={clsx('absolute inset-0', rect ? 'cursor-crosshair' : 'cursor-crosshair')}
          onMouseDown={(e) => {
            const { x, y } = mousePosition(e);
            setDrawing(true);
            setRect({ x, y, w: 0, h: 0 });
            setStartTime(null);
            setEndTime(null);
            setLabel('');
            setNote('');
          }}
          onMouseMove={(e) => {
            if (!drawing || !rect) return;
            const { x, y } = mousePosition(e);
            setRect((prev) => (prev ? { ...prev, w: x - prev.x, h: y - prev.y } : null));
          }}
          onMouseUp={() => setDrawing(false)}
          onMouseLeave={() => setDrawing(false)}
        >
          {overlayElements.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                selectRedaction(item.id);
              }}
              className={clsx('absolute rounded-md border transition', {
                'border-accent shadow-[0_0_0_2px_rgba(254,187,59,0.3)]': item.id === selectedRedactionId,
                'border-panel': item.id !== selectedRedactionId,
                'opacity-30': !item.enabled,
                'ring-2 ring-accent/40': item.active,
              })}
              style={{
                left: item.left,
                top: item.top,
                width: item.width,
                height: item.height,
                background: `${item.color}33`,
                borderColor: item.color,
              }}
            >
              <div className="absolute top-1 left-1 text-xs font-medium bg-panel/80 px-1.5 py-0.5 rounded-md">
                {item.label}
              </div>
            </div>
          ))}

          {rect && (
            <div
              className="pointer-events-none border-2 border-dashed border-accent bg-accent/10"
              style={{
                position: 'absolute',
                left: Math.min(rect.x, rect.x + rect.w),
                top: Math.min(rect.y, rect.y + rect.h),
                width: Math.abs(rect.w),
                height: Math.abs(rect.h),
              }}
            />
          )}
        </div>

        {rect && (
          <div className="absolute bottom-3 left-3 bg-panel2/95 backdrop-blur-sm p-4 rounded-xl border border-border shadow-xl w-80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">New Redaction</div>
              <button type="button" className="text-xs text-sub hover:text-text" onClick={resetDraft}>
                Cancel
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-sub uppercase tracking-wide">Label</span>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Person, laptop, plate..."
                  className="px-2 py-1.5 rounded-lg bg-panel border border-border focus:border-accent outline-none"
                />
              </label>
              <div className="flex items-center justify-between gap-2">
                <label className="flex flex-col flex-1 gap-1">
                  <span className="text-xs text-sub uppercase tracking-wide">Effect</span>
                  <select
                    value={effect}
                    onChange={(e) => setEffect(e.target.value as RedactionEffect)}
                    className="px-2 py-1.5 rounded-lg bg-panel border border-border focus:border-accent outline-none"
                  >
                    {effectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                {effect !== 'blackout' ? (
                  <label className="flex flex-col flex-1 gap-1">
                    <span className="text-xs text-sub uppercase tracking-wide">Strength</span>
                    <select
                      value={strength}
                      onChange={(e) => setStrength(e.target.value as RedactionStrength)}
                      className="px-2 py-1.5 rounded-lg bg-panel border border-border focus:border-accent outline-none"
                    >
                      {strengthOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="flex flex-col gap-1 w-[88px]">
                    <span className="text-xs text-sub uppercase tracking-wide">Color</span>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-9 w-full rounded border border-border"
                    />
                  </label>
                )}
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-sub uppercase tracking-wide">Annotation</span>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note for this timeframe"
                  className="px-2 py-1.5 rounded-lg bg-panel border border-border focus:border-accent outline-none resize-none"
                />
              </label>
              <div className="flex items-center justify-between text-xs bg-panel rounded-lg px-2 py-1.5 border border-border">
                <div className="space-y-1">
                  <div>
                    Start: <span className="font-mono text-accent">{formatTime(startTime)}</span>
                    <button
                      type="button"
                      className="ml-2 underline-offset-2 hover:underline"
                      onClick={() => {
                        const media = videoRef.current;
                        if (media) setStartTime(media.currentTime);
                      }}
                    >
                      Set
                    </button>
                  </div>
                  <div>
                    End: <span className="font-mono text-accent">{formatTime(endTime)}</span>
                    <button
                      type="button"
                      className="ml-2 underline-offset-2 hover:underline"
                      onClick={() => {
                        const media = videoRef.current;
                        if (media) setEndTime(media.currentTime);
                      }}
                    >
                      Set
                    </button>
                  </div>
                </div>
                <div className="text-right text-[11px] text-sub">
                  <div>Shortcuts</div>
                  <div>S = Start</div>
                  <div>E = End</div>
                  <div>Enter = Commit</div>
                </div>
              </div>
              <button
                type="button"
                onClick={commitDraft}
                className="w-full bg-accent/90 hover:bg-accent text-black font-semibold py-2 rounded-lg disabled:opacity-40"
                disabled={startTime == null || endTime == null}
              >
                Add Redaction
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
