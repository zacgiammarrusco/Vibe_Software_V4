'use client';

import React, { useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useStudioStore } from '@/lib/studioStore';

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

const assignTracks = (count: number) => new Array(Math.min(count, 4)).fill(0).map((_, i) => i);

export default function Timeline() {
  const video = useStudioStore((state) => state.video);
  const redactions = useStudioStore((state) => state.redactions);
  const currentTime = useStudioStore((state) => state.currentTime);
  const selectedId = useStudioStore((state) => state.selectedRedactionId);
  const selectRedaction = useStudioStore((state) => state.selectRedaction);
  const setCurrentTime = useStudioStore((state) => state.setCurrentTime);

  const duration = video?.duration ?? 0;
  const pxPerSec = duration > 0 ? Math.min(140, Math.max(40, 900 / duration)) : 80;
  const width = Math.max(640, duration * pxPerSec, 640);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const tracks = useMemo(() => {
    const sorted = [...redactions].sort((a, b) => a.start - b.start);
    const trackEndTimes: number[] = [];
    return sorted.map((redaction) => {
      let assignedTrack = 0;
      for (let i = 0; i < trackEndTimes.length; i += 1) {
        if (redaction.start >= trackEndTimes[i] - 0.25) {
          assignedTrack = i;
          trackEndTimes[i] = redaction.end;
          break;
        }
      }
      if (trackEndTimes.length === 0 || redaction.start < trackEndTimes[assignedTrack] - 0.25) {
        assignedTrack = trackEndTimes.length;
        trackEndTimes.push(redaction.end);
      }
      return { redaction, track: assignedTrack };
    });
  }, [redactions]);

  const trackCount = Math.max(2, Math.min(4, tracks.reduce((max, item) => Math.max(max, item.track + 1), 0)));
  const tickInterval = duration > 300 ? 30 : duration > 120 ? 10 : 5;
  const tickCount = Math.floor(duration / tickInterval);

  const handleScrub = (clientX: number) => {
    const container = containerRef.current;
    if (!container || duration === 0) return;
    const rect = container.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const time = ratio * duration;
    setCurrentTime(time);
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-xs text-sub mb-3">
        <span>Timeline</span>
        {video && <span>{formatTime(currentTime)} / {formatTime(video.duration)}</span>}
      </div>
      <div
        ref={containerRef}
        className="relative overflow-x-auto"
        onClick={(event) => handleScrub(event.clientX)}
      >
        <div className="relative" style={{ width }}>
          <div className="relative h-8 border border-border rounded-lg bg-panel2 flex">
            {Array.from({ length: tickCount + 1 }).map((_, index) => {
              const left = index * tickInterval * pxPerSec;
              return (
                <div key={index} className="absolute top-0 bottom-0 border-l border-border/60" style={{ left }}>
                  <span className="absolute -top-5 text-[10px] text-sub">{formatTime(index * tickInterval)}</span>
                </div>
              );
            })}
          </div>

          {assignTracks(trackCount).map((track) => (
            <div key={track} className="relative h-10 bg-panel2/70 border border-border rounded-lg mt-3">
              {tracks
                .filter((item) => item.track === track)
                .map(({ redaction }) => {
                  const left = redaction.start * pxPerSec;
                  const widthPx = Math.max(6, (redaction.end - redaction.start) * pxPerSec);
                  return (
                    <button
                      key={redaction.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectRedaction(redaction.id);
                        setCurrentTime(redaction.start + (redaction.end - redaction.start) / 2);
                      }}
                      className={clsx('absolute top-1 bottom-1 rounded-md border px-2 text-left text-xs flex items-center justify-between gap-2', {
                        'border-accent bg-accent/20 text-black': redaction.id === selectedId,
                        'border-border bg-panel': redaction.id !== selectedId,
                        'opacity-50': !redaction.enabled,
                      })}
                      style={{ left, width: widthPx, backgroundColor: `${redaction.color}33`, borderColor: redaction.color }}
                    >
                      <span className="font-medium truncate">{redaction.label}</span>
                      <span className="font-mono text-[10px]">{formatTime(redaction.start)}→{formatTime(redaction.end)}</span>
                    </button>
                  );
                })}
            </div>
          ))}

          {video && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent"
              style={{ left: Math.min(width, currentTime * pxPerSec) }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
