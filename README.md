# Vibe Redaction Studio

Modern browser-based studio for uploading footage, annotating regions, and exporting fully redacted videos — all powered by WebAssembly FFmpeg and a realtime redaction workflow.

## Features

- **Fast upload preview** — load local mp4 files, see duration, resolution, and scrub instantly.
- **Precision redactions** — draw on the frame, mark start/end with keyboard or buttons, choose blur/pixelate/blackout, and add optional notes.
- **Timeline orchestration** — visualize every redaction across stacked tracks, jump directly to segments, and scrub anywhere along the playhead.
- **Redaction manager** — rename, toggle, tweak effect strength, or recolor blackout masks; seek and delete in one click.
- **Annotations** — keep contextual notes tied to timestamps or specific redactions for review.
- **Configurable exports** — pick x264 preset, CRF, audio passthrough, and output filename; monitor live FFmpeg progress with download-on-complete.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Workflow

1. **Upload** a clip (mp4 recommended) from the top bar.
2. **Draw** a region in the viewer, press `S` and `E` to capture the time window (or use the buttons), adjust effect/strength, add notes, and hit _Add Redaction_.
3. **Repeat** for additional subjects. Manage them from the right sidebar and inspect placements on the timeline.
4. **Annotate** context in the annotations panel—perfect for reviewers.
5. **Export** when ready. The studio assembles an FFmpeg filter graph using your regions and renders an H.264 file with optional audio passthrough.

## Keyboard shortcuts

- `Space` — Play/Pause (native video control)
- `S` — Mark redaction start time
- `E` — Mark redaction end time
- `Enter` — Commit current redaction
- `Esc` — Cancel current draft

## Tech stack

- Next.js 14 (App Router, React 18)
- Tailwind CSS for the UI framework
- Zustand store for application state
- `@ffmpeg/ffmpeg` + `@ffmpeg/util` for in-browser WebAssembly exports
- TypeScript everywhere for safety and DX

## Notes

- Large files will take time to encode; keep clips short for best WebAssembly performance.
- Rendering happens entirely client-side—ensure you have enough memory for big exports.
- To disable Next.js telemetry, run `npx next telemetry disable`.
