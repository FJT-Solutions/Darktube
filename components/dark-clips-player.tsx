"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { DarkClipsVideoComposition } from '@/remotion/compositions/DarkClipsVideo';
import { DarkClipsVideoProps } from '@/remotion/types';
import { Move, Smartphone, Sparkles, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DarkClipsPreviewPlayerProps extends DarkClipsVideoProps {
  fps?: number;
  width?: number;
  height?: number;
  className?: string;
  onUpdateHeaderPadding?: (paddingTop: number) => void;
  onUpdateHeadline?: (updates: { mainTextYOffset?: number; subTextYOffset?: number; fontSize?: number }) => void;
  onUpdateVideoPlacement?: (placement: { yOffset?: number; scale?: number; borderRadius?: number }) => void;
  onUpdateWatermark?: (updates: { xOffset?: number; yOffset?: number; position?: 'custom' }) => void;
  onUpdateFooter?: (updates: { yOffset?: number; fontSize?: number; text?: string }) => void;
}

export const DarkClipsPreviewPlayer: React.FC<DarkClipsPreviewPlayerProps> = ({
  durationInSeconds = 15,
  fps = 30,
  width = 1080,
  height = 1920,
  videoUrl,
  onUpdateHeaderPadding,
  onUpdateHeadline,
  onUpdateVideoPlacement,
  onUpdateWatermark,
  onUpdateFooter,
  ...inputProps
}) => {
  const durationInFrames = Math.max(30, Math.floor((durationInSeconds || 15) * fps));
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);

  // Active layer being dragged
  const [activeLayer, setActiveLayer] = useState<'none' | 'header' | 'mainText' | 'subText' | 'video' | 'watermark' | 'footer'>('none');
  const [hoveredLayer, setHoveredLayer] = useState<'none' | 'header' | 'mainText' | 'subText' | 'video' | 'watermark' | 'footer'>('none');
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragInitialValY, setDragInitialValY] = useState<number>(0);
  const [dragInitialValX, setDragInitialValX] = useState<number>(0);

  const {
    profileHeader = {},
    headline = {},
    videoPlacement = {},
    watermark = {},
    footer = {},
  } = inputProps;

  const headerPadding = profileHeader.paddingTop ?? 90;
  const mainTextY = headline.mainTextYOffset ?? 17;
  const subTextY = headline.subTextYOffset ?? 25;
  const videoY = videoPlacement.yOffset ?? 52;
  const videoScale = videoPlacement.scale ?? 92;
  const watermarkX = watermark.xOffset ?? 85;
  const watermarkY = watermark.yOffset ?? 92;
  const footerY = footer.yOffset ?? 92;

  // Video Url
  const activeVideoUrl = videoUrl || "";

  // Handle Drag Start
  const handlePointerDown = (layer: 'header' | 'mainText' | 'subText' | 'video' | 'watermark' | 'footer', e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveLayer(layer);
    setDragging(true);
    setDragStartY(e.clientY);
    setDragStartX(e.clientX);

    if (layer === 'header') {
      setDragInitialValY(headerPadding);
    } else if (layer === 'mainText') {
      setDragInitialValY(mainTextY);
    } else if (layer === 'subText') {
      setDragInitialValY(subTextY);
    } else if (layer === 'video') {
      setDragInitialValY(videoY);
    } else if (layer === 'watermark') {
      setDragInitialValX(watermarkX);
      setDragInitialValY(watermarkY);
    } else if (layer === 'footer') {
      setDragInitialValY(footerY);
    }
  };

  // Handle Pointer Move for Independent Layers (Free Full-Range Positioning 0% - 98%)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaY = e.clientY - dragStartY;
      const deltaX = e.clientX - dragStartX;
      const percentDeltaY = (deltaY / rect.height) * 100;
      const percentDeltaX = (deltaX / rect.width) * 100;

      if (activeLayer === 'header' && onUpdateHeaderPadding) {
        const scaleFactor = 1920 / rect.height;
        const newPadding = Math.max(0, Math.min(800, Math.round(dragInitialValY + deltaY * scaleFactor)));
        onUpdateHeaderPadding(newPadding);
      } else if (activeLayer === 'mainText' && onUpdateHeadline) {
        const newY = Math.max(0, Math.min(95, Math.round(dragInitialValY + percentDeltaY)));
        onUpdateHeadline({ mainTextYOffset: newY });
      } else if (activeLayer === 'subText' && onUpdateHeadline) {
        const newY = Math.max(0, Math.min(95, Math.round(dragInitialValY + percentDeltaY)));
        onUpdateHeadline({ subTextYOffset: newY });
      } else if (activeLayer === 'video' && onUpdateVideoPlacement) {
        const newY = Math.max(0, Math.min(95, Math.round(dragInitialValY + percentDeltaY)));
        onUpdateVideoPlacement({ yOffset: newY });
      } else if (activeLayer === 'watermark' && onUpdateWatermark) {
        const newX = Math.max(0, Math.min(100, Math.round(dragInitialValX + percentDeltaX)));
        const newY = Math.max(0, Math.min(100, Math.round(dragInitialValY + percentDeltaY)));
        onUpdateWatermark({ xOffset: newX, yOffset: newY, position: 'custom' });
      } else if (activeLayer === 'footer' && onUpdateFooter) {
        const newY = Math.max(0, Math.min(98, Math.round(dragInitialValY + percentDeltaY)));
        onUpdateFooter({ yOffset: newY });
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
  }, [dragging, activeLayer, dragStartY, dragStartX, dragInitialValX, dragInitialValY, onUpdateHeaderPadding, onUpdateHeadline, onUpdateVideoPlacement, onUpdateWatermark, onUpdateFooter]);

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[340px] mx-auto select-none">
      
      {/* ── Top Stage Info Bar ── */}
      <div className="w-full flex items-center justify-between px-1 min-h-[24px]">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-bold border-red-500/40 bg-red-500/10 text-red-400 gap-1.5 py-0.5">
            <Smartphone className="h-3 w-3" /> Vídeo 9:16
          </Badge>
          {activeLayer !== 'none' && (
            <span className="text-[11px] font-semibold text-zinc-300 animate-fadeIn">
              <strong className="text-primary font-bold">
                {activeLayer === 'header'
                  ? `Cabeçalho (${headerPadding}px)`
                  : activeLayer === 'mainText'
                  ? `Título Principal (${mainTextY}%)`
                  : activeLayer === 'subText'
                  ? `Subtítulo (${subTextY}%)`
                  : activeLayer === 'watermark'
                  ? `Marca D'água (X: ${watermarkX}%, Y: ${watermarkY}%)`
                  : activeLayer === 'footer'
                  ? `Rodapé / CTA (${footerY}%)`
                  : `Vídeo (${videoY}%)`}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* ── Pure WYSIWYG 9:16 Artboard Stage ── */}
      <div
        ref={containerRef}
        className="w-full aspect-[9/16] rounded-[24px] overflow-hidden shadow-2xl border-2 border-zinc-800/90 bg-black relative cursor-default group"
        onClick={() => setActiveLayer('none')}
      >
        {/* The Live Composition */}
        <Player
          ref={playerRef}
          component={DarkClipsVideoComposition}
          inputProps={{
            ...inputProps,
            videoUrl: activeVideoUrl,
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
            watermark: {
              ...watermark,
              xOffset: watermarkX,
              yOffset: watermarkY,
            },
            footer: {
              ...footer,
              yOffset: footerY,
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
          }}
          controls={false}
          autoPlay={true}
          loop={true}
        />

        {/* ── Sleek Non-Blocking Figma/Canva Interactive Layer Overlays ── */}
        <div className="absolute inset-0 pointer-events-none z-30">
          
          {/* Snapping Center Guide */}
          {dragging && (
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-red-500/60 border-l border-dashed border-red-500 z-40" />
          )}

          {/* 1. Header Layer Drag Box */}
          {profileHeader.showHeader !== false && (
            <div
              style={{
                position: 'absolute',
                top: `${(headerPadding / 1920) * 100}%`,
                left: '4%',
                width: '92%',
                height: `${Math.round(7 * ((profileHeader.scale || 100) / 100))}%`,
                cursor: 'grab',
              }}
              className={`pointer-events-auto transition-all rounded-lg ${
                activeLayer === 'header'
                  ? 'ring-2 ring-sky-400 bg-sky-400/10 shadow-lg'
                  : 'hover:ring-1 hover:ring-sky-400/60 hover:bg-sky-400/5'
              }`}
              onPointerDown={(e) => handlePointerDown('header', e)}
              onMouseEnter={() => setHoveredLayer('header')}
              onMouseLeave={() => setHoveredLayer('none')}
            >
              {(activeLayer === 'header' || hoveredLayer === 'header') && (
                <div className="absolute -top-3 left-2 flex items-center gap-1 bg-sky-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                  <Move className="h-2.5 w-2.5" /> CABEÇALHO ({headerPadding}px)
                </div>
              )}
            </div>
          )}

          {/* 2. Main Text Layer Drag Box (Texto Principal) */}
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
              className={`pointer-events-auto transition-all rounded-lg ${
                activeLayer === 'mainText'
                  ? 'ring-2 ring-yellow-400 bg-yellow-400/10 shadow-lg'
                  : 'hover:ring-1 hover:ring-yellow-400/60 hover:bg-yellow-400/5'
              }`}
              onPointerDown={(e) => handlePointerDown('mainText', e)}
              onMouseEnter={() => setHoveredLayer('mainText')}
              onMouseLeave={() => setHoveredLayer('none')}
            >
              {(activeLayer === 'mainText' || hoveredLayer === 'mainText') && (
                <div className="absolute -top-3 left-2 flex items-center gap-1 bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                  <Move className="h-2.5 w-2.5" /> TÍTULO PRINCIPAL ({mainTextY}%)
                </div>
              )}
            </div>
          )}

          {/* 3. Sub Text Layer Drag Box (Subtítulo / Punchline) */}
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
              className={`pointer-events-auto transition-all rounded-lg ${
                activeLayer === 'subText'
                  ? 'ring-2 ring-cyan-400 bg-cyan-400/10 shadow-lg'
                  : 'hover:ring-1 hover:ring-cyan-400/60 hover:bg-cyan-400/5'
              }`}
              onPointerDown={(e) => handlePointerDown('subText', e)}
              onMouseEnter={() => setHoveredLayer('subText')}
              onMouseLeave={() => setHoveredLayer('none')}
            >
              {(activeLayer === 'subText' || hoveredLayer === 'subText') && (
                <div className="absolute -top-3 left-2 flex items-center gap-1 bg-cyan-400 text-black text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                  <Move className="h-2.5 w-2.5" /> SUBTÍTULO ({subTextY}%)
                </div>
              )}
            </div>
          )}

          {/* 4. Video Placement Layer Drag Box */}
          <div
            style={{
              position: 'absolute',
              top: `${videoY}%`,
              transform: 'translateY(-50%)',
              left: `${(100 - videoScale) / 2}%`,
              width: `${videoScale}%`,
              height: '38%',
              cursor: 'grab',
            }}
            className={`pointer-events-auto transition-all rounded-xl ${
              activeLayer === 'video'
                ? 'ring-2 ring-red-500 bg-red-500/10 shadow-lg'
                : 'hover:ring-1 hover:ring-red-400/60 hover:bg-red-500/5'
            }`}
            onPointerDown={(e) => handlePointerDown('video', e)}
            onMouseEnter={() => setHoveredLayer('video')}
            onMouseLeave={() => setHoveredLayer('none')}
          >
            {(activeLayer === 'video' || hoveredLayer === 'video') && (
              <div className="absolute -top-3 left-2 flex items-center gap-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded shadow">
                <Move className="h-2.5 w-2.5" /> VÍDEO (Y: {videoY}%)
              </div>
            )}
          </div>

          {/* 5. Watermark Layer Drag Box */}
          {watermark.enabled && (
            <div
              style={{
                position: 'absolute',
                top: `${watermarkY}%`,
                left: `${watermarkX}%`,
                transform: 'translate(-50%, -50%)',
                minWidth: '28%',
                height: '5%',
                cursor: 'grab',
              }}
              className={`pointer-events-auto transition-all rounded-lg ${
                activeLayer === 'watermark'
                  ? 'ring-2 ring-pink-500 bg-pink-500/20 shadow-lg'
                  : 'hover:ring-1 hover:ring-pink-400/70 hover:bg-pink-500/10'
              }`}
              onPointerDown={(e) => handlePointerDown('watermark', e)}
              onMouseEnter={() => setHoveredLayer('watermark')}
              onMouseLeave={() => setHoveredLayer('none')}
            >
              {(activeLayer === 'watermark' || hoveredLayer === 'watermark') && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-pink-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded shadow whitespace-nowrap">
                  <Move className="h-2.5 w-2.5" /> MARCA D'ÁGUA (X: {watermarkX}%, Y: {watermarkY}%)
                </div>
              )}
            </div>
          )}

          {/* 6. Footer / CTA Layer Drag Box */}
          {footer.showFooter !== false && footer.text && (
            <div
              style={{
                position: 'absolute',
                top: `${footerY}%`,
                transform: 'translateY(-50%)',
                left: '4%',
                width: '92%',
                minHeight: '5%',
                cursor: 'grab',
              }}
              className={`pointer-events-auto transition-all rounded-lg ${
                activeLayer === 'footer'
                  ? 'ring-2 ring-emerald-400 bg-emerald-400/20 shadow-lg'
                  : 'hover:ring-1 hover:ring-emerald-400/70 hover:bg-emerald-400/10'
              }`}
              onPointerDown={(e) => handlePointerDown('footer', e)}
              onMouseEnter={() => setHoveredLayer('footer')}
              onMouseLeave={() => setHoveredLayer('none')}
            >
              {(activeLayer === 'footer' || hoveredLayer === 'footer') && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded shadow whitespace-nowrap">
                  <Move className="h-2.5 w-2.5" /> RODAPÉ / CTA (Y: {footerY}%)
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stage Hint Footer */}
      <p className="text-[11px] text-zinc-500 text-center font-medium">
        💡 <strong>Editor Visual:</strong> Arraste livremente o <strong>Cabeçalho</strong>, <strong>Título</strong>, <strong>Subtítulo</strong>, <strong>Vídeo</strong>, <strong>Marca D'água</strong> ou <strong>Rodapé / CTA</strong> para qualquer posição.
      </p>
    </div>
  );
};
