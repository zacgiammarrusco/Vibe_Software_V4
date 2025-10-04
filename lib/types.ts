export type RedactionEffect = 'blur' | 'pixelate' | 'blackout';
export type RedactionStrength = 'soft' | 'medium' | 'hard';
export type RedactionShape = 'rectangle';

export interface RedactionRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Redaction {
  id: string;
  label: string;
  effect: RedactionEffect;
  strength: RedactionStrength;
  color: string;
  start: number;
  end: number;
  region: RedactionRegion;
  enabled: boolean;
  shape: RedactionShape;
  createdAt: number;
  updatedAt: number;
}

export interface Annotation {
  id: string;
  time: number;
  text: string;
  color: string;
  redactionId?: string;
}

export interface ExportSettings {
  filename: string;
  format: 'mp4';
  preset: 'veryfast' | 'faster' | 'medium';
  crf: number;
  includeAudio: boolean;
}

export interface VideoAsset {
  file: File;
  url: string;
  name: string;
  duration: number;
  width: number;
  height: number;
}
