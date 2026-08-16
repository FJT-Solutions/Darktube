"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { DarkClipsVideoComposition } from '@/remotion/compositions/DarkClipsVideo';
import { DarkClipsVideoProps } from '@/remotion/types';
import { Move, Play, Pause, RotateCcw, Smartphone, MousePointer2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DarkClipsPreviewPlayerProps extends DarkClipsVideoProps {
  fps?: number;
  width?: number;
  height?: number;
  className?: string;
  onUpdateHeaderPadding?: (paddingTop: number) => void;
  onUpdateHeadline?: (updates: { mainTextYOffset?: number; subTextYOffset?: number; fontSize?: number }) => void;
  onUpdateVideoPlacement?: (placement: { yOffset?: number; scale?: number; borderRadius?: number }) => void;
}

export const DarkClipsPreviewPlayer: React.FC<DarkClipsPreviewPlayerProps> = ({
  durationInSeconds = 15,
  fps = 30,
  width = 1080,
  height = 1920,
  onUpdateHeaderPadding,
  onUpdateHeadline,
  onUpdateVideoPlacement,
  ...inputProps
}) => {
  const durationInFrames = Math.max(30, Math.floor((durationInSeconds || 15) * fps));
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);

  // Active layer being dragged
  const [activeLayer, setActiveLayer] = useState<'none' | 'header' | 'mainText' | 'subText' | 'video'>('none');
  const [dragging, setDragging] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragInitialVal, setDragInitialVal] = useState<number>(0);

  const {
    profileHeader = {},
    headline = {},
    videoPlacement = {},
  } = inputProps;

  const headerPadding = profileHeader.paddingTop ?? 90;
  const mainTextY = headline.mainTextYOffset ?? 17;
  const subTextY = headline.subTextYOffset ?? 25;
  const videoY = videoPlacement.yOffset ?? 52;
  const videoScale = videoPlacement.scale ?? 92;

  // Toggle Play / Pause without showing native video player controls
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playerRef.current.isPlaying()) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  const restartVideo = () => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(0);
    playerRef.current.play();
    setIsPlaying(true);
  };

  // Handle Drag Start
  const handlePointerDown = (layer: 'header' | 'mainText' | 'subText' | 'video', e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveLayer(layer);
    setDragging(true);
    setDragStartY(e.clientY);

    if (layer === 'header') {
      setDragInitialVal(headerPadding);
    } else if (layer === 'mainText') {
      setDragInitialVal(mainTextY);
    } else if (layer === 'subText') {
      setDragInitialVal(subTextY);
    } else if (layer === 'video') {
      setDragInitialVal(videoY);
    }
  };

  // Handle Pointer Move for Independent Layers
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaY = e.clientY - dragStartY;
      const percentDeltaY = (deltaY / rect.height) * 100;

      if (activeLayer === 'header' && onUpdateHeaderPadding) {
        const scaleFactor = 1920 / rect.height;
        const newPadding = Math.max(20, Math.min(350, Math.round(dragInitialVal + deltaY * scaleFactor)));
        onUpdateHeaderPadding(newPadding);
      } else if (activeLayer === 'mainText' && onUpdateHeadline) {
        const newY = Math.max(5, Math.min(60, Math.round(dragInitialVal + percentDeltaY)));
        onUpdateHeadline({ mainTextYOffset: newY });
      } else if (activeLayer === 'subText' && onUpdateHeadline) {
        const newY = Math.max(10, Math.min(75, Math.round(dragInitialVal + percentDeltaY)));
        onUpdateHeadline({ subTextYOffset: newY });
      } else if (activeLayer === 'video' && onUpdateVideoPlacement) {
        const newY = Math.max(15, Math.min(85, Math.round(dragInitialVal + percentDeltaY)));
        onUpdateVideoPlacement({ yOffset: newY });
      }
    };

    const handlePointerUp = () => {
      if (dragging) {
        setDragging(false);
      }
    };

    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, activeLayer, dragStartY, dragInitialVal, onUpdateHeaderPadding, onUpdateHeadline, onUpdateVideoPlacement]);

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[340px] mx-auto select-none">
      
      {/* ── Top Stage Bar ── */}
      <div className="w-full flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-bold border-red-500/40 bg-red-500/10 text-red-400 gap-1.5 py-0.5">
            <Smartphone className="h-3 w-3" /> Canvas 9:16
          </Badge>
          {activeLayer !== 'none' && (
            <span className="text-[11px] font-semibold text-zinc-300 animate-fadeIn">
              Camada:{' '}
              <strong className="text-primary font-bold">
                {activeLayer === 'header'
                  ? `Header (${headerPadding}px)`
                  : activeLayer === 'mainText'
                  ? `Setup (${mainTextY}%)`
                  : activeLayer === 'subText'
                  ? `Punchline (${subTextY}%)`
                  : `Vídeo (${videoY}%)`}
              </strong>
            </span>
          )}
        </div>

        {/* Clean Playback Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={restartVideo}
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
            title="Reiniciar vídeo"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={togglePlay}
            className="h-7 px-2 text-xs font-bold gap-1 text-white bg-zinc-800 hover:bg-zinc-700"
          >
            {isPlaying ? <Pause className="h-3 w-3 fill-white" /> : <Play className="h-3 w-3 fill-white" />}
            {isPlaying ? 'Pausar' : 'Play'}
          </Button>
        </div>
      </div>

      {/* ── Clean 9:16 Smartphone / Canva Artboard Stage ── */}
      <div
        ref={containerRef}
        className="w-full aspect-[9/16] rounded-[24px] overflow-hidden shadow-2xl border-2 border-zinc-800/80 bg-black relative cursor-default"
        onClick={() => setActiveLayer('none')}
      >
        <Player
          ref={playerRef}
          component={DarkClipsVideoComposition}
          inputProps={{
            ...inputProps,
            profileHeader: {
              ...profileHeader,
              paddingTop: headerPadding,
            },
            headline: {
              ...headline,
              mainTextYOffset: mainTextY,
              subTextYOffset: subTextY,
            },
            videoPlacement: {
              ...videoPlacement,
              yOffset: videoY,
              scale: videoScale,
            },
            durationInSeconds,
          }}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={width}
          compositionHeight={height}
          style={{
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
          controls={false}
          autoPlay={false}
          loop
        />

        {/* ── Interactive Layer Overlays (Canva Style) ── */}
        <div className="absolute inset-0 pointer-events-auto z-30">
          
          {/* Snapping Guide Line */}
          {dragging && (
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-red-500/50 border-l border-dashed border-red-500 z-40 pointer-events-none" />
          )}

          {/* 1. Header Layer Drag Box */}
          {profileHeader.showHeader !== false && (
            <div
              style={{
                position: 'absolute',
                top: `${(headerPadding / 1920) * 100}%`,
                left: '4%',
                width: '92%',
                height: '7%',
                cursor: 'grab',
              }}
              className={`group rounded-lg transition-all flex items-center justify-between px-3 ${
                activeLayer === 'header'
                  ? 'border-2 border-sky-400 bg-sky-500/15 shadow-lg shadow-sky-500/20'
                  : 'border border-dashed border-transparent hover:border-sky-400/70 hover:bg-sky-500/10'
              }`}
              onPointerDown={(e) => handlePointerDown('header', e)}
            >
              <span className="text-[9px] font-extrabold text-sky-400 uppercase tracking-wider bg-black/90 px-1.5 py-0.5 rounded border border-sky-500/40">
                👤 Header Perfil
              </span>
              <Move className="h-3.5 w-3.5 text-sky-400 opacity-70 group-hover:opacity-100" />
            </div>
          )}

          {/* 2. Main Text Layer Drag Box (Setup / Chamada) */}
          {headline.showMainText !== false && headline.mainText && (
            <div
              style={{
                position: 'absolute',
                top: `${mainTextY}%`,
                left: '4%',
                width: '92%',
                minHeight: '6%',
                cursor: 'grab',
              }}
              className={`group rounded-lg transition-all flex items-center justify-between px-3 py-1 ${
                activeLayer === 'mainText'
                  ? 'border-2 border-yellow-400 bg-yellow-500/15 shadow-lg shadow-yellow-500/20'
                  : 'border border-dashed border-transparent hover:border-yellow-400/70 hover:bg-yellow-500/10'
              }`}
              onPointerDown={(e) => handlePointerDown('mainText', e)}
            >
              <span className="text-[9px] font-extrabold text-yellow-400 uppercase tracking-wider bg-black/90 px-1.5 py-0.5 rounded border border-yellow-500/40">
                ✍️ Texto Principal ({mainTextY}%)
              </span>
              <Move className="h-3.5 w-3.5 text-yellow-400 opacity-70 group-hover:opacity-100" />
            </div>
          )}

          {/* 3. Sub Text Layer Drag Box (Punchline / Reação) */}
          {headline.showSubText !== false && headline.subText && (
            <div
              style={{
                position: 'absolute',
                top: `${subTextY}%`,
                left: '4%',
                width: '92%',
                minHeight: '5%',
                cursor: 'grab',
              }}
              className={`group rounded-lg transition-all flex items-center justify-between px-3 py-1 ${
                activeLayer === 'subText'
                  ? 'border-2 border-cyan-400 bg-cyan-500/15 shadow-lg shadow-cyan-500/20'
                  : 'border border-dashed border-transparent hover:border-cyan-400/70 hover:bg-cyan-500/10'
              }`}
              onPointerDown={(e) => handlePointerDown('subText', e)}
            >
              <span className="text-[9px] font-extrabold text-cyan-400 uppercase tracking-wider bg-black/90 px-1.5 py-0.5 rounded border border-cyan-500/40">
                💬 Punchline ({subTextY}%)
              </span>
              <Move className="h-3.5 w-3.5 text-cyan-400 opacity-70 group-hover:opacity-100" />
            </div>
          )}

          {/* 4. Video Placement Layer Drag Box */}
          <div
            style={{
              position: 'absolute',
              top: `${videoY}%`,
              left: `${(100 - videoScale) / 2}%`,
              width: `${videoScale}%`,
              height: '40%',
              cursor: 'grab',
            }}
            className={`group rounded-xl transition-all flex items-center justify-between p-3 ${
              activeLayer === 'video'
                ? 'border-2 border-red-500 bg-red-500/15 shadow-xl shadow-red-500/25'
                : 'border border-dashed border-transparent hover:border-red-400/70 hover:bg-red-500/10'
            }`}
            onPointerDown={(e) => handlePointerDown('video', e)}
          >
            <div className="self-start flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold text-red-400 uppercase tracking-wider bg-black/90 px-1.5 py-0.5 rounded border border-red-500/40">
                🎬 Vídeo (Y: {videoY}%)
              </span>
            </div>
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-black/90 border border-red-500/50 text-red-400 shadow-md">
              <Move className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Canva Mode Hint Footer */}
      <p className="text-[11px] text-zinc-500 text-center font-medium">
        💡 <strong>Editor Visual:</strong> Arraste o <strong>Header</strong>, o <strong>Texto Principal</strong>, a <strong>Punchline</strong> ou o <strong>Vídeo</strong> para posicionar live!
      </p>
    </div>
  );
};
