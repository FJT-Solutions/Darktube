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

export interface InvestigationBoardProps extends RemotionShortProps {
  headline?: string;
  evidenceItems?: Array<{
    label: string;
    type?: 'photo' | 'document' | 'note';
    status?: 'suspect' | 'confirmed' | 'unknown';
    imageUrl?: string;
  }>;
  connections?: Array<[number, number]>; // pairs of evidence item indices
  stampText?: string;
  primaryColor?: string;
  format?: 'vertical' | 'horizontal';
  scene?: SceneSegment;
  sceneIndex?: number;
}

// ─── Cork Board Texture (Fast Procedural Gradient - Zero CPU Filter Overhead) ─
const CorkTexture: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: '#8B6F47',
      backgroundImage: `
        radial-gradient(ellipse at 20% 30%, rgba(160, 120, 80, 0.4) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 70%, rgba(120, 85, 55, 0.5) 0%, transparent 60%),
        radial-gradient(circle at 50% 50%, rgba(100, 70, 45, 0.3) 0%, transparent 70%),
        repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 2px, transparent 2px, transparent 4px),
        repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 4px)
      `,
    }}
  />
);

// ─── Push Pin ───────────────────────────────────────────────────────────────
const PushPin: React.FC<{
  x: number;
  y: number;
  color: string;
  opacity: number;
  wobble: number;
}> = ({ x, y, color, opacity, wobble }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      transform: `translate(-50%, -100%) rotate(${wobble}deg)`,
      opacity,
      zIndex: 30,
      pointerEvents: 'none',
    }}
  >
    {/* Pin head */}
    <div
      style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 2px 6px rgba(0,0,0,0.5), inset 0 -2px 3px rgba(0,0,0,0.3), 0 0 8px ${color}44`,
      }}
    />
    {/* Pin needle */}
    <div
      style={{
        width: '2px',
        height: '12px',
        backgroundColor: '#888',
        margin: '0 auto',
        borderRadius: '0 0 1px 1px',
      }}
    />
  </div>
);

// ─── Polaroid Photo Card ────────────────────────────────────────────────────
const PolaroidCard: React.FC<{
  label: string;
  type: string;
  status: string;
  rotation: number;
  enterProgress: number;
  frame: number;
  index: number;
  primaryColor: string;
  imageUrl?: string;
}> = ({ label, type, status, rotation, enterProgress, frame, index, primaryColor, imageUrl }) => {
  const wobble = Math.sin(frame * 0.06 + index * 2) * 1.5;
  const swing = Math.sin(frame * 0.04 + index * 1.3) * 0.8;

  const statusColors: Record<string, string> = {
    suspect: '#EF4444',
    confirmed: '#10B981',
    unknown: '#6B7280',
  };
  const statusColor = statusColors[status] || '#6B7280';

  const typeIcons: Record<string, string> = {
    photo: '📷',
    document: '📄',
    note: '📝',
  };
  const icon = typeIcons[type] || '📄';

  return (
    <div
      style={{
        transform: `rotate(${rotation + wobble + swing}deg) scale(${enterProgress})`,
        opacity: enterProgress,
        width: '160px',
        position: 'relative',
      }}
    >
      {/* Polaroid frame */}
      <div
        style={{
          backgroundColor: '#F5F0E8',
          padding: '10px 10px 40px 10px',
          borderRadius: '2px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)',
        }}
      >
        {/* Photo area */}
        <div
          style={{
            width: '140px',
            height: '120px',
            backgroundColor: '#1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {imageUrl ? (
            <Img
              src={imageUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'contrast(1.15) brightness(0.9)',
              }}
            />
          ) : (
            <span style={{ fontSize: '40px', opacity: 0.6 }}>{icon}</span>
          )}

          {/* Status overlay */}
          {status === 'suspect' && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                fontSize: '8px',
                fontWeight: 900,
                padding: '2px 6px',
                borderRadius: '2px',
                letterSpacing: '1px',
              }}
            >
              SUSPECT
            </div>
          )}
        </div>

        {/* Label */}
        <div
          style={{
            marginTop: '8px',
            fontFamily: "'Segoe Script', cursive, sans-serif",
            fontSize: '12px',
            color: '#2D2A26',
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
      </div>

      {/* Status dot */}
      <div
        style={{
          position: 'absolute',
          bottom: '6px',
          right: '6px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          boxShadow: `0 0 6px ${statusColor}`,
        }}
      />
    </div>
  );
};

// ─── Post-It Note ───────────────────────────────────────────────────────────
const PostItNote: React.FC<{
  text: string;
  color: string;
  rotation: number;
  opacity: number;
  x: string;
  y: string;
}> = ({ text, color, rotation, opacity, x, y }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `rotate(${rotation}deg)`,
      opacity,
      zIndex: 15,
    }}
  >
    <div
      style={{
        width: '110px',
        padding: '12px 10px',
        backgroundColor: color,
        boxShadow: '0 3px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        fontFamily: "'Segoe Script', 'Brush Script MT', cursive",
        fontSize: '11px',
        color: '#2D2A26',
        lineHeight: 1.4,
      }}
    >
      {text}
    </div>
  </div>
);

// ─── Red String Connection ──────────────────────────────────────────────────
const RedString: React.FC<{
  x1: number; y1: number;
  x2: number; y2: number;
  progress: number;
  frame: number;
}> = ({ x1, y1, x2, y2, progress, frame }) => {
  const wobble = Math.sin(frame * 0.05) * 2;
  // Catenary curve (slight droop)
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 + 15 + wobble;
  const pathLength = Math.hypot(x2 - x1, y2 - y1);

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 12,
      }}
    >
      <path
        d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
        fill="none"
        stroke="#CC2222"
        strokeWidth="1.5"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength * (1 - progress)}
        opacity={0.8}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      />
    </svg>
  );
};

// ─── Magnifying Glass Spotlight ──────────────────────────────────────────────
const MagnifyingGlass: React.FC<{
  frame: number;
  active: boolean;
}> = ({ frame, active }) => {
  if (!active) return null;

  const x = 50 + Math.sin(frame * 0.02) * 20;
  const y = 45 + Math.cos(frame * 0.015) * 15;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 25 }}>
      <div
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.3)',
          boxShadow: '0 0 30px rgba(255,255,255,0.1), inset 0 0 20px rgba(255,255,255,0.05)',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
        }}
      />
      {/* Handle */}
      <div
        style={{
          position: 'absolute',
          left: `${x + 4}%`,
          top: `${y + 4}%`,
          width: '40px',
          height: '6px',
          backgroundColor: 'rgba(160, 140, 100, 0.5)',
          transform: 'rotate(45deg)',
          borderRadius: '3px',
          transformOrigin: 'left center',
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * InvestigationBoard — Motor de Quadro de Investigação
 *
 * Para: True crime, conspiração, conexões, deep web.
 * Inclui: cork board com textura, polaroid photos com tachinhas,
 * red string connecting evidence, post-it notes com handwriting,
 * map pins, document clips com sombra, push-pin physics,
 * evidence reveal sequencial, magnifying glass spotlight,
 * SUSPECT/CONFIRMED stamps.
 */
export const InvestigationBoardSceneSingle: React.FC<InvestigationBoardProps> = ({
  headline: initialHeadline = 'OPERAÇÃO ATLAS-7',
  evidenceItems = [
    { label: 'Agente Duplo\nIdentidade Alpha', type: 'photo', status: 'suspect' },
    { label: 'Transferência\nBancária Offshore', type: 'document', status: 'confirmed' },
    { label: 'Local do Encontro\nPier 42, Santos', type: 'photo', status: 'unknown' },
    { label: 'Interceptação\nde Comunicações', type: 'document', status: 'confirmed' },
    { label: 'Contato\nDesconhecido', type: 'photo', status: 'suspect' },
  ],
  connections = [[0, 1], [1, 2], [2, 3], [0, 4], [3, 4]],
  stampText = 'CASO ABERTO',
  primaryColor = '#EF4444',
  format = 'vertical',
  scene,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = format === 'vertical';
  const rng = createRng(9999 + sceneIndex * 17);

  const headline = scene?.headline || (scene as any)?.title || initialHeadline;

  // Clone evidence items and apply scene's image/label to the active item
  const items = evidenceItems.map((item, i) => {
    if (scene && i === sceneIndex % evidenceItems.length) {
      return {
        ...item,
        imageUrl: scene.imageUrl || (scene as any).mediaUrl || item.imageUrl,
        label: (scene as any).badgeText || scene.headline || item.label,
        status: (i % 2 === 0 ? 'suspect' : 'confirmed') as 'suspect' | 'confirmed',
      };
    }
    return item;
  });

  // ── Board entrance ──
  const boardEnter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 70, mass: 1.3 },
  });

  // ── Layout positions for evidence items ──
  const positions = isVertical
    ? [
        { x: 25, y: 28 }, { x: 72, y: 25 },
        { x: 20, y: 52 }, { x: 75, y: 55 },
        { x: 50, y: 78 },
      ]
    : [
        { x: 15, y: 30 }, { x: 40, y: 25 },
        { x: 65, y: 30 }, { x: 85, y: 55 },
        { x: 50, y: 65 },
      ];

  // ── Evidence reveal cascade ──
  const evidenceEntries = items.map((_, i) =>
    spring({
      frame: Math.max(0, frame - 10 - i * 8),
      fps,
      config: { damping: 12, stiffness: 120 },
    })
  );

  // ── String connections progress ──
  const stringProgress = interpolate(frame, [25, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  // ── Stamp entrance ──
  const stampFrame = Math.max(0, frame - 55);
  const stampSpring = spring({
    frame: stampFrame,
    fps,
    config: { damping: 8, stiffness: 350, mass: 0.4 },
  });

  // ── Magnifying glass ──
  const showMagnifier = frame > 70;

  // ── Headline ──
  const headlineEnter = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 20, stiffness: 90 },
  });

  // ── Screen shake on stamp ──
  const shakeI = stampFrame > 0 && stampFrame < 8 ? Math.exp(-stampFrame * 0.5) * 5 : 0;
  const shakeX = Math.sin(stampFrame * 14) * shakeI;
  const shakeY = Math.cos(stampFrame * 17) * shakeI;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1A1510',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      {/* ── CORK BOARD BACKGROUND ── */}
      <AbsoluteFill
        style={{
          backgroundColor: '#8B6F47',
          opacity: boardEnter,
        }}
      >
        <CorkTexture />
      </AbsoluteFill>

      {/* ── Ambient lighting ── */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 40% 30%, rgba(255,200,100,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── HEADLINE (pinned at top) ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '60px' : '25px',
          left: '50%',
          transform: `translateX(-50%) translateY(${(1 - headlineEnter) * 20}px)`,
          opacity: headlineEnter,
          zIndex: 20,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(15, 15, 10, 0.88)',
            border: '1px solid rgba(255,255,255,0.18)',
            padding: '10px 24px',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <h2 style={{
            fontSize: isVertical ? '22px' : '18px',
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '3px',
            margin: 0,
            textTransform: 'uppercase',
          }}>
            {headline}
          </h2>
        </div>
        <PushPin x={50} y={-8} color={primaryColor} opacity={headlineEnter} wobble={Math.sin(frame * 0.05) * 3} />
      </div>

      {/* ── RED STRING CONNECTIONS ── */}
      {connections.map(([fromIdx, toIdx], ci) => {
        const from = positions[fromIdx];
        const to = positions[toIdx];
        if (!from || !to) return null;

        const w = isVertical ? 720 : 1280;
        const h = isVertical ? 1280 : 720;
        const perConnectionProgress = interpolate(
          stringProgress,
          [ci / connections.length, (ci + 1) / connections.length],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        return (
          <RedString
            key={ci}
            x1={(from.x / 100) * w}
            y1={(from.y / 100) * h}
            x2={(to.x / 100) * w}
            y2={(to.y / 100) * h}
            progress={perConnectionProgress}
            frame={frame}
          />
        );
      })}

      {/* ── EVIDENCE ITEMS ── */}
      {items.map((item, i) => {
        const pos = positions[i] || { x: 50, y: 50 };
        const rotation = (rng() - 0.5) * 14;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 14,
            }}
          >
            <PushPin
              x={50}
              y={-5}
              color={item.status === 'suspect' ? '#EF4444' : item.status === 'confirmed' ? '#10B981' : '#94A3B8'}
              opacity={evidenceEntries[i]}
              wobble={Math.sin(frame * 0.04 + i * 1.7) * 4}
            />
            <PolaroidCard
              label={item.label}
              type={item.type || 'document'}
              status={item.status || 'unknown'}
              rotation={rotation}
              enterProgress={evidenceEntries[i]}
              frame={frame}
              index={i}
              primaryColor={primaryColor}
              imageUrl={item.imageUrl}
            />
          </div>
        );
      })}

      {/* ── POST-IT NOTES ── */}
      <PostItNote
        text="Verificar alibi do informante"
        color="#FDE68A"
        rotation={-5}
        opacity={interpolate(frame, [40, 50], [0, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        x={isVertical ? '5%' : '3%'}
        y={isVertical ? '68%' : '60%'}
      />
      <PostItNote
        text="Câmera #7 offline desde 03:47"
        color="#FCA5A5"
        rotation={3}
        opacity={interpolate(frame, [45, 55], [0, 0.85], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        x={isVertical ? '70%' : '78%'}
        y={isVertical ? '85%' : '72%'}
      />

      {/* ── MAGNIFYING GLASS ── */}
      <MagnifyingGlass frame={frame} active={showMagnifier} />

      {/* ── WORD-LEVEL SYNCHRONIZED KARAOKE CAPTIONS ── */}
      {scene && (
        <CaptionLayer
          scene={scene}
          captionStyle="pop"
          primaryColor={primaryColor}
          accentColor="#FFE600"
          format={format}
        />
      )}

      {/* ── CASE STAMP ── */}
      {stampFrame > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: isVertical ? '90px' : '50px',
            right: isVertical ? '30px' : '50px',
            transform: `scale(${interpolate(stampSpring, [0, 1], [2.5, 1])}) rotate(-15deg)`,
            border: `4px solid ${primaryColor}`,
            borderRadius: '8px',
            padding: '8px 24px',
            color: primaryColor,
            fontSize: isVertical ? '28px' : '24px',
            fontWeight: 900,
            letterSpacing: '4px',
            textTransform: 'uppercase',
            opacity: interpolate(stampSpring, [0, 0.3, 1], [0, 0.9, 0.85]),
            boxShadow: `0 0 20px ${primaryColor}33`,
            zIndex: 35,
            pointerEvents: 'none',
          }}
        >
          {stampText}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const InvestigationBoardScene: React.FC<InvestigationBoardProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = props.scenes;

  if (!scenes || scenes.length === 0) {
    return <InvestigationBoardSceneSingle {...props} />;
  }

  let accumulatedFrames = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#1A1510' }}>
      {scenes.map((scene, idx) => {
        const durSeconds = scene.durationSeconds || 5;
        const durFrames = Math.max(30, Math.round(durSeconds * fps));
        const fromFrame = accumulatedFrames;
        accumulatedFrames += durFrames;

        return (
          <Sequence
            key={`investigation_seq_${idx}_${scene.captionText?.slice(0, 10) || ''}`}
            from={fromFrame}
            durationInFrames={durFrames}
          >
            <InvestigationBoardSceneSingle
              {...props}
              scene={scene}
              sceneIndex={idx}
              headline={scene.headline || (scene as any).title || props.headline || `EVIDÊNCIA #${idx + 1}`}
              primaryColor={props.primaryColor || '#EF4444'}
              format={props.format || 'vertical'}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const InvestigationBoard = InvestigationBoardScene;
