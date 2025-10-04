"use client";

import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { nanoid } from 'nanoid/non-secure';
import type {
  Annotation,
  ExportSettings,
  Redaction,
  RedactionRegion,
  RedactionEffect,
  RedactionStrength,
  VideoAsset,
} from './types';

type ProcessingStatus =
  | { state: 'idle' }
  | { state: 'initializing'; message?: string }
  | { state: 'rendering'; progress: number; message?: string }
  | { state: 'complete'; url: string; filename: string }
  | { state: 'error'; message: string };

type DraftRedaction = {
  region: RedactionRegion;
  start?: number;
  end?: number;
};

type StudioState = {
  video?: VideoAsset;
  redactions: Redaction[];
  annotations: Annotation[];
  selectedRedactionId?: string;
  draft?: DraftRedaction;
  currentTime: number;
  playing: boolean;
  exportSettings: ExportSettings;
  processing: ProcessingStatus;
  setVideo: (asset?: VideoAsset) => void;
  clearVideo: () => void;
  createDraft: (region: RedactionRegion) => void;
  updateDraft: (patch: Partial<DraftRedaction>) => void;
  clearDraft: () => void;
  addRedaction: (params: {
    region: RedactionRegion;
    start: number;
    end: number;
    effect?: RedactionEffect;
    strength?: RedactionStrength;
    color?: string;
    label?: string;
  }) => string;
  updateRedaction: (id: string, patch: Partial<Redaction>) => void;
  removeRedaction: (id: string) => void;
  toggleRedaction: (id: string) => void;
  reorderRedactions: (ids: string[]) => void;
  selectRedaction: (id?: string) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  addAnnotation: (payload: { time: number; text: string; color?: string; redactionId?: string }) => string;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  setExportSettings: (patch: Partial<ExportSettings>) => void;
  setProcessing: (status: ProcessingStatus) => void;
  reset: () => void;
};

const defaultExportSettings: ExportSettings = {
  filename: 'redacted.mp4',
  format: 'mp4',
  preset: 'veryfast',
  crf: 23,
  includeAudio: true,
};

export const strengthColorMap: Record<RedactionStrength, string> = {
  soft: '#3ba7fe',
  medium: '#febb3b',
  hard: '#f87171',
};

const studioStoreCreator: StateCreator<StudioState> = (set, get) => ({
  video: undefined,
  redactions: [],
  annotations: [],
  selectedRedactionId: undefined,
  draft: undefined,
  currentTime: 0,
  playing: false,
  exportSettings: defaultExportSettings,
  processing: { state: 'idle' },
  setVideo: (asset) => {
    set((state) => {
      if (state.video) {
        URL.revokeObjectURL(state.video.url);
      }
      return {
        video: asset,
        currentTime: 0,
        playing: false,
        redactions: [],
        annotations: [],
        selectedRedactionId: undefined,
        processing: { state: 'idle' },
      };
    });
  },
  clearVideo: () => {
    const prev = get().video;
    if (prev) {
      URL.revokeObjectURL(prev.url);
    }
    set({
      video: undefined,
      redactions: [],
      annotations: [],
      selectedRedactionId: undefined,
      currentTime: 0,
      playing: false,
      processing: { state: 'idle' },
    });
  },
  createDraft: (region) => set({ draft: { region } }),
  updateDraft: (patch) => set((state) => ({ draft: state.draft ? { ...state.draft, ...patch } : state.draft })),
  clearDraft: () => set({ draft: undefined }),
  addRedaction: ({ region, start, end, effect = 'blur', strength = 'medium', color, label }) => {
    const id = nanoid();
    const now = Date.now();
    const computedColor = color ?? strengthColorMap[strength];
    const redaction: Redaction = {
      id,
      label: label ?? `Redaction ${get().redactions.length + 1}`,
      effect,
      strength,
      color: computedColor,
      start,
      end,
      region,
      enabled: true,
      shape: 'rectangle',
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      redactions: [...state.redactions, redaction],
      selectedRedactionId: id,
      draft: undefined,
    }));
    return id;
  },
  updateRedaction: (id, patch) => {
    set((state) => ({
      redactions: state.redactions.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r)),
    }));
  },
  removeRedaction: (id) => {
    set((state) => ({
      redactions: state.redactions.filter((r) => r.id !== id),
      selectedRedactionId: state.selectedRedactionId === id ? undefined : state.selectedRedactionId,
      annotations: state.annotations.filter((a) => a.redactionId !== id),
    }));
  },
  toggleRedaction: (id) => {
    set((state) => ({
      redactions: state.redactions.map((r) => (r.id === id ? { ...r, enabled: !r.enabled, updatedAt: Date.now() } : r)),
    }));
  },
  reorderRedactions: (ids) => {
    set((state) => ({
      redactions: ids
        .map((id) => state.redactions.find((r) => r.id === id))
        .filter((r): r is Redaction => Boolean(r)),
    }));
  },
  selectRedaction: (id) => set({ selectedRedactionId: id }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setPlaying: (playing) => set({ playing }),
  addAnnotation: ({ time, text, color = '#3ba7fe', redactionId }) => {
    const id = nanoid();
    const annotation: Annotation = { id, time, text, color, redactionId };
    set((state) => ({ annotations: [...state.annotations, annotation] }));
    return id;
  },
  updateAnnotation: (id, patch) => {
    set((state) => ({
      annotations: state.annotations.map((note) => (note.id === id ? { ...note, ...patch } : note)),
    }));
  },
  removeAnnotation: (id) => {
    set((state) => ({ annotations: state.annotations.filter((note) => note.id !== id) }));
  },
  setExportSettings: (patch) => {
    set((state) => ({ exportSettings: { ...state.exportSettings, ...patch } }));
  },
  setProcessing: (status) => set({ processing: status }),
  reset: () => {
    const prev = get().video;
    if (prev) {
      URL.revokeObjectURL(prev.url);
    }
    set({
      video: undefined,
      redactions: [],
      annotations: [],
      selectedRedactionId: undefined,
      currentTime: 0,
      playing: false,
      draft: undefined,
      exportSettings: defaultExportSettings,
      processing: { state: 'idle' },
    });
  },
});

export const useStudioStore = create<StudioState>()(studioStoreCreator);

export const useRedactions = () => useStudioStore((state) => state.redactions);
export const useAnnotations = () => useStudioStore((state) => state.annotations);
export const useTransport = () =>
  useStudioStore((state) => ({ currentTime: state.currentTime, playing: state.playing }));
export const useProcessing = () => useStudioStore((state) => state.processing);
