import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
  Sequence,
  Audio,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { CaptionLayer } from '../CaptionLayer';

// ─── Deterministic RNG ──────────────────────────────────────────────────────
function createRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Closed-form spring (pure function of time) ─────────────────────────────
function closedFormSpring(t: number, k = 170, d = 26): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// ─── Procedural Coffee Stain ────────────────────────────────────────────────
const CoffeeStain: React.FC<{ x: number; y: number; size: number }> = ({ x, y, size }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}%`,
        right: `${x}%`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '6px solid rgba(120, 60, 20, 0.22)',
        backgroundColor: 'rgba(120, 60, 20, 0.05)',
        boxShadow: 'inset 0 0 16px rgba(120, 60, 20, 0.15)',
        filter: 'blur(1px)',
        transform: 'rotate(25deg) scaleY(0.85)',
        pointerEvents: 'none',
      }}
    />
  );
};

// ─── Hand-Drawn Editor Redline Markup ───────────────────────────────────────
const EditorRedlineMarkup: React.FC<{
  progress: number;
  frame: number;
}> = ({ progress, frame }) => {
  const lineLength = 280;
  const currentLength = lineLength * Math.min(1, Math.max(0, progress));

  return (
    <div style={{ position: 'absolute', bottom: '16px', left: '20px', pointerEvents: 'none' }}>
      <svg width="320" height="30" viewBox="0 0 320 30" fill="none">
        <path
          d="M10 20 Q 90 8, 160 22 T 310 14"
          stroke="#EF4444"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={lineLength}
          strokeDashoffset={lineLength - currentLength}
          opacity="0.85"
        />
      </svg>
    </div>
  );
};

export interface NewspaperRevealSingleProps {
  scene: SceneSegment;
  sceneIndex: number;
  totalScenes: number;
  primaryColor?: string;
  accentColor?: string;
  format?: 'vertical' | 'horizontal';
  showWatermark?: boolean;
  watermarkText?: string;
}

// ─── Single Newspaper Scene View ─────────────────────────────────────────────
export const NewspaperRevealSceneSingle: React.FC<NewspaperRevealSingleProps> = ({
  scene,
  sceneIndex,
  totalScenes,
  primaryColor = '#DC2626', // Red "EXTRA" banner
  accentColor = '#1F2937',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'THE DAILY GAZETTE // SPECIAL EDITION',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dur = scene.durationSeconds || 10;
  const sceneLocalTime = frame / fps;
  const isLandscape = format === 'horizontal' || width > height;

  // 3D Newspaper Throw / Unfold mechanics
  const enterSpring = closedFormSpring(sceneLocalTime, 130, 20);
  const throwScale = 0.65 + enterSpring * 0.35;
  const throwRot = (1 - enterSpring) * -16;
  const throwTranslateY = (1 - enterSpring) * 110;

  const headline = scene.headline || (scene as any).title || (scene.letteringLines?.[0]?.text) || 'ESCÂNDALO REVELADO';
  const articleBody = scene.captionText || 'Documentos vazados revelam a verdade oculta por décadas pelas autoridades governamentais.';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#111317',
        overflow: 'hidden',
        perspective: '1200px',
        fontFamily: "'Playfair Display', Georgia, serif",
      }}
    >
      {/* ── 1. Dark Wood / Desk Backdrop ── */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 40%, #23272F 0%, #0D0F12 85%)',
        }}
      />


      {/* ── 2. The Broadsheet Newspaper Card ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '0 80px' : '0 16px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: isLandscape ? '68%' : '92%',
            maxWidth: '840px',
            backgroundColor: '#F4EEDB', // Authentic aged newsprint paper color
            color: '#1C1917',
            borderRadius: '6px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.92), 0 0 20px rgba(0,0,0,0.4)',
            padding: isLandscape ? '32px 36px' : '26px 20px',
            transform: `perspective(1200px) rotateX(4deg) rotate(${throwRot}deg) translateY(${throwTranslateY}px) scale(${throwScale})`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Halftone texture overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(#1C1917 0.8px, transparent 0.8px)',
              backgroundSize: '4px 4px',
              opacity: 0.05,
              pointerEvents: 'none',
            }}
          />

          {/* Coffee Stain detail */}
          <CoffeeStain x={8} y={6} size={110} />

          {/* Newspaper Masthead */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderBottom: '4px double #1C1917',
              paddingBottom: '10px',
            }}
          >
            <div
              style={{
                backgroundColor: primaryColor,
                color: '#FFFFFF',
                padding: '4px 18px',
                fontWeight: 900,
                fontSize: '13px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                marginBottom: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
            >
              EXTRA ★ EDIÇÃO {sceneIndex + 1}/{totalScenes}
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: isLandscape ? '56px' : '42px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                lineHeight: 1,
              }}
            >
              THE DAILY GAZETTE
            </h1>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                marginTop: '10px',
                paddingTop: '6px',
                borderTop: '1px solid #1C1917',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1px',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <span>VOL. CXLII Nº {48900 + sceneIndex * 15}</span>
              <span>ARQUIVO DESCLASSIFICADO</span>
              <span>PREÇO: 25¢</span>
            </div>
          </div>

          {/* Main Headline */}
          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <h2
              style={{
                margin: 0,
                fontSize: isLandscape ? '42px' : '32px',
                fontWeight: 900,
                lineHeight: 1.15,
                textTransform: 'uppercase',
                letterSpacing: '-0.5px',
              }}
            >
              {headline}
            </h2>
          </div>

          {/* Columns & Media Layout */}
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              gap: '18px',
              borderTop: '1px solid #1C1917',
              paddingTop: '14px',
              position: 'relative',
            }}
          >
            {/* Embedded Halftone Image if available */}
            {scene.imageUrl && (
              <div
                style={{
                  width: '42%',
                  height: '170px',
                  overflow: 'hidden',
                  border: '1px solid #1C1917',
                  filter: 'grayscale(1) contrast(1.4)',
                }}
              >
                <Img
                  src={scene.imageUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Article Columns Text */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: isLandscape ? '18px' : '16px',
                  lineHeight: 1.45,
                  fontWeight: 600,
                  textAlign: 'justify',
                }}
              >
                <strong style={{ fontSize: '32px', float: 'left', lineHeight: 0.8, marginRight: '8px' }}>
                  {articleBody[0]}
                </strong>
                {articleBody.slice(1)}
              </p>
            </div>

            {/* Editor Redline Markup */}
            <EditorRedlineMarkup progress={enterSpring} frame={frame} />
          </div>
        </div>
      </AbsoluteFill>

      {/* ── Word-Level Synchronized Karaoke Subtitles ── */}
      <div style={{ position: 'absolute', bottom: isLandscape ? '45px' : '65px', left: 0, right: 0, zIndex: 45 }}>
        <CaptionLayer
          scene={scene}
          captionStyle="box"
          primaryColor={primaryColor}
          accentColor="#FFE600"
          format={format}
        />
      </div>

      {/* ── 3. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '14px' : '22px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            letterSpacing: '2px',
            fontWeight: 800,
            fontFamily: 'Montserrat, sans-serif',
            zIndex: 40,
          }}
        >
          {watermarkText}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Multi-Scene / Composition Wrapper ───────────────────────────────────────
export const NewspaperRevealComposition: React.FC<RemotionShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    const fallbackScene: SceneSegment = {
      headline: (props as any).headline || 'O ESCÂNDALO QUE DERRUBOU O GOVERNO',
      captionText: (props as any).subheadline || 'Documentos vazados revelam a verdade oculta por décadas pelas autoridades.',
      durationSeconds: 10,
    } as any;
    return (
      <NewspaperRevealSceneSingle
        scene={fallbackScene}
        sceneIndex={0}
        totalScenes={1}
        primaryColor={props.primaryColor || '#DC2626'}
        accentColor={props.accentColor || '#1F2937'}
        format={props.format || 'vertical'}
        showWatermark={props.showWatermark}
        watermarkText={props.watermarkText || 'THE DAILY GAZETTE // SPECIAL EDITION'}
      />
    );
  }

  let accumulatedFrames = 0;
  const totalCount = scenes.length;

  return (
    <AbsoluteFill style={{ backgroundColor: '#111317' }}>
      {scenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 10;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        return (
          <Sequence
            key={`news_seq_${idx}_${scene.headline || scene.captionText?.slice(0, 10)}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <NewspaperRevealSceneSingle
              scene={scene}
              sceneIndex={idx}
              totalScenes={totalCount}
              primaryColor={props.primaryColor || '#DC2626'}
              accentColor={props.accentColor || '#1F2937'}
              format={props.format || 'vertical'}
              showWatermark={props.showWatermark}
              watermarkText={props.watermarkText || 'THE DAILY GAZETTE // SPECIAL EDITION'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const NewspaperReveal = NewspaperRevealComposition;
