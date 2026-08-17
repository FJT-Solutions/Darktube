"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { DarkClipsVideoComposition } from '@/remotion/compositions/DarkClipsVideo';
import { DarkClipsVideoProps, DarkClipArrowItem } from '@/remotion/types';
import {
  Move,
  Smartphone,
  Sparkles,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Music,
  Disc,
  Search,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Camera,
  Send,
  Layers,
  Check
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DarkClipsPreviewPlayerProps extends DarkClipsVideoProps {
  fps?: number;
  width?: number;
  height?: number;
  className?: string;
  arrowsList?: DarkClipArrowItem[];
  onLayerFocus?: (layer: 'header' | 'headline' | 'video' | 'watermark' | 'footer' | 'arrows', arrowIndex?: number) => void;
  onUpdateHeaderPadding?: (paddingTop: number) => void;
  onUpdateHeadline?: (updates: { mainTextYOffset?: number; subTextYOffset?: number; fontSize?: number; mainTextFontSize?: number; subTextFontSize?: number }) => void;
  onUpdateVideoPlacement?: (placement: { yOffset?: number; scale?: number; borderRadius?: number }) => void;
  onUpdateWatermark?: (updates: { xOffset?: number; yOffset?: number; position?: 'custom' }) => void;
  onUpdateFooter?: (updates: { yOffset?: number; fontSize?: number; text?: string }) => void;
  onUpdateArrows?: (updates: Partial<DarkClipArrowItem>) => void;
  onUpdateArrowItem?: (index: number, updates: Partial<DarkClipArrowItem>) => void;
}

export const DarkClipsPreviewPlayer: React.FC<DarkClipsPreviewPlayerProps> = ({
  durationInSeconds = 15,
  fps = 30,
  width = 1080,
  height = 1920,
  videoUrl,
  arrowsList,
  onLayerFocus,
  onUpdateHeaderPadding,
  onUpdateHeadline,
  onUpdateVideoPlacement,
  onUpdateWatermark,
  onUpdateFooter,
  onUpdateArrows,
  onUpdateArrowItem,
  ...inputProps
}) => {
  const durationInFrames = Math.max(30, Math.floor((durationInSeconds || 15) * fps));
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);

  // Platform UI Simulation Mode
  const [previewMode, setPreviewMode] = useState<'clean' | 'tiktok' | 'reels' | 'shorts'>('clean');

  // Track dynamic artboard dimensions to scale platform overlays proportionally
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({ width: 300, height: 533 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.height > 0 && rect.width > 0) {
          setStageSize({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Active layer being dragged (supports header, mainText, subText, video, watermark, footer, arrows, and arrow-0, arrow-1...)
  const [activeLayer, setActiveLayer] = useState<string>('none');
  const [hoveredLayer, setHoveredLayer] = useState<string>('none');
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
    arrows = {},
  } = inputProps;

  const headerPadding = profileHeader.paddingTop ?? 90;
  const mainTextY = headline.mainTextYOffset ?? 17;
  const subTextY = headline.subTextYOffset ?? 25;
  const videoY = videoPlacement.yOffset ?? 52;
  const videoScale = videoPlacement.scale ?? 92;
  const watermarkX = watermark.xOffset ?? 85;
  const watermarkY = watermark.yOffset ?? 92;
  const footerY = footer.yOffset ?? 92;

  // Normalize arrows containers list
  const effectiveArrowsList: DarkClipArrowItem[] =
    arrowsList && arrowsList.length > 0
      ? arrowsList
      : arrows && (arrows.enabled || arrows.enabled === undefined)
      ? [arrows]
      : [];

  // Video Url
  const activeVideoUrl = videoUrl || "";

  // Dynamic values for Platform Overlays
  const displayHandle = profileHeader.handle ? profileHeader.handle.replace(/^@/, '') : 'darkclips';
  const displayName = profileHeader.name || 'Dark Clips';
  const displayCaption = headline.mainText || 'Criando clipes virais no DarkTube';

  // Handle Drag Start & Layer Selection
  const handlePointerDown = (
    layer: 'header' | 'mainText' | 'subText' | 'video' | 'watermark' | 'footer' | string,
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveLayer(layer);
    setDragging(true);
    setDragStartY(e.clientY);
    setDragStartX(e.clientX);

    // Trigger Layer Focus on parent configuration card with smooth scroll
    if (onLayerFocus) {
      if (layer === 'header') {
        onLayerFocus('header');
      } else if (layer === 'mainText' || layer === 'subText') {
        onLayerFocus('headline');
      } else if (layer === 'video') {
        onLayerFocus('video');
      } else if (layer === 'watermark') {
        onLayerFocus('watermark');
      } else if (layer === 'footer') {
        onLayerFocus('footer');
      } else if (layer.startsWith('arrow-')) {
        const idx = parseInt(layer.replace('arrow-', ''), 10);
        onLayerFocus('arrows', isNaN(idx) ? 0 : idx);
      } else if (layer === 'arrows') {
        onLayerFocus('arrows', 0);
      }
    }

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
    } else if (layer.startsWith('arrow-')) {
      const idx = parseInt(layer.replace('arrow-', ''), 10);
      const targetItem = effectiveArrowsList[idx];
      if (targetItem) {
        setDragInitialValX(targetItem.xOffset ?? targetItem.x_offset ?? 82);
        setDragInitialValY(targetItem.yOffset ?? targetItem.y_offset ?? 65);
      }
    } else if (layer === 'arrows') {
      const targetItem = effectiveArrowsList[0] || arrows;
      setDragInitialValX(targetItem.xOffset ?? targetItem.x_offset ?? 82);
      setDragInitialValY(targetItem.yOffset ?? targetItem.y_offset ?? 65);
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
      } else if (activeLayer.startsWith('arrow-')) {
        const idx = parseInt(activeLayer.replace('arrow-', ''), 10);
        const newX = Math.max(0, Math.min(100, Math.round(dragInitialValX + percentDeltaX)));
        const newY = Math.max(0, Math.min(100, Math.round(dragInitialValY + percentDeltaY)));
        if (onUpdateArrowItem) {
          onUpdateArrowItem(idx, { xOffset: newX, yOffset: newY });
        } else if (onUpdateArrows && idx === 0) {
          onUpdateArrows({ xOffset: newX, yOffset: newY });
        }
      } else if (activeLayer === 'arrows') {
        const newX = Math.max(0, Math.min(100, Math.round(dragInitialValX + percentDeltaX)));
        const newY = Math.max(0, Math.min(100, Math.round(dragInitialValY + percentDeltaY)));
        if (onUpdateArrowItem && effectiveArrowsList.length > 0) {
          onUpdateArrowItem(0, { xOffset: newX, yOffset: newY });
        } else if (onUpdateArrows) {
          onUpdateArrows({ xOffset: newX, yOffset: newY });
        }
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
  }, [dragging, activeLayer, dragStartY, dragStartX, dragInitialValX, dragInitialValY, onUpdateHeaderPadding, onUpdateHeadline, onUpdateVideoPlacement, onUpdateWatermark, onUpdateFooter, onUpdateArrows, onUpdateArrowItem, effectiveArrowsList]);

  return (
    <div className="flex flex-col items-center gap-2 w-full mx-auto select-none">
      
      {/* ── Platform Simulation Switcher Bar ── */}
      <div className="w-full bg-secondary/40 p-0.5 rounded-xl border border-border/60 flex items-center justify-between gap-1 text-[11px] shadow-sm">
        <button
          type="button"
          onClick={() => setPreviewMode('clean')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
            previewMode === 'clean'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
          title="Visualização limpa sem interface de rede social"
        >
          Limpo
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode('tiktok')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-0.5 ${
            previewMode === 'tiktok'
              ? 'bg-black text-white ring-1 ring-white/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
          title="Simular interface do TikTok"
        >
          <span className="text-[#25F4EE]">Tik</span><span className="text-[#FE2C55]">Tok</span>
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode('reels')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 ${
            previewMode === 'reels'
              ? 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
          title="Simular interface do Reels (Facebook & Instagram)"
        >
          Reels
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode('shorts')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 ${
            previewMode === 'shorts'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
          title="Simular interface do YouTube Shorts"
        >
          Shorts
        </button>
      </div>

      {/* ── Top Stage Info Bar ── */}
      <div className="w-full flex items-center justify-between px-1 min-h-[20px]">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-bold border-red-500/40 bg-red-500/10 text-red-400 gap-1 py-0">
            <Smartphone className="h-2.5 w-2.5" /> 9:16 Live
          </Badge>
          {activeLayer !== 'none' && (
            <span className="text-[10px] font-semibold text-zinc-300 animate-fadeIn truncate max-w-[220px]">
              <strong className="text-primary font-bold">
                {activeLayer === 'header'
                  ? `Cabeçalho (${headerPadding}px)`
                  : activeLayer === 'mainText'
                  ? `Título Principal (${mainTextY}%)`
                  : activeLayer === 'subText'
                  ? `Subtítulo (${subTextY}%)`
                  : activeLayer === 'watermark'
                  ? `Marca D'água (${watermarkX}%, ${watermarkY}%)`
                  : activeLayer === 'footer'
                  ? `Rodapé / CTA (${footerY}%)`
                  : activeLayer.startsWith('arrow-')
                  ? `Setas #${parseInt(activeLayer.replace('arrow-', ''), 10) + 1}`
                  : `Vídeo (${videoY}%)`}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* ── Pure WYSIWYG 9:16 Artboard Stage (Auto-Fitting Viewport) ── */}
      <div
        ref={containerRef}
        style={{
          height: 'min(calc(100vh - 18.5rem), 540px)',
          maxHeight: 'calc(100vh - 16rem)',
          aspectRatio: '9/16',
          maxWidth: '100%',
        }}
        className="rounded-[20px] overflow-hidden shadow-2xl border-2 border-zinc-800/90 bg-black relative cursor-default group shrink-0 transition-all duration-150"
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
            arrows: effectiveArrowsList[0] || arrows,
            arrowsList: effectiveArrowsList,
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

        {/* ── Platform Simulation Overlays (Proportionally Scaled with Stage) ── */}
        
        {/* 1. TIKTOK OVERLAY */}
        {previewMode === 'tiktok' && (
          <div className="absolute inset-0 pointer-events-none z-20 select-none overflow-hidden">
            <div
              style={{
                width: 360,
                height: 640,
                transform: `scale(${stageSize.width / 360})`,
                transformOrigin: 'top left',
              }}
              className="relative w-[360px] h-[640px] text-white"
            >
              {/* Top Bar */}
              <div className="absolute top-4 inset-x-0 px-4 flex items-center justify-between text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                <div className="w-6" />
                <div className="flex items-center gap-3.5 text-sm font-bold">
                  <span className="text-white/60">Seguindo</span>
                  <span className="text-white border-b-2 border-white pb-0.5">Para Você</span>
                </div>
                <Search className="h-5 w-5 text-white" />
              </div>

              {/* Right Action Rail */}
              <div className="absolute right-3 bottom-6 flex flex-col items-center gap-4 text-white">
                {/* Profile Avatar with Plus button */}
                <div className="relative mb-1">
                  <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-zinc-800 shadow-md">
                    {profileHeader.avatarUrl ? (
                      <img src={profileHeader.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-tr from-pink-500 to-indigo-500">
                        {displayName[0]?.toUpperCase() || 'D'}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FE2C55] flex items-center justify-center text-white shadow">
                    <Plus className="h-3 w-3 stroke-[3]" />
                  </div>
                </div>

                {/* Likes */}
                <div className="flex flex-col items-center">
                  <Heart className="h-7 w-7 fill-white text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">842.1K</span>
                </div>

                {/* Comments */}
                <div className="flex flex-col items-center">
                  <MessageCircle className="h-7 w-7 fill-white text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">14.6K</span>
                </div>

                {/* Bookmark */}
                <div className="flex flex-col items-center">
                  <Bookmark className="h-7 w-7 fill-white text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">52.3K</span>
                </div>

                {/* Share */}
                <div className="flex flex-col items-center">
                  <Share2 className="h-7 w-7 fill-white text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">31.8K</span>
                </div>

                {/* Spinning Music Vinyl */}
                <div className="w-9 h-9 rounded-full bg-black/90 border border-zinc-700 flex items-center justify-center mt-1 animate-[spin_4s_linear_infinite] shadow-lg">
                  <Disc className="h-4 w-4 text-zinc-300" />
                </div>
              </div>

              {/* Bottom Left Info */}
              <div className="absolute left-3.5 bottom-4 max-w-[245px] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                <p className="font-bold text-sm">@{displayHandle}</p>
                <p className="text-xs text-zinc-100 line-clamp-2 mt-1 leading-snug">
                  {displayCaption} <span className="font-bold text-white">#viral #foryou #fyp</span>
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-200 mt-2">
                  <Music className="h-3 w-3 shrink-0" />
                  <span className="truncate">Som original - {displayName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. REELS (FACEBOOK & INSTAGRAM) OVERLAY */}
        {previewMode === 'reels' && (
          <div className="absolute inset-0 pointer-events-none z-20 select-none overflow-hidden">
            <div
              style={{
                width: 360,
                height: 640,
                transform: `scale(${stageSize.width / 360})`,
                transformOrigin: 'top left',
              }}
              className="relative w-[360px] h-[640px] text-white"
            >
              {/* Top Bar */}
              <div className="absolute top-4 inset-x-0 px-4 flex items-center justify-between text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                <span className="font-extrabold text-base tracking-wide">Reels</span>
                <Camera className="h-5 w-5" />
              </div>

              {/* Right Action Rail */}
              <div className="absolute right-3.5 bottom-6 flex flex-col items-center gap-4 text-white">
                {/* Like */}
                <div className="flex flex-col items-center">
                  <Heart className="h-7 w-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">126 mil</span>
                </div>

                {/* Comment */}
                <div className="flex flex-col items-center">
                  <MessageCircle className="h-7 w-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">3.240</span>
                </div>

                {/* Share/Send */}
                <div className="flex flex-col items-center">
                  <Send className="h-6 w-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] -rotate-12" />
                  <span className="text-[10px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">18,5 mil</span>
                </div>

                {/* More */}
                <MoreVertical className="h-5 w-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />

                {/* Audio Square */}
                <div className="w-7 h-7 rounded-md border border-white/60 bg-zinc-800/90 flex items-center justify-center shadow">
                  <Music className="h-3 w-3 text-zinc-300" />
                </div>
              </div>

              {/* Bottom Left Info */}
              <div className="absolute left-3.5 bottom-4 max-w-[245px] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border border-white/60 overflow-hidden bg-zinc-800">
                    {profileHeader.avatarUrl ? (
                      <img src={profileHeader.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-primary">
                        {displayName[0]?.toUpperCase() || 'D'}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-sm truncate">@{displayHandle}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-white/70 bg-white/10 backdrop-blur-sm">
                    Seguir
                  </span>
                </div>
                <p className="text-xs text-zinc-100 line-clamp-2 leading-snug mt-1">
                  {displayCaption}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-200 mt-2">
                  <Music className="h-3 w-3 shrink-0" />
                  <span className="truncate">Áudio original • {displayName}</span>
                </div>
              </div>

              {/* Bottom Progress Bar */}
              <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-white/70" />
            </div>
          </div>
        )}

        {/* 3. YOUTUBE SHORTS OVERLAY */}
        {previewMode === 'shorts' && (
          <div className="absolute inset-0 pointer-events-none z-20 select-none overflow-hidden">
            <div
              style={{
                width: 360,
                height: 640,
                transform: `scale(${stageSize.width / 360})`,
                transformOrigin: 'top left',
              }}
              className="relative w-[360px] h-[640px] text-white"
            >
              {/* Top Bar */}
              <div className="absolute top-4 inset-x-0 px-4 flex items-center justify-between text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                <span className="font-black text-xs uppercase tracking-wider text-red-500 bg-white/15 px-2 py-0.5 rounded">
                  Shorts
                </span>
                <div className="flex items-center gap-3.5">
                  <Search className="h-5 w-5" />
                  <MoreVertical className="h-5 w-5" />
                </div>
              </div>

              {/* Right Action Rail */}
              <div className="absolute right-3 bottom-6 flex flex-col items-center gap-4 text-white">
                {/* Thumbs Up */}
                <div className="flex flex-col items-center">
                  <ThumbsUp className="h-6 w-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">248 mil</span>
                </div>

                {/* Thumbs Down */}
                <div className="flex flex-col items-center">
                  <ThumbsDown className="h-6 w-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">Dislike</span>
                </div>

                {/* Comments */}
                <div className="flex flex-col items-center">
                  <MessageCircle className="h-6 w-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">4,8 mil</span>
                </div>

                {/* Share */}
                <div className="flex flex-col items-center">
                  <Share2 className="h-6 w-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">Compartilhar</span>
                </div>

                {/* Remix */}
                <div className="flex flex-col items-center">
                  <Layers className="h-6 w-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  <span className="text-[10px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-0.5">Remix</span>
                </div>

                {/* Audio Thumb Box */}
                <div className="w-8 h-8 rounded-md border border-white/50 bg-zinc-800 overflow-hidden shadow flex items-center justify-center">
                  <Music className="h-4 w-4 text-white" />
                </div>
              </div>

              {/* Bottom Left Info */}
              <div className="absolute left-3.5 bottom-4 max-w-[245px] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full border border-white/60 overflow-hidden bg-zinc-800">
                    {profileHeader.avatarUrl ? (
                      <img src={profileHeader.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-red-600">
                        {displayName[0]?.toUpperCase() || 'D'}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-sm truncate">@{displayHandle}</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm">
                    Inscrever-se
                  </span>
                </div>
                <p className="text-xs text-zinc-100 line-clamp-2 leading-snug mt-1">
                  {displayCaption} <span className="font-bold text-white">#shorts</span>
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-200 mt-2">
                  <Music className="h-3 w-3 shrink-0" />
                  <span className="truncate">Som original - {displayName}</span>
                </div>
              </div>

              {/* Bottom Red Progress Bar */}
              <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-red-600" />
            </div>
          </div>
        )}

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

          {/* 7. Multiple Arrows / Callout Containers Drag Boxes */}
          {effectiveArrowsList.map((item, idx) => {
            if (item.enabled === false) return null;
            const itemX = item.xOffset ?? item.x_offset ?? 82;
            const itemY = item.yOffset ?? item.y_offset ?? 65;
            const isThisActive = activeLayer === `arrow-${idx}`;
            const isThisHovered = hoveredLayer === `arrow-${idx}`;

            return (
              <div
                key={item.id || `drag-arrow-${idx}`}
                style={{
                  position: 'absolute',
                  top: `${itemY}%`,
                  left: `${itemX}%`,
                  transform: 'translate(-50%, -50%)',
                  minWidth: '22%',
                  height: '5.5%',
                  cursor: 'grab',
                }}
                className={`pointer-events-auto transition-all rounded-lg ${
                  isThisActive
                    ? 'ring-2 ring-rose-500 bg-rose-500/20 shadow-lg'
                    : 'hover:ring-1 hover:ring-rose-400/70 hover:bg-rose-500/10'
                }`}
                onPointerDown={(e) => handlePointerDown(`arrow-${idx}`, e)}
                onMouseEnter={() => setHoveredLayer(`arrow-${idx}`)}
                onMouseLeave={() => setHoveredLayer('none')}
              >
                {(isThisActive || isThisHovered) && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded shadow whitespace-nowrap">
                    <Move className="h-2.5 w-2.5" /> SETAS #{idx + 1} (X: {itemX}%, Y: {itemY}%)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Hint Footer */}
      <p className="text-[11px] text-zinc-500 text-center font-medium">
        💡 <strong>Editor Visual:</strong> Arraste livremente o <strong>Cabeçalho</strong>, <strong>Título</strong>, <strong>Subtítulo</strong>, <strong>Vídeo</strong>, <strong>Marca D'água</strong>, <strong>Rodapé</strong> ou <strong>Containers de Setas</strong> para qualquer posição.
      </p>
    </div>
  );
};
