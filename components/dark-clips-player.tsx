"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Player } from '@remotion/player';
import { DarkClipsVideoComposition } from '@/remotion/compositions/DarkClipsVideo';
import { DarkClipsVideoProps } from '@/remotion/types';
import { Move, Maximize2, Sparkles, Layers, Eye, MousePointer2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DarkClipsPreviewPlayerProps extends DarkClipsVideoProps {
  fps?: number;
  width?: number;
  height?: number;
  className?: string;
  isInteractive?: boolean;
  onUpdateHeaderPadding?: (paddingTop: number) => void;
  onUpdateVideoPlacement?: (placement: { yOffset?: number; scale?: number; borderRadius?: number }) => void;
  onUpdateHeadlineFontSize?: (fontSize: number) => void;
}

export const DarkClipsPreviewPlayer: React.FC<DarkClipsPreviewPlayerProps> = ({
  durationInSeconds = 15,
  fps = 30,
  width = 1080,
  height = 1920,
  className = 'w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-black relative select-none',
  isInteractive = true,
  onUpdateHeaderPadding,
  onUpdateVideoPlacement,
  onUpdateHeadlineFontSize,
  ...inputProps
}) => {
  const durationInFrames = Math.max(30, Math.floor((durationInSeconds || 15) * fps));
  const containerRef = useRef<HTMLDivElement>(null);

  // Active layer being dragged or selected
  const [activeLayer, setActiveLayer] = useState<'none' | 'header' | 'headline' | 'video'>('none');
  const [dragging, setDragging] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState<boolean>(true);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragInitialVal, setDragInitialVal] = useState<number>(0);

  const {
    profileHeader = {},
    headline = {},
    videoPlacement = {},
  } = inputProps;

  const headerPadding = profileHeader.paddingTop ?? 90;
  const videoY = videoPlacement.yOffset ?? 54;
  const videoScale = videoPlacement.scale ?? 92;

  // Handle Drag Start
  const handlePointerDown = (layer: 'header' | 'headline' | 'video', e: React.PointerEvent) => {
    if (!editorMode) return;
    e.stopPropagation();
    setActiveLayer(layer);
    setDragging(true);
    setDragStartY(e.clientY);

    if (layer === 'header') {
      setDragInitialVal(headerPadding);
    } else if (layer === 'video') {
      setDragInitialVal(videoY);
    }
  };

  // Handle Pointer Move
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaY = e.clientY - dragStartY;
      const percentDeltaY = (deltaY / rect.height) * 100;

      if (activeLayer === 'header' && onUpdateHeaderPadding) {
        // Map delta pixels in container to 1080x1920 canvas coordinates
        const scaleFactor = 1920 / rect.height;
        const newPadding = Math.max(20, Math.min(400, Math.round(dragInitialVal + deltaY * scaleFactor)));
        onUpdateHeaderPadding(newPadding);
      } else if (activeLayer === 'video' && onUpdateVideoPlacement) {
        const newY = Math.max(10, Math.min(85, Math.round(dragInitialVal + percentDeltaY)));
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
  }, [dragging, activeLayer, dragStartY, dragInitialVal, onUpdateHeaderPadding, onUpdateVideoPlacement]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Top Interactive Canvas Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[11px] font-bold gap-1.5 cursor-pointer transition-all ${
              editorMode
                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400'
            }`}
            onClick={() => setEditorMode(!editorMode)}
          >
            <MousePointer2 className="h-3 w-3" />
            {editorMode ? 'Editor Visual Canva: ATIVO' : 'Modo Preview: ATIVO'}
          </Badge>
          {editorMode && activeLayer !== 'none' && (
            <span className="text-[11px] font-semibold text-zinc-400 animate-fadeIn">
              Camada:{' '}
              <strong className="text-white">
                {activeLayer === 'header'
                  ? `Header (Y: ${headerPadding}px)`
                  : activeLayer === 'video'
                  ? `Vídeo (Y: ${videoY}%)`
                  : 'Headline'}
              </strong>
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditorMode(!editorMode)}
          className="h-7 text-xs text-zinc-400 hover:text-white"
        >
          {editorMode ? <Eye className="h-3.5 w-3.5 mr-1" /> : <Layers className="h-3.5 w-3.5 mr-1" />}
          {editorMode ? 'Ocultar Guias' : 'Arrastar Elementos'}
        </Button>
      </div>

      {/* Main 9:16 Canvas with Interactive Overlay */}
      <div
        ref={containerRef}
        className={className}
        onClick={() => setActiveLayer('none')}
      >
        <Player
          component={DarkClipsVideoComposition}
          inputProps={{
            ...inputProps,
            profileHeader: {
              ...profileHeader,
              paddingTop: headerPadding,
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
            pointerEvents: editorMode ? 'none' : 'auto',
          }}
          controls={!editorMode}
          autoPlay={false}
          loop
        />

        {/* ── Canva Style Drag Overlays ── */}
        {editorMode && (
          <div className="absolute inset-0 pointer-events-auto z-30">
            {/* Center Alignment Snapping Guide */}
            {dragging && (
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-red-500/40 border-l border-dashed border-red-500 z-10 pointer-events-none" />
            )}

            {/* 1. Header Layer Drag Box */}
            {profileHeader.showHeader !== false && (
              <div
                style={{
                  position: 'absolute',
                  top: `${(headerPadding / 1920) * 100}%`,
                  left: '5%',
                  width: '90%',
                  height: '7%',
                  cursor: 'grab',
                }}
                className={`group rounded-lg transition-all flex items-center justify-between px-3 ${
                  activeLayer === 'header'
                    ? 'border-2 border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/20'
                    : 'border border-dashed border-transparent hover:border-sky-400/60 hover:bg-sky-500/5'
                }`}
                onPointerDown={(e) => handlePointerDown('header', e)}
              >
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider bg-black/80 px-1.5 py-0.5 rounded border border-sky-500/30">
                  Header Perfil
                </span>
                <Move className="h-4 w-4 text-sky-400 opacity-60 group-hover:opacity-100" />
              </div>
            )}

            {/* 2. Video Placement Layer Drag Box */}
            <div
              style={{
                position: 'absolute',
                top: `${videoY}%`,
                left: `${(100 - videoScale) / 2}%`,
                width: `${videoScale}%`,
                height: '42%',
                cursor: 'grab',
              }}
              className={`group rounded-xl transition-all flex items-center justify-between p-3 ${
                activeLayer === 'video'
                  ? 'border-2 border-red-500 bg-red-500/10 shadow-lg shadow-red-500/25'
                  : 'border border-dashed border-transparent hover:border-red-400/60 hover:bg-red-500/5'
              }`}
              onPointerDown={(e) => handlePointerDown('video', e)}
            >
              <div className="self-start flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider bg-black/80 px-1.5 py-0.5 rounded border border-red-500/30">
                  Vídeo (Y: {videoY}%)
                </span>
              </div>
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-black/80 border border-red-500/40 text-red-400 shadow-md">
                <Move className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Canva Mode Hint Footer */}
      {editorMode && (
        <p className="text-[11px] text-zinc-500 text-center">
          💡 <strong>Dica Canva:</strong> Clique e arraste o <strong>Header</strong> ou o <strong>Vídeo</strong> no preview para ajustar a posição em tempo real!
        </p>
      )}
    </div>
  );
};
