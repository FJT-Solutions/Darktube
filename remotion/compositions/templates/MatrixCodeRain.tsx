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

// ─── Procedural Matrix Rain Stream ──────────────────────────────────────────
const MATRIX_CHARS = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';

interface ColumnDef {
  x: number;
  speed: number;
  length: number;
  chars: string[];
  delay: number;
}

const MatrixStreamColumns: React.FC<{
  frame: number;
  primaryColor: string;
  totalColumns?: number;
}> = ({ frame, primaryColor, totalColumns = 28 }) => {
  const columns: ColumnDef[] = React.useMemo(() => {
    const r = createRng(1048576);
    return Array.from({ length: totalColumns }, (_, i) => {
      const colLength = 12 + Math.floor(r() * 16);
      const chars = Array.from({ length: colLength }, () =>
        MATRIX_CHARS[Math.floor(r() * MATRIX_CHARS.length)]
      );
      return {
        x: (i / totalColumns) * 100,
        speed: 14 + r() * 18,
        length: colLength,
        chars,
        delay: r() * 40,
      };
    });
  }, [totalColumns]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {columns.map((col, colIdx) => {
        const elapsed = Math.max(0, frame - col.delay);
        const yPos = (elapsed * col.speed) % 1800 - 300;

        return (
          <div
            key={colIdx}
            style={{
              position: 'absolute',
              left: `${col.x}%`,
              top: `${yPos}px`,
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'monospace',
              fontSize: '18px',
              lineHeight: 1.15,
              fontWeight: 900,
              userSelect: 'none',
              opacity: 0.85,
            }}
          >
            {col.chars.map((char, cIdx) => {
              const isHead = cIdx === col.chars.length - 1;
              const charOpacity = interpolate(cIdx, [0, col.chars.length - 1], [0.15, 1]);
              const charColor = isHead ? '#FFFFFF' : primaryColor;

              return (
                <span
                  key={cIdx}
                  style={{
                    color: charColor,
                    opacity: charOpacity,
                    textShadow: isHead
                      ? `0 0 14px #FFFFFF, 0 0 20px ${primaryColor}`
                      : `0 0 6px ${primaryColor}66`,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ─── Binary Decode String Animation ─────────────────────────────────────────
const BinaryDecodedText: React.FC<{
  targetText: string;
  progress: number;
  frame: number;
  primaryColor: string;
}> = ({ targetText, progress, frame, primaryColor }) => {
  const chars = targetText.split('');
  const decodedIndex = Math.floor(chars.length * progress);

  return (
    <span style={{ fontFamily: 'monospace' }}>
      {chars.map((char, i) => {
        if (i < decodedIndex) {
          return (
            <span key={i} style={{ color: '#FFFFFF' }}>
              {char}
            </span>
          );
        }
        if (i === decodedIndex) {
          const scramble = Math.floor((frame * 7 + i) % 10);
          return (
            <span key={i} style={{ color: '#10B981', textShadow: '0 0 8px #10B981' }}>
              {scramble}
            </span>
          );
        }
        const bin = (i + frame) % 2 === 0 ? '1' : '0';
        return (
          <span key={i} style={{ color: `${primaryColor}66`, opacity: 0.5 }}>
            {bin}
          </span>
        );
      })}
    </span>
  );
};

export interface MatrixCodeRainSingleProps {
  scene: SceneSegment;
  sceneIndex: number;
  totalScenes: number;
  primaryColor?: string;
  accentColor?: string;
  format?: 'vertical' | 'horizontal';
  showWatermark?: boolean;
  watermarkText?: string;
}

// ─── Single Matrix Scene View ───────────────────────────────────────────────
export const MatrixCodeRainSceneSingle: React.FC<MatrixCodeRainSingleProps> = ({
  scene,
  sceneIndex,
  totalScenes,
  primaryColor = '#10B981', // Classic Cyberpunk Matrix Green
  accentColor = '#059669',
  format = 'vertical',
  showWatermark = true,
  watermarkText = 'CYBER DECRYPTION PROTOCOL',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dur = scene.durationSeconds || 10;
  const sceneLocalTime = frame / fps;
  const isLandscape = format === 'horizontal' || width > height;

  // Keyframe mechanics
  const terminalEnter = closedFormSpring(sceneLocalTime, 140, 22);
  const decodeProg = Math.min(1, sceneLocalTime / (dur * 0.7));

  const secretMessage = scene.captionText || 'ACESSO AUTORIZADO // DADOS CONFIDENCIAIS DESCRIPTOGRAFADOS';
  const headline = scene.headline || (scene as any).title || (scene.letteringLines?.[0]?.text) || 'PROTOCOLO DE INVASÃO';

  // Hex address scroll in the margin
  const hexOffset = Math.floor(frame * 0.8) * 16;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#020704',
        overflow: 'hidden',
        fontFamily: 'monospace',
      }}
    >
      {/* ── 1. Cascading Matrix Rain Streams ── */}
      <MatrixStreamColumns frame={frame} primaryColor={primaryColor} totalColumns={isLandscape ? 36 : 24} />

      {/* Atmospheric CRT scanline and vignette overlay */}
      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 50%)',
          backgroundSize: '100% 4px',
          pointerEvents: 'none',
          opacity: 0.7,
        }}
      />

      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 120px rgba(0,0,0,0.95), inset 0 0 35px rgba(16, 185, 129, 0.25)',
          pointerEvents: 'none',
        }}
      />


      {/* ── 2. Top Terminal Bar ── */}
      <div
        style={{
          position: 'absolute',
          top: isLandscape ? '24px' : '48px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '860px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: primaryColor,
          fontSize: '13px',
          fontWeight: 700,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#EF4444' }}>● REC</span>
          <span>root@darktube:~# payload_{sceneIndex + 1}.sh</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)' }}>
          NÓ #{sceneIndex + 1}/{totalScenes} // 0x{hexOffset.toString(16).toUpperCase()}
        </div>
      </div>

      {/* ── 3. Central Decrypting Terminal Card ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '0 100px' : '0 24px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: isLandscape ? '70%' : '90%',
            maxWidth: '860px',
            backgroundColor: 'rgba(5, 20, 12, 0.92)',
            border: `2px solid ${primaryColor}`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.9), 0 0 45px ${primaryColor}40`,
            borderRadius: '24px',
            padding: isLandscape ? '36px 40px' : '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            transform: `translateY(${(1 - terminalEnter) * 50}px) scale(${0.96 + terminalEnter * 0.04})`,
            opacity: terminalEnter,
            position: 'relative',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Header of Terminal */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            </div>
            <div
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: `${primaryColor}22`,
                color: primaryColor,
                fontWeight: 900,
              }}
            >
              AES-256 GCM DECRYPTION
            </div>
          </div>

          {/* Headline with Cyber Glow */}
          <div
            style={{
              fontSize: isLandscape ? '34px' : '30px',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-1px',
              textShadow: `0 0 18px ${primaryColor}`,
              lineHeight: 1.2,
            }}
          >
            {headline}
          </div>

          {/* Decoded Body Text */}
          <div
            style={{
              fontSize: isLandscape ? '22px' : '19px',
              lineHeight: 1.5,
              minHeight: '80px',
              color: '#E2E8F0',
            }}
          >
            <BinaryDecodedText
              targetText={secretMessage}
              progress={decodeProg}
              frame={frame}
              primaryColor={primaryColor}
            />
          </div>

          {/* Progress bar of decode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: primaryColor }}>
              <span>DESCRIPTOGRAFANDO FLUXO</span>
              <span>{Math.round(decodeProg * 100)}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${decodeProg * 100}%`,
                  height: '100%',
                  backgroundColor: primaryColor,
                  borderRadius: '999px',
                  boxShadow: `0 0 10px ${primaryColor}`,
                }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── Word-Level Synchronized Karaoke Subtitles ── */}
      <div style={{ position: 'absolute', bottom: isLandscape ? '45px' : '75px', left: 0, right: 0, zIndex: 45 }}>
        <CaptionLayer
          scene={scene}
          captionStyle="box"
          primaryColor={primaryColor}
          accentColor="#00FF66"
          format={format}
        />
      </div>

      {/* ── 4. Brand Watermark ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: isLandscape ? '16px' : '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(16, 185, 129, 0.7)',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '2px',
            zIndex: 50,
          }}
        >
          <span>⚡</span>
          <span>{watermarkText}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Multi-Scene / Composition Wrapper ───────────────────────────────────────
export const MatrixCodeRainComposition: React.FC<RemotionShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    const fallbackScene: SceneSegment = {
      headline: (props as any).headline || 'INVASÃO DE NÚCLEO AUTORIZADA',
      captionText: (props as any).subheadline || 'Acesso total aos terminais governamentais obtido com sucesso.',
      durationSeconds: 10,
    } as any;
    return (
      <MatrixCodeRainSceneSingle
        scene={fallbackScene}
        sceneIndex={0}
        totalScenes={1}
        primaryColor={props.primaryColor || '#10B981'}
        accentColor={props.accentColor || '#059669'}
        format={props.format || 'vertical'}
        showWatermark={props.showWatermark}
        watermarkText={props.watermarkText || 'CYBER DECRYPTION PROTOCOL'}
      />
    );
  }

  let accumulatedFrames = 0;
  const totalCount = scenes.length;

  return (
    <AbsoluteFill style={{ backgroundColor: '#020704' }}>
      {scenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 10;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        return (
          <Sequence
            key={`matrix_seq_${idx}_${scene.headline || scene.captionText?.slice(0, 10)}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <MatrixCodeRainSceneSingle
              scene={scene}
              sceneIndex={idx}
              totalScenes={totalCount}
              primaryColor={props.primaryColor || '#10B981'}
              accentColor={props.accentColor || '#059669'}
              format={props.format || 'vertical'}
              showWatermark={props.showWatermark}
              watermarkText={props.watermarkText || 'CYBER DECRYPTION PROTOCOL'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const MatrixCodeRain = MatrixCodeRainComposition;
