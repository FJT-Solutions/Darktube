import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  Sequence,
  Img,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../types';
import { CaptionLayer } from './CaptionLayer';

// ─── Deterministic RNG (Mulberry32) ─────────────────────────────────────────
function createRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TactileDossierProps {
  classification?: string;
  documentTitle?: string;
  dossierNumber?: string;
  highlightWords?: string;
  bodyText?: string;
  stampText?: string;
  stampColor?: string;
  highlighterColor?: string;
  redactedText?: string;      // Text shown as redacted then revealed
  marginNote?: string;        // Handwritten margin annotation
  format?: 'vertical' | 'horizontal';
  primaryColor?: string;
  accentColor?: string;
  showWatermark?: boolean;
  watermarkText?: string;
  scene?: SceneSegment;
  sceneIndex?: number;
}

// ─── SVG Wavy Highlighter Path ──────────────────────────────────────────────
const WavyHighlighter: React.FC<{
  progress: number;
  color: string;
  width: number;
  height: number;
  frame: number;
}> = ({ progress, color, width, height, frame }) => {
  // Generate a wavy path that simulates hand-drawn marker movement
  const wobble = Math.sin(frame * 0.3) * 1.2;
  const points: string[] = [];
  const segments = 40;
  const visibleSegments = Math.floor(segments * (progress / 100));

  for (let i = 0; i <= visibleSegments; i++) {
    const x = (i / segments) * width;
    const yBase = height / 2;
    // Hand tremor: sine waves at different frequencies for organic feel
    const tremor =
      Math.sin(i * 0.8 + wobble) * 3 +
      Math.sin(i * 1.7 + frame * 0.1) * 1.5 +
      Math.sin(i * 3.2) * 0.8;
    const y = yBase + tremor;
    points.push(i === 0 ? `M ${x},${y}` : `L ${x},${y}`);
  }

  // Close the shape for fill
  if (visibleSegments > 0) {
    const lastX = (visibleSegments / segments) * width;
    points.push(`L ${lastX},${height}`);
    points.push(`L 0,${height}`);
    points.push('Z');
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: -6, pointerEvents: 'none' }}
    >
      <path
        d={points.join(' ')}
        fill={color}
        opacity={0.75}
        style={{ mixBlendMode: 'multiply' }}
      />
    </svg>
  );
};

// ─── Paperclip SVG ──────────────────────────────────────────────────────────
const PaperclipSVG: React.FC<{ opacity: number }> = ({ opacity }) => (
  <svg
    width="36"
    height="80"
    viewBox="0 0 36 80"
    style={{
      position: 'absolute',
      top: -12,
      right: 40,
      opacity,
      filter: 'drop-shadow(2px 3px 4px rgba(0,0,0,0.5))',
      pointerEvents: 'none',
    }}
  >
    <path
      d="M18 4 C8 4 4 12 4 20 L4 56 C4 68 12 76 18 76 C24 76 32 68 32 56 L32 24 C32 16 28 12 24 12 C20 12 16 16 16 24 L16 52 C16 56 18 58 20 58 C22 58 24 56 24 52 L24 24"
      fill="none"
      stroke="#C0C0C0"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Metallic highlight */}
    <path
      d="M18 6 C10 6 6 14 6 22 L6 56 C6 66 12 74 18 74"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Evidence Tape Strip ────────────────────────────────────────────────────
const EvidenceTape: React.FC<{
  progress: number;
  isVertical: boolean;
}> = ({ progress, isVertical }) => (
  <div
    style={{
      position: 'absolute',
      top: isVertical ? -8 : -6,
      left: isVertical ? '15%' : '20%',
      width: isVertical ? '55%' : '45%',
      height: '32px',
      background: 'repeating-linear-gradient(90deg, #FFE600 0px, #FFE600 8px, #000000 8px, #000000 16px)',
      opacity: 0.7 * progress,
      transform: `rotate(-2deg) scaleX(${progress})`,
      transformOrigin: 'left center',
      borderRadius: '2px',
      pointerEvents: 'none',
      zIndex: 20,
    }}
  />
);

// ─── Scan Lines Overlay ─────────────────────────────────────────────────────
const ScanLinesOverlay: React.FC<{ frame: number; opacity: number }> = ({ frame, opacity }) => {
  const scanY = (frame * 4) % 100;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 15,
        opacity: opacity * 0.4,
        overflow: 'hidden',
      }}
    >
      {/* Horizontal scan lines pattern */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)',
        }}
      />
      {/* Moving scanner beam */}
      <div
        style={{
          position: 'absolute',
          top: `${scanY}%`,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.25), transparent)',
          boxShadow: '0 0 6px rgba(0, 240, 255, 0.4)',
        }}
      />
    </div>
  );
};

// ─── Impact Particles ───────────────────────────────────────────────────────
const ImpactParticles: React.FC<{
  frame: number;
  startFrame: number;
  color: string;
  x: number;
  y: number;
}> = ({ frame, startFrame, color, x, y }) => {
  const elapsed = frame - startFrame;
  if (elapsed < 0 || elapsed > 25) return null;

  const rng = createRng(7777);
  const particles = Array.from({ length: 14 }, (_, i) => {
    const angle = rng() * Math.PI * 2;
    const speed = 2 + rng() * 6;
    const size = 2 + rng() * 4;
    const t = elapsed / 25;
    const px = Math.cos(angle) * speed * elapsed * 1.5;
    const py = Math.sin(angle) * speed * elapsed * 1.5 + elapsed * elapsed * 0.3; // gravity
    const opacity = Math.max(0, 1 - t * 1.3);
    const scale = Math.max(0, 1 - t * 0.8);

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x + px,
          top: y + py,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: rng() > 0.5 ? '50%' : '2px',
          backgroundColor: color,
          opacity,
          transform: `scale(${scale}) rotate(${elapsed * 15 + i * 30}deg)`,
        }}
      />
    );
  });

  return <>{particles}</>;
};

// ─── Paper Aging Stains ─────────────────────────────────────────────────────
const PaperAgingStains: React.FC<{ opacity: number }> = ({ opacity }) => {
  const rng = createRng(3141);
  const stains = Array.from({ length: 5 }, (_, i) => ({
    x: 10 + rng() * 80,
    y: 10 + rng() * 80,
    size: 30 + rng() * 60,
    rot: rng() * 360,
    op: 0.02 + rng() * 0.04,
  }));

  return (
    <>
      {stains.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 90, 43, 0.6) 0%, transparent 70%)',
            transform: `rotate(${s.rot}deg) scale(${1 + Math.sin(i) * 0.3}, ${1 + Math.cos(i) * 0.4})`,
            opacity: s.op * opacity,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
};

/**
 * TactileDocumentaryDossier V2 — Motor Ultra de Dossiê Investigativo
 *
 * Estilo Vox / Johnny Harris / documentário investigativo premium.
 * Inclui: typewriter animado, marca-texto SVG ondulante com tremor de mão,
 * carimbo com partículas de impacto + screen shake, scan-lines CRT,
 * fita adesiva de evidência, anotações manuscritas na margem,
 * paperclip metálico, redaction bars, paper aging procedural.
 */
const TactileDossierSceneSingle: React.FC<TactileDossierProps> = ({
  classification = 'TOP SECRET // CLASSIFICADO',
  documentTitle = 'RELATÓRIO ESTRATÉGICO DE INFRAESTRUTURA',
  dossierNumber = 'DOSSIÊ-BR-9941',
  highlightWords = '99% DE TODA A INTERNET GLOBAL DEPENDE DESTE PONTO',
  bodyText = 'Investigações recentes confirmam que a infraestrutura física transoceânica não possui redundância em caso de rompimento no Estreito de Malaca ou Canal de Suez.',
  stampText = 'CONFIRMADO',
  stampColor = '#EF4444',
  highlighterColor = '#FFE600',
  redactedText = 'OPERAÇÃO ATLAS-7 COMPROMETIDA',
  marginNote = 'verificar fonte primária →',
  format = 'vertical',
  primaryColor = '#00F0FF',
  accentColor = '#FFE600',
  showWatermark = true,
  watermarkText = 'DarkTube Dossier',
  scene,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = format === 'vertical';

  const effClassification = scene?.badgeText
    ? `CLASSIFICADO // ${scene.badgeText}`
    : (sceneIndex > 0 ? `ARQUIVO CONFIDENCIAL #${sceneIndex + 1}` : classification);
  const effTitle = scene?.letteringLines?.[0]?.text || documentTitle;
  const effHighlight = scene?.letteringLines?.find(l => l.isHighlight)?.text || scene?.letteringLines?.[1]?.text || highlightWords;
  const effBody = scene?.captionText || bodyText;
  const effStamp = scene?.badgeText || (sceneIndex % 2 === 1 ? 'CONFIDENCIAL' : stampText);
  const effRedacted = scene?.letteringLines?.[1]?.text ? `OPERAÇÃO ${scene.letteringLines[1].text.toUpperCase()}` : redactedText;
  const effMargin = scene?.badgeText ? `// REF: ${scene.badgeText}` : marginNote;
  const effDossierNo = dossierNumber || `DOSSIÊ-BR-${sceneIndex + 9941}`;
  const effImage = scene?.imageUrl;

  // ── 1. Document entry with inertial spring ──
  const docEnter = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 85, mass: 1.2 },
  });

  const docTilt = interpolate(docEnter, [0, 1], [-6, -1.5]);
  const docScale = interpolate(docEnter, [0, 1], [0.92, 1.0]);
  const docY = interpolate(docEnter, [0, 1], [80, 0]);

  // ── 2. Typewriter effect for body text ──
  const typewriterChars = Math.floor(
    interpolate(frame, [15, 15 + effBody.length * 0.8], [0, effBody.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const visibleBody = effBody.substring(0, typewriterChars);
  const cursorVisible = frame % 16 < 10 && typewriterChars < effBody.length;

  // ── 3. Wavy highlighter with hand tremor ──
  const highlightProgress = interpolate(frame, [22, 55], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  // ── 4. Evidence tape entrance ──
  const tapeEnter = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  // ── 5. Paperclip entrance ──
  const clipEnter = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  // ── 6. Stamp slam with screen shake ──
  const STAMP_START = 42;
  const stampFrame = Math.max(0, frame - STAMP_START);
  const stampSpring = spring({
    frame: stampFrame,
    fps,
    config: { damping: 9, stiffness: 380, mass: 0.4 },
  });

  const stampScale = interpolate(stampSpring, [0, 1], [2.8, 1.0]);
  const stampOpacity = interpolate(stampSpring, [0, 0.4, 1], [0, 0.95, 0.88]);
  const stampRot = -12 + Math.sin(stampFrame * 0.5) * (stampFrame < 8 ? 2 : 0);

  // Screen shake on stamp impact
  const shakeIntensity = stampFrame > 0 && stampFrame < 10
    ? Math.exp(-stampFrame * 0.4) * 8
    : 0;
  const shakeX = Math.sin(stampFrame * 12) * shakeIntensity;
  const shakeY = Math.cos(stampFrame * 15) * shakeIntensity;

  // ── 7. Redaction bars ──
  const redactRevealFrame = 60;
  const redactProgress = interpolate(frame, [redactRevealFrame, redactRevealFrame + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── 8. Margin note entrance ──
  const marginEnter = spring({
    frame: Math.max(0, frame - 30),
    fps,
    config: { damping: 22, stiffness: 80 },
  });

  // ── 9. Scan-lines intensity ──
  const scanOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── 10. Barcode animation ──
  const barcodeEnter = spring({
    frame: Math.max(0, frame - 18),
    fps,
    config: { damping: 20, stiffness: 90 },
  });

  // ── 11. Jitter orgânico (hand-drawn feel) ──
  const wobble = Math.sin(frame * 0.4) * 0.8;
  const breathe = Math.sin(frame * 0.15) * 2;

  // ── 12. Classification dot pulse ──
  const dotPulse = 0.8 + Math.sin(frame * 0.3) * 0.2;
  const dotGlow = 8 + Math.sin(frame * 0.3) * 4;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#050811',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        fontFamily: "'Courier New', Courier, monospace",
        // Screen shake on stamp
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      {/* ── AMBIENT BACKGROUND GLOW ── */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor}08 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── CARD DO DOSSIÊ TÁTIL ── */}
      <div
        style={{
          width: isVertical ? '88%' : '750px',
          backgroundColor: '#0F172A',
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, #1E293B 0%, #0F172A 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          padding: isVertical ? '48px 32px 40px' : '40px 44px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 40px rgba(0, 240, 255, 0.08)',
          transform: `translateY(${docY + breathe}px) scale(${docScale}) rotate(${docTilt + wobble * 0.2}deg)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Paper aging stains */}
        <PaperAgingStains opacity={docEnter} />

        {/* Scan-lines CRT overlay */}
        <ScanLinesOverlay frame={frame} opacity={scanOpacity} />

        {/* Evidence tape strip */}
        <EvidenceTape progress={tapeEnter} isVertical={isVertical} />

        {/* Paperclip */}
        <PaperclipSVG opacity={clipEnter} />

        {/* Marca d'água de fundo oficial */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-30deg)',
            fontSize: isVertical ? '90px' : '110px',
            fontWeight: 900,
            color: 'rgba(255, 255, 255, 0.025)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
            letterSpacing: '8px',
          }}
        >
          CLASSIFIED
        </div>

        {/* ── CABEÇALHO DO DOCUMENTO ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1.5px solid rgba(255, 255, 255, 0.12)',
            paddingBottom: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Pulsing classification dot */}
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                boxShadow: `0 0 ${dotGlow}px #EF4444`,
                display: 'inline-block',
                transform: `scale(${dotPulse})`,
              }}
            />
            <span
              style={{
                fontSize: isVertical ? '14px' : '12px',
                fontWeight: 800,
                color: '#EF4444',
                letterSpacing: '2px',
              }}
            >
              {effClassification}
            </span>
          </div>
          <span
            style={{
              fontSize: isVertical ? '14px' : '12px',
              color: 'rgba(255, 255, 255, 0.45)',
              letterSpacing: '1px',
            }}
          >
            {effDossierNo}
          </span>
        </div>

        {/* ── TÍTULO DO DOCUMENTO ── */}
        <h3
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: isVertical ? '26px' : '22px',
            fontWeight: 900,
            color: '#FFFFFF',
            textTransform: 'uppercase',
            margin: '0 0 16px 0',
            lineHeight: 1.25,
            letterSpacing: '-0.5px',
          }}
        >
          {effTitle}
        </h3>

        {/* ── EVIDÊNCIA FOTOGRÁFICA (SE DISPONÍVEL) ── */}
        {effImage && (
          <div
            style={{
              position: 'relative',
              margin: '8px auto 14px auto',
              width: '95%',
              maxHeight: isVertical ? '220px' : '180px',
              overflow: 'hidden',
              borderRadius: '8px',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}
          >
            <Img
              src={effImage}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'contrast(1.1) brightness(0.9)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '6px',
                right: '8px',
                backgroundColor: 'rgba(0,0,0,0.75)',
                color: '#FFE600',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                letterSpacing: '1px',
              }}
            >
              FIG. {sceneIndex + 1} // EVIDÊNCIA
            </div>
          </div>
        )}

        {/* ── TEXTO DESTACADO COM MARCA-TEXTO SVG ONDULANTE ── */}
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            margin: '10px 0 18px 0',
            lineHeight: 1.4,
          }}
        >
          {/* Wavy SVG Highlighter */}
          <WavyHighlighter
            progress={highlightProgress}
            color={highlighterColor}
            width={isVertical ? 580 : 540}
            height={isVertical ? 75 : 60}
            frame={frame}
          />
          <span
            style={{
              position: 'relative',
              zIndex: 2,
              fontFamily: "'Inter', sans-serif",
              fontSize: isVertical ? '23px' : '20px',
              fontWeight: 900,
              color: highlightProgress > 30 ? '#0F172A' : '#FFFFFF',
              backgroundColor: 'transparent',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'color 0.2s',
            }}
          >
            {effHighlight}
          </span>
        </div>

        {/* ── CORPO INVESTIGATIVO (TYPEWRITER) ── */}
        <p
          style={{
            margin: '0 0 16px 0',
            fontSize: isVertical ? '18px' : '16px',
            lineHeight: 1.6,
            color: 'rgba(226, 232, 240, 0.82)',
            fontFamily: "'Courier New', Courier, monospace",
            minHeight: '80px',
          }}
        >
          {visibleBody}
          {cursorVisible && (
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '1em',
                backgroundColor: primaryColor,
                marginLeft: '2px',
                verticalAlign: 'text-bottom',
                boxShadow: `0 0 6px ${primaryColor}`,
              }}
            />
          )}
        </p>

        {/* ── REDACTION BARS ── */}
        <div
          style={{
            position: 'relative',
            margin: '8px 0 20px 0',
            fontSize: isVertical ? '16px' : '14px',
            lineHeight: 1.5,
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          <span
            style={{
              color: redactProgress > 0.8 ? 'rgba(226, 232, 240, 0.7)' : 'transparent',
              transition: 'color 0.3s',
            }}
          >
            {effRedacted}
          </span>
          {/* Black redaction bar that slides away */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${Math.max(0, (1 - redactProgress) * 100)}%`,
              backgroundColor: '#000000',
              borderRadius: '2px',
              transition: 'width 0.1s',
              boxShadow: redactProgress < 1 ? '2px 0 8px rgba(0,0,0,0.8)' : 'none',
            }}
          />
          {/* Redaction label */}
          {redactProgress < 0.5 && (
            <span
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'rgba(255, 255, 255, 0.15)',
                fontSize: '10px',
                letterSpacing: '3px',
                fontWeight: 800,
              }}
            >
              [REDACTED]
            </span>
          )}
        </div>

        {/* ── MARGIN ANNOTATION ── */}
        <div
          style={{
            position: 'absolute',
            right: isVertical ? -4 : -4,
            top: '45%',
            transform: `rotate(90deg) translateX(${(1 - marginEnter) * 30}px)`,
            transformOrigin: 'right center',
            opacity: marginEnter * 0.65,
            fontFamily: "'Segoe Script', 'Brush Script MT', cursive",
            fontSize: '13px',
            color: '#EF4444',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {effMargin}
        </div>

        {/* ── RODAPÉ COM CÓDIGO DE BARRAS ANIMADO ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '16px',
            marginTop: '8px',
            opacity: barcodeEnter,
            transform: `translateY(${(1 - barcodeEnter) * 10}px)`,
          }}
        >
          {/* Animated barcode — bars fill in sequentially */}
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '24px' }}>
            {[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8].map((w, idx) => {
              const barDelay = Math.max(0, frame - 18 - idx * 0.8);
              const barSpring = spring({
                frame: Math.floor(barDelay),
                fps,
                config: { damping: 18, stiffness: 200 },
              });

              return (
                <div
                  key={idx}
                  style={{
                    width: `${(w % 3) + 1.5}px`,
                    height: `${barSpring * 100}%`,
                    backgroundColor: '#FFFFFF',
                    opacity: 0.5,
                  }}
                />
              );
            })}
          </div>

          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
            ARQUIVO CENTRAL // AUTORIDADE DE REDE
          </span>
        </div>

        {/* ── CARIMBO DE IMPACTO COM PARTÍCULAS ── */}
        {frame >= STAMP_START && (
          <>
            <div
              style={{
                position: 'absolute',
                bottom: isVertical ? '65px' : '50px',
                right: isVertical ? '30px' : '50px',
                transform: `scale(${stampScale}) rotate(${stampRot}deg)`,
                border: `4px solid ${stampColor}`,
                borderRadius: '10px',
                padding: '8px 24px',
                color: stampColor,
                fontFamily: "'Inter', Impact, sans-serif",
                fontSize: isVertical ? '42px' : '36px',
                fontWeight: 900,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                opacity: stampOpacity,
                boxShadow: `0 0 25px ${stampColor}55, inset 0 0 15px ${stampColor}22`,
                zIndex: 30,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {effStamp}
            </div>

            {/* Impact particles */}
            <ImpactParticles
              frame={frame}
              startFrame={STAMP_START}
              color={stampColor}
              x={isVertical ? 300 : 450}
              y={isVertical ? 500 : 350}
            />
          </>
        )}
      </div>

      {/* ── WORD-LEVEL SYNCHRONIZED KARAOKE CAPTIONS ── */}
      {scene && (
        <CaptionLayer
          scene={scene}
          captionStyle="pop"
          primaryColor={primaryColor}
          accentColor={accentColor}
          format={format}
        />
      )}

      {/* ── WATERMARK ── */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            top: '25px',
            left: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 40,
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: primaryColor,
              boxShadow: `0 0 8px ${primaryColor}`,
            }}
          />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '2px',
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
            }}
          >
            {watermarkText}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Main Multi-Scene Tactile Documentary Dossier Composition ───────────────
export const TactileDocumentaryDossier: React.FC<TactileDossierProps & RemotionShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    return <TactileDossierSceneSingle {...props} />;
  }

  let accumulatedFrames = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#050811' }}>
      {scenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 5;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        return (
          <Sequence
            key={`dossier_seq_${idx}_${scene.captionText?.slice(0, 10) || ''}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <TactileDossierSceneSingle
              scene={scene}
              sceneIndex={idx}
              format={props.format || 'vertical'}
              primaryColor={props.primaryColor || '#00F0FF'}
              accentColor={props.accentColor || '#FFE600'}
              showWatermark={props.showWatermark ?? true}
              watermarkText={props.watermarkText || 'DarkTube Dossier'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
