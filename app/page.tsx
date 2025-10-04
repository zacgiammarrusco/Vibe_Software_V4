'use client';

import React, { useCallback, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import TopBar from '@/components/TopBar';
import Viewer from '@/components/Viewer';
import AssistantsPanel from '@/components/AssistantsPanel';
import Timeline from '@/components/Timeline';
import { buildFilter } from '@/lib/buildFilter';
import { useStudioStore, useProcessing } from '@/lib/studioStore';

async function readVideoMetadata(file: File): Promise<{ url: string; duration: number; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      cleanup();
      resolve({ url, duration, width, height });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('Could not load video metadata.'));
    };
    video.src = url;
  });
}

export default function Page() {
  const setVideo = useStudioStore((state) => state.setVideo);
  const resetStudio = useStudioStore((state) => state.reset);
  const redactions = useStudioStore((state) => state.redactions);
  const video = useStudioStore((state) => state.video);
  const exportSettings = useStudioStore((state) => state.exportSettings);
  const setProcessing = useStudioStore((state) => state.setProcessing);
  const processing = useProcessing();

  const ffmpegRef = useRef<FFmpeg | null>(null);

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) {
      return ffmpegRef.current;
    }
    setProcessing({ state: 'initializing', message: 'Loading FFmpeg core…' });
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }, [setProcessing]);

  const handleUpload = useCallback(async (file: File) => {
    const metadata = await readVideoMetadata(file);
    setVideo({
      file,
      url: metadata.url,
      name: file.name,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
    });
  }, [setVideo]);

  const handleExport = useCallback(async () => {
    if (!video) return;
    if (processing.state === 'complete') {
      URL.revokeObjectURL(processing.url);
    }
    const ffmpeg = await loadFFmpeg();
    try {
      setProcessing({ state: 'rendering', progress: 0, message: 'Encoding video…' });

      const inputName = 'input.mp4';
      const outputName = `out.${exportSettings.format}`;
      const data = new Uint8Array(await video.file.arrayBuffer());
      await ffmpeg.writeFile(inputName, data);

      const { filter } = buildFilter(redactions, video.width, video.height);
      const args = ['-i', inputName, '-filter_complex', filter, '-map', '[outv]'];

      if (exportSettings.includeAudio) {
        args.push('-map', '0:a?');
      } else {
        args.push('-an');
      }

      args.push(
        '-c:v',
        'libx264',
        '-preset',
        exportSettings.preset,
        '-crf',
        String(exportSettings.crf),
        '-movflags',
        'faststart',
        '-y',
        outputName,
      );

      const progressListener = ({ progress }: { progress: number }) => {
        setProcessing({ state: 'rendering', progress: Math.min(progress * 100, 100), message: 'Encoding video…' });
      };

      ffmpeg.on('progress', progressListener);
      await ffmpeg.exec(args);
      ffmpeg.off('progress', progressListener);

      const outputData = await ffmpeg.readFile(outputName);
      const dataArray: Uint8Array =
        typeof outputData === 'string' ? new TextEncoder().encode(outputData) : (outputData as Uint8Array);
      const arrayBuffer = new ArrayBuffer(dataArray.byteLength);
      new Uint8Array(arrayBuffer).set(dataArray);
      const blob = new Blob([arrayBuffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const filename = exportSettings.filename.endsWith(`.${exportSettings.format}`)
        ? exportSettings.filename
        : `${exportSettings.filename}.${exportSettings.format}`;

      setProcessing({ state: 'complete', url, filename });

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (error) {
      console.error(error);
      setProcessing({ state: 'error', message: 'Export failed. Try adjusting settings or clip length.' });
    }
  }, [exportSettings, loadFFmpeg, processing, redactions, setProcessing, video]);

  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen">
      <TopBar onUpload={handleUpload} onReset={resetStudio} onExport={handleExport} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] xl:grid-cols-[1fr_22rem] gap-0">
        <div className="p-4 flex flex-col gap-4">
          <Viewer />
        </div>
        <AssistantsPanel onExport={handleExport} />
      </div>
      <div className="p-4">
        <Timeline />
      </div>
    </div>
  );
}
