
import type { Redaction, RedactionEffect, RedactionStrength } from './types';

const blurMap: Record<RedactionStrength, number> = {
  soft: 12,
  medium: 28,
  hard: 48,
};

const pixelationMap: Record<RedactionStrength, number> = {
  soft: 20,
  medium: 14,
  hard: 8,
};

const blackoutOpacity = 0.92;

const effectLabel = (effect: RedactionEffect, strength: RedactionStrength) => `${effect}:${strength}`;

const toColorHex = (input: string) => {
  if (!input) return '0x000000';
  if (input.startsWith('#')) {
    const hex = input.slice(1);
    if (hex.length === 3) {
      return `0x${hex.split('').map((ch) => `${ch}${ch}`).join('')}`;
    }
    if (hex.length === 6) {
      return `0x${hex}`;
    }
  }
  return input.startsWith('0x') ? input : `0x${input}`;
};

export type FilterBuildResult = {
  filter: string;
  filtersUsed: string[];
};

const sanitizeTime = (value: number) => Number.isFinite(value) ? Math.max(0, Number(value.toFixed(3))) : 0;

export function buildFilter(redactions: Redaction[], width: number, height: number): FilterBuildResult {
  const active = redactions.filter((r) => r.enabled && r.end > r.start);
  if (active.length === 0) {
    return { filter: `[0:v]scale=${width}:${height},format=yuv420p[outv]`, filtersUsed: [] };
  }

  let filter = `[0:v]scale=${width}:${height},format=yuv420p[base];`;
  let lastLabel = 'base';
  let index = 0;
  const used: string[] = [];

  for (const redaction of active) {
    const x = Math.round(redaction.region.x);
    const y = Math.round(redaction.region.y);
    const w = Math.round(redaction.region.width);
    const h = Math.round(redaction.region.height);
    const start = sanitizeTime(redaction.start);
    const end = sanitizeTime(redaction.end);
    const baseLabel = `r${index}`;
    const overlayLabel = `ov${index}`;
    const maskLabel = `mask${index}`;

    const effect = redaction.effect;
    const strength = redaction.strength;

    if (effect === 'blackout') {
      const color = redaction.color ?? '#000000';
      filter += `color=${toColorHex(color)}@${blackoutOpacity}:s=${w}x${h},format=rgba[${maskLabel}];`;
      filter += `[${lastLabel}][${maskLabel}]overlay=${x}:${y}:enable='between(t,${start},${end})'[${overlayLabel}];`;
    } else if (effect === 'pixelate') {
      const divisor = Math.max(1, pixelationMap[strength]);
      const scaledW = Math.max(1, Math.round(w / divisor));
      const scaledH = Math.max(1, Math.round(h / divisor));
      filter += `[${lastLabel}]crop=${w}:${h}:${x}:${y},scale=${scaledW}:${scaledH}:flags=neighbor,scale=${w}:${h}:flags=neighbor,format=rgba[${baseLabel}];`;
      filter += `[${lastLabel}][${baseLabel}]overlay=${x}:${y}:enable='between(t,${start},${end})'[${overlayLabel}];`;
    } else {
      const blur = blurMap[strength];
      filter += `[${lastLabel}]crop=${w}:${h}:${x}:${y},boxblur=${blur}:1,format=rgba[${baseLabel}];`;
      filter += `[${lastLabel}][${baseLabel}]overlay=${x}:${y}:enable='between(t,${start},${end})'[${overlayLabel}];`;
    }

    used.push(effectLabel(effect, strength));
    lastLabel = overlayLabel;
    index += 1;
  }

  filter += `[${lastLabel}]copy[outv]`;
  return { filter, filtersUsed: used };
}
