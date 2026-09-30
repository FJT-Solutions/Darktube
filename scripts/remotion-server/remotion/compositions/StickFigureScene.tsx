import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type StickEra =
  | 'caveman'     // Descoberta do fogo
  | 'agriculture' // Agricultura e vilas
  | 'empires'     // Guerras e pirâmides
  | 'industrial'  // Revolução industrial e vapor
  | 'space'       // Lua e computadores
  | 'ai_future';   // Smartphones e Inteligência Artificial

export interface StickFigureSceneProps {
  era?: StickEra;
  headline?: string;
  subheadline?: string;
  badgeText?: string;
  primaryColor?: string;
  format?: 'vertical' | 'horizontal';
  durationFrames?: number;
}

/**
 * Motor de Animação Stick Figure ULTRA (Estilo OverSimplified / Kurzgesagt / MinutePhysics)
 * Personagens vetoriais com expressões vivas (piscar, boca falante, pupilas),
 * física de molas (springs), squash & stretch, faíscas, nuvens de poeira e props detalhadas.
 */
export const StickFigureScene: React.FC<StickFigureSceneProps> = ({
  era = 'caveman',
  headline = 'A DESCOBERTA DO FOGO',
  badgeText = '200.000 ANOS ATRÁS',
  primaryColor = '#FFE600',
  format = 'vertical',
  durationFrames = 150,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = format === 'vertical';

  // Mola de entrada dos elementos
  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  // Jitter sutil determinístico para simular traço feito à mão (OverSimplified / MinutePhysics)
  const wobble = Math.sin(frame * 0.4) * 1.5;
  const breathe = Math.sin(frame * 0.15) * 4;

  const groundY = isVertical ? 1340 : 760;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#090D16',
        overflow: 'hidden',
        fontFamily: "'Montserrat', 'Inter', sans-serif",
      }}
    >
      {/* ── FUNDO DE PAPEL SKETCH / TEXTURA DE CADERNO MILIMETRADO ── */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }}>
        <defs>
          <pattern id="stick-grid" width="54" height="54" patternUnits="userSpaceOnUse">
            <path d="M 54 0 L 0 0 0 54" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#stick-grid)" />
      </svg>

      {/* ── CÉU & ELEMENTOS DE AMBIENTAÇÃO MINIMALISTAS ── */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2 }}>
        {/* Sol / Lua / Estrelas dependendo da era */}
        {era === 'caveman' || era === 'agriculture' ? (
          <g transform={`translate(${isVertical ? 920 : 1600}, 240)`}>
            {/* Sol desenhado a mão com raios */}
            <circle cx="0" cy="0" r="48" fill="#FDE047" opacity="0.85" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, ai) => {
              const rad = (angle * Math.PI) / 180;
              const r1 = 60 + Math.sin(frame * 0.1 + ai) * 4;
              const r2 = 78 + Math.sin(frame * 0.1 + ai) * 6;
              return (
                <line
                  key={ai}
                  x1={Math.cos(rad) * r1}
                  y1={Math.sin(rad) * r1}
                  x2={Math.cos(rad) * r2}
                  y2={Math.sin(rad) * r2}
                  stroke="#FDE047"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.75"
                />
              );
            })}
          </g>
        ) : null}

        {/* Nuvens estilizadas rabiscadas à mão */}
        {(era === 'caveman' || era === 'agriculture' || era === 'industrial') && (
          <g opacity="0.35" transform={`translate(${(frame * 0.4) % 1200 - 150}, 300)`}>
            <path
              d="M 50 40 Q 65 20 90 25 Q 115 10 145 25 Q 175 15 190 40 Q 210 55 190 70 L 50 70 Q 30 55 50 40 Z"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>

      {/* ── LINHA DO CHÃO (GROUND) E RANHURAS FEITAS À MÃO ── */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 5,
        }}
      >
        <line
          x1="0"
          y1={groundY}
          x2="2000"
          y2={groundY}
          stroke="#475569"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Grama/Ranhuras do chão desenhadas à mão */}
        {[80, 220, 380, 540, 700, 860, 1020].map((gx, gi) => (
          <path
            key={gi}
            d={`M ${gx} ${groundY} L ${gx - 12} ${groundY - 18} M ${gx} ${groundY} L ${gx + 10} ${groundY - 22}`}
            stroke="#64748B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* ── CABEÇALHO COM BADGE HISTÓRICO (OverSimplified Style) ── */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? '90px' : '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          zIndex: 20,
          width: '90%',
          opacity: enterSpring,
        }}
      >
        <div
          style={{
            backgroundColor: primaryColor,
            color: '#000000',
            fontWeight: 900,
            fontSize: isVertical ? '22px' : '17px',
            padding: '7px 24px',
            borderRadius: '999px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            boxShadow: '0 6px 0 rgba(0,0,0,0.6)',
          }}
        >
          {badgeText}
        </div>
        <h1
          style={{
            color: '#FFFFFF',
            fontSize: isVertical ? '44px' : '36px',
            fontWeight: 900,
            textAlign: 'center',
            margin: '2px 0 0 0',
            textShadow: '0 4px 18px rgba(0,0,0,0.9)',
            letterSpacing: '-1px',
            textTransform: 'uppercase',
          }}
        >
          {headline}
        </h1>
      </div>

      {/* ── PALCO CENTRAL: PERSONAGEM STICK + ELEMENTOS DA ERA ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <svg
          viewBox="0 0 1080 1920"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          {era === 'caveman' && (
            <CavemanScene frame={frame} fps={fps} isVertical={isVertical} wobble={wobble} breathe={breathe} groundY={groundY} />
          )}
          {era === 'agriculture' && (
            <AgricultureScene frame={frame} fps={fps} isVertical={isVertical} wobble={wobble} groundY={groundY} />
          )}
          {era === 'empires' && (
            <EmpiresScene frame={frame} fps={fps} isVertical={isVertical} wobble={wobble} groundY={groundY} />
          )}
          {era === 'industrial' && (
            <IndustrialScene frame={frame} fps={fps} isVertical={isVertical} wobble={wobble} groundY={groundY} />
          )}
          {era === 'space' && (
            <SpaceScene frame={frame} fps={fps} isVertical={isVertical} wobble={wobble} groundY={groundY} />
          )}
          {era === 'ai_future' && (
            <AIFutureScene frame={frame} fps={fps} isVertical={isVertical} wobble={wobble} groundY={groundY} primaryColor={primaryColor} />
          )}
        </svg>
      </div>

      {/* Nota: O bloco repetido no rodapé foi REMOVIDO para deixar o terço inferior 100% limpo e focado nas legendas sincronizadas palavra por palavra! */}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: CAVEMAN & DESCOBERTA DO FOGO
// ─────────────────────────────────────────────────────────────────────────────
const CavemanScene: React.FC<{
  frame: number;
  fps: number;
  isVertical: boolean;
  wobble: number;
  breathe: number;
  groundY: number;
}> = ({ frame, fps, wobble, breathe, groundY }) => {
  const stickX = 430;
  const stickY = groundY - 260;

  // Animação de alegria: braços para cima após descobrir o fogo
  const armsUp = interpolate(frame, [22, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const jump = Math.abs(Math.sin(frame * 0.28)) * (armsUp * 32);

  // Fogo crescendo com brilho
  const fireScale = interpolate(frame, [15, 45], [0.1, 1.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const flameFlicker = Math.sin(frame * 0.8) * 10;

  // Expressão facial: piscar e boca falante
  const isBlinking = frame % 70 < 4;
  const mouthTalk = Math.abs(Math.sin(frame * 0.5)) * 6;

  return (
    <g>
      {/* Pedra/Fogueira no Chão */}
      <g transform={`translate(680, ${groundY})`}>
        {/* Lenha */}
        <line x1="-45" y1="-12" x2="45" y2="0" stroke="#78350F" strokeWidth="14" strokeLinecap="round" />
        <line x1="-35" y1="0" x2="40" y2="-14" stroke="#92400E" strokeWidth="14" strokeLinecap="round" />

        {/* Chamas de Fogo Animadas */}
        {frame > 15 && (
          <g transform={`scale(${fireScale}) translate(0, -28)`}>
            <circle r="70" fill="#F97316" opacity="0.35" style={{ filter: 'blur(20px)' }} />
            {/* Chama externa */}
            <path
              d={`M -28 0 Q 0 ${-95 + flameFlicker} 28 0 Q 0 -22 -28 0`}
              fill="#EF4444"
            />
            {/* Chama interna amarela */}
            <path
              d={`M -16 0 Q 0 ${-65 + flameFlicker * 0.8} 16 0 Q 0 -14 -16 0`}
              fill="#FDE047"
            />
          </g>
        )}
      </g>

      {/* Nuvenzinha de poeira quando o stickman pula */}
      {armsUp > 0.6 && jump < 8 && (
        <g transform={`translate(${stickX}, ${groundY})`} opacity={0.6}>
          <circle cx="-25" cy="-8" r="8" fill="#64748B" />
          <circle cx="25" cy="-8" r="8" fill="#64748B" />
        </g>
      )}

      {/* ── BONECO PALITO (STICKMAN CAVEMAN) ── */}
      <g transform={`translate(${stickX}, ${stickY - jump})`}>
        {/* Cabeça */}
        <circle cx="0" cy="-60" r="44" fill="#FFFFFF" stroke="#000000" strokeWidth="8" />

        {/* Olhos expressivos com piscar e pupilas */}
        {isBlinking ? (
          <>
            <line x1="10" y1="-64" x2="22" y2="-64" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
            <line x1="26" y1="-64" x2="38" y2="-64" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="16" cy="-64" r="6" fill="#000000" />
            <circle cx="32" cy="-64" r="6" fill="#000000" />
            {/* Brilho da pupila */}
            <circle cx="18" cy="-66" r="2" fill="#FFFFFF" />
            <circle cx="34" cy="-66" r="2" fill="#FFFFFF" />
          </>
        )}

        {/* Sobrancelhas animadas */}
        <line x1="12" y1="-74" x2="22" y2={armsUp > 0.5 ? -77 : -73} stroke="#000000" strokeWidth="4" strokeLinecap="round" />
        <line x1="26" y1={armsUp > 0.5 ? -77 : -73} x2="36" y2="-74" stroke="#000000" strokeWidth="4" strokeLinecap="round" />

        {/* Boca animada falando / sorriso de vitória */}
        {armsUp > 0.5 ? (
          <ellipse cx="24" cy="-45" rx="10" ry={8 + mouthTalk} fill="#EF4444" stroke="#000000" strokeWidth="3" />
        ) : (
          <path d="M 14 -46 Q 24 -40 34 -46" fill="none" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
        )}

        {/* Cabelo espetado de homem das cavernas */}
        <path d="M -22 -98 L -12 -122 L 0 -98 L 14 -124 L 24 -98" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />

        {/* Tronco / Espinha */}
        <line x1="0" y1="-16" x2="0" y2="105" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />

        {/* Braço Esquerdo */}
        <line
          x1="0"
          y1="12"
          x2={interpolate(armsUp, [0, 1], [40, -50])}
          y2={interpolate(armsUp, [0, 1], [50, -45])}
          stroke="#FFFFFF"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Braço Direito (Apontando para o fogo ou comemorando) */}
        <line
          x1="0"
          y1="12"
          x2={interpolate(armsUp, [0, 1], [75, 55])}
          y2={interpolate(armsUp, [0, 1], [30, -55])}
          stroke="#FFFFFF"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Pernas */}
        <line x1="0" y1="105" x2="-35" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
        <line x1="0" y1="105" x2="35" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />

        {/* Balão de fala animado ("FOGO!!") */}
        {armsUp > 0.7 && (
          <g transform="translate(60, -110)">
            <rect x="0" y="0" width="130" height="52" rx="14" fill="#FFE600" stroke="#000000" strokeWidth="4" />
            <polygon points="15,52 35,52 10,72" fill="#FFE600" stroke="#000000" strokeWidth="3" />
            <text x="65" y="34" fill="#000000" fontSize="22" fontWeight="900" textAnchor="middle">
              FOGO!!
            </text>
          </g>
        )}
      </g>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: AGRICULTURA & COLHEITA
// ─────────────────────────────────────────────────────────────────────────────
const AgricultureScene: React.FC<{
  frame: number;
  fps: number;
  isVertical: boolean;
  wobble: number;
  groundY: number;
}> = ({ frame, wobble, groundY }) => {
  const stickX = 360;
  const stickY = groundY - 260;

  // Movimento de arar a terra
  const hoeAngle = Math.sin(frame * 0.2) * 25;
  const isBlinking = frame % 80 < 4;

  return (
    <g>
      {/* Casinha de tijolos / Primeira vila humana */}
      <g transform={`translate(740, ${groundY - 210})`}>
        {/* Parede da casa */}
        <rect x="0" y="0" width="200" height="210" fill="#EA580C" stroke="#000000" strokeWidth="8" rx="8" />
        {/* Telhado de palha/terracota */}
        <polygon points="-25,0 100,-90 225,0" fill="#FACC15" stroke="#000000" strokeWidth="8" />
        {/* Porta */}
        <rect x="30" y="80" width="55" height="130" fill="#78350F" stroke="#000000" strokeWidth="6" rx="4" />
        {/* Janela com cruz */}
        <rect x="120" y="40" width="55" height="55" fill="#38BDF8" stroke="#000000" strokeWidth="6" rx="4" />
        <line x1="147" y1="40" x2="147" y2="95" stroke="#000000" strokeWidth="4" />
        <line x1="120" y1="67" x2="175" y2="67" stroke="#000000" strokeWidth="4" />
      </g>

      {/* Plantações de Trigo crescendo */}
      {[530, 580, 630].map((cropX, idx) => {
        const cropH = interpolate(frame, [0, 40], [30, 80 + idx * 8], { extrapolateRight: 'clamp' });
        return (
          <g key={idx} transform={`translate(${cropX}, ${groundY})`}>
            <line x1="0" y1="0" x2="0" y2={-cropH} stroke="#22C55E" strokeWidth="7" strokeLinecap="round" />
            <circle cx="-10" cy={-cropH + 15} r="7" fill="#FACC15" />
            <circle cx="10" cy={-cropH + 25} r="7" fill="#FACC15" />
            <circle cx="0" cy={-cropH} r="8" fill="#FACC15" />
          </g>
        );
      })}

      {/* ── AGRICULTOR STICKMAN ── */}
      <g transform={`translate(${stickX}, ${stickY})`}>
        {/* Chapéu de Palha */}
        <polygon points="-55,-88 0,-125 55,-88" fill="#FDE047" stroke="#000000" strokeWidth="7" />
        <line x1="-68" y1="-88" x2="68" y2="-88" stroke="#000000" strokeWidth="8" strokeLinecap="round" />

        {/* Cabeça */}
        <circle cx="0" cy="-60" r="44" fill="#FFFFFF" stroke="#000000" strokeWidth="8" />

        {/* Olhos com piscar */}
        {isBlinking ? (
          <line x1="10" y1="-62" x2="25" y2="-62" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
        ) : (
          <circle cx="18" cy="-62" r="6" fill="#000000" />
        )}
        {/* Sorriso satisfeito */}
        <path d="M 12 -46 Q 22 -38 32 -46" fill="none" stroke="#000000" strokeWidth="4" strokeLinecap="round" />

        {/* Tronco */}
        <line x1="0" y1="-16" x2="0" y2="105" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />

        {/* Braço segurando a enxada */}
        <g transform={`translate(0, 20) rotate(${hoeAngle})`}>
          <line x1="0" y1="0" x2="65" y2="50" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
          {/* Cabo da Enxada */}
          <line x1="20" y1="-40" x2="90" y2="180" stroke="#92400E" strokeWidth="8" strokeLinecap="round" />
          {/* Lâmina da Enxada */}
          <line x1="85" y1="180" x2="115" y2="185" stroke="#94A3B8" strokeWidth="14" strokeLinecap="round" />
        </g>

        {/* Pernas inclinadas arando */}
        <line x1="0" y1="105" x2="-45" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
        <line x1="0" y1="105" x2="25" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      </g>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: GRANDES IMPÉRIOS & GUERRAS (Egito / Roma / Mesopotâmia)
// ─────────────────────────────────────────────────────────────────────────────
const EmpiresScene: React.FC<{
  frame: number;
  fps: number;
  isVertical: boolean;
  wobble: number;
  groundY: number;
}> = ({ frame, groundY }) => {
  const stickX = 400;
  const stickY = groundY - 260;

  // Confronto de espadas: choque periódico
  const clashCycle = frame % 30;
  const swordClash = clashCycle < 8;

  return (
    <g>
      {/* Pirâmide do Egito ao fundo com perspectiva imponente */}
      <g transform={`translate(160, ${groundY})`}>
        <polygon points="0,0 260,-400 520,0" fill="#D97706" opacity="0.45" stroke="#B45309" strokeWidth="6" />
        <polygon points="260,-400 520,0 440,0" fill="#92400E" opacity="0.4" />
      </g>

      {/* Faíscas no ponto de choque da espada */}
      {swordClash && (
        <g transform={`translate(550, ${groundY - 200})`}>
          <circle r="30" fill="#FFE600" opacity="0.6" style={{ filter: 'blur(10px)' }} />
          {[0, 60, 120, 180, 240, 300].map((deg, di) => {
            const r = (deg * Math.PI) / 180;
            return (
              <line
                key={di}
                x1={0}
                y1={0}
                x2={Math.cos(r) * 36}
                y2={Math.sin(r) * 36}
                stroke="#FFE600"
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
          {/* Balãozinho cômico "CLANG!!" */}
          <g transform="translate(-40, -50)">
            <rect x="0" y="0" width="85" height="34" rx="8" fill="#EF4444" stroke="#000" strokeWidth="3" />
            <text x="42" y="23" fill="#FFFFFF" fontSize="16" fontWeight="900" textAnchor="middle">
              CLANG!
            </text>
          </g>
        </g>
      )}

      {/* ── SOLDADO 1: ROMANO (Escudo Vermelho e Espada) ── */}
      <g transform={`translate(${stickX}, ${stickY})`}>
        {/* Capacete Romano com pluma vermelha */}
        <polygon points="-30,-80 0,-115 30,-80" fill="#EF4444" stroke="#000000" strokeWidth="6" />
        <line x1="-35" y1="-75" x2="35" y2="-75" stroke="#EAB308" strokeWidth="8" strokeLinecap="round" />

        {/* Cabeça */}
        <circle cx="0" cy="-60" r="44" fill="#FFFFFF" stroke="#000000" strokeWidth="8" />
        <circle cx="16" cy="-62" r="6" fill="#000000" />
        {/* Expressão feroz de batalha */}
        <line x1="8" y1="-74" x2="24" y2="-68" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="20" cy="-45" rx="8" ry="6" fill="#000000" />

        {/* Tronco */}
        <line x1="0" y1="-16" x2="0" y2="105" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />

        {/* Escudo Scutum Romano Vermelho */}
        <rect x="-35" y="10" width="45" height="120" rx="10" fill="#DC2626" stroke="#EAB308" strokeWidth="6" />

        {/* Braço com Espada Gladius dando golpe */}
        <line x1="0" y1="20" x2={swordClash ? 95 : 70} y2={swordClash ? 5 : 20} stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
        <line x1={swordClash ? 95 : 70} y1={swordClash ? 5 : 20} x2={swordClash ? 150 : 120} y2={swordClash ? -10 : -40} stroke="#E2E8F0" strokeWidth="12" strokeLinecap="round" />

        {/* Pernas firmes */}
        <line x1="0" y1="105" x2="-45" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
        <line x1="0" y1="105" x2="35" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      </g>

      {/* ── SOLDADO 2: OPONENTE DEFENDENDO ── */}
      <g transform={`translate(${stickX + 310}, ${stickY}) scale(-1, 1)`}>
        <circle cx="0" cy="-60" r="44" fill="#FFFFFF" stroke="#000000" strokeWidth="8" />
        <circle cx="16" cy="-62" r="6" fill="#000000" />
        <line x1="0" y1="-16" x2="0" y2="105" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
        {/* Espada Defendendo */}
        <line x1="0" y1="20" x2={swordClash ? 95 : 70} y2={swordClash ? 5 : 30} stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
        <line x1={swordClash ? 95 : 70} y1={swordClash ? 5 : 30} x2={swordClash ? 150 : 110} y2={swordClash ? -10 : -60} stroke="#94A3B8" strokeWidth="12" strokeLinecap="round" />
        <line x1="0" y1="105" x2="-40" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
        <line x1="0" y1="105" x2="35" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      </g>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: REVOLUÇÃO INDUSTRIAL & MÁQUINAS A VAPOR
// ─────────────────────────────────────────────────────────────────────────────
const IndustrialScene: React.FC<{
  frame: number;
  fps: number;
  isVertical: boolean;
  wobble: number;
  groundY: number;
}> = ({ frame, groundY }) => {
  const stickX = 400;
  const stickY = groundY - 260;

  // Rotação de engrenagens mecânicas
  const gearRot = frame * 3.5;

  return (
    <g>
      {/* Fábrica com chaminés enfumaçadas */}
      <g transform={`translate(700, ${groundY - 290})`}>
        {/* Prédio da Fábrica */}
        <rect x="0" y="90" width="220" height="200" fill="#334155" stroke="#000000" strokeWidth="8" />
        {/* Chaminé 1 */}
        <polygon points="40,90 45,0 75,0 80,90" fill="#475569" stroke="#000000" strokeWidth="7" />
        {/* Chaminé 2 */}
        <polygon points="120,90 125,15 155,15 160,90" fill="#475569" stroke="#000000" strokeWidth="7" />

        {/* Fumaça procedural saindo em círculos expansivos */}
        {[0, 1, 2, 3].map((puffIdx) => {
          const puffFrame = (frame + puffIdx * 18) % 70;
          const puffY = -puffFrame * 3;
          const puffScale = interpolate(puffFrame, [0, 70], [0.3, 1.8]);
          const puffOpacity = interpolate(puffFrame, [0, 50, 70], [0.8, 0.6, 0]);
          return (
            <circle
              key={puffIdx}
              cx={60 + Math.sin(puffFrame * 0.1) * 20}
              cy={puffY}
              r="22"
              fill="#94A3B8"
              opacity={puffOpacity}
              transform={`scale(${puffScale})`}
            />
          );
        })}
      </g>

      {/* Engrenagens Industriais Girando */}
      <g transform={`translate(240, ${groundY - 140}) rotate(${gearRot})`}>
        <circle r="60" fill="#475569" stroke="#000000" strokeWidth="8" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((ang, gi) => (
          <rect
            key={gi}
            x="-12"
            y="-75"
            width="24"
            height="22"
            fill="#64748B"
            stroke="#000000"
            strokeWidth="5"
            transform={`rotate(${ang})`}
          />
        ))}
        <circle r="22" fill="#0F172A" />
      </g>

      <g transform={`translate(325, ${groundY - 80}) rotate(${-gearRot * 1.3})`}>
        <circle r="40" fill="#64748B" stroke="#000000" strokeWidth="7" />
        {[0, 60, 120, 180, 240, 300].map((ang, gi) => (
          <rect
            key={gi}
            x="-9"
            y="-50"
            width="18"
            height="18"
            fill="#475569"
            stroke="#000000"
            strokeWidth="4"
            transform={`rotate(${ang})`}
          />
        ))}
        <circle r="15" fill="#0F172A" />
      </g>

      {/* ── MAGNATA INDUSTRIAL COM CARTOLA PUXANDO ALAVANCA ── */}
      <g transform={`translate(${stickX}, ${stickY})`}>
        {/* Cartola Vitoriana */}
        <rect x="-24" y="-120" width="48" height="45" fill="#000000" stroke="#FFFFFF" strokeWidth="4" />
        <line x1="-36" y1="-75" x2="36" y2="-75" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />

        {/* Cabeça */}
        <circle cx="0" cy="-60" r="44" fill="#FFFFFF" stroke="#000000" strokeWidth="8" />
        {/* Monóculo Vitoriano de ouro no olho direito! */}
        <circle cx="22" cy="-64" r="10" fill="none" stroke="#FACC15" strokeWidth="4" />
        <line x1="22" y1="-54" x2="32" y2="-20" stroke="#FACC15" strokeWidth="2.5" />
        <circle cx="22" cy="-64" r="4" fill="#000000" />
        <circle cx="6" cy="-64" r="5" fill="#000000" />

        {/* Tronco */}
        <line x1="0" y1="-16" x2="0" y2="105" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />

        {/* Braço segurando a alavanca de vapor */}
        <line x1="0" y1="15" x2="55" y2="35" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
        {/* Alavanca Industrial de Metal */}
        <line x1="55" y1="120" x2="55" y2="25" stroke="#EF4444" strokeWidth="12" strokeLinecap="round" />
        <circle cx="55" cy="22" r="14" fill="#DC2626" stroke="#000000" strokeWidth="4" />

        {/* Pernas */}
        <line x1="0" y1="105" x2="-35" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
        <line x1="0" y1="105" x2="35" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      </g>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: ERA ESPACIAL & INTERNET (Apollo / Lua / Satélites)
// ─────────────────────────────────────────────────────────────────────────────
const SpaceScene: React.FC<{
  frame: number;
  fps: number;
  isVertical: boolean;
  wobble: number;
  groundY: number;
}> = ({ frame, groundY }) => {
  const stickX = 420;
  const stickY = groundY - 260;

  // Foguete voando para cima com propulsores
  const rocketY = interpolate(frame, [0, 80], [groundY - 100, -120], { extrapolateRight: 'clamp' });
  const thrusterFlame = Math.sin(frame * 0.9) * 12;

  return (
    <g>
      {/* Estrelas cintilantes de fundo */}
      {[
        [150, 180], [320, 260], [520, 140], [780, 220], [920, 160], [200, 420], [840, 440]
      ].map(([sx, sy], sIdx) => {
        const starTwinkle = Math.sin(frame * 0.2 + sIdx) * 0.4 + 0.6;
        return (
          <circle key={sIdx} cx={sx} cy={sy} r="3.5" fill="#FFFFFF" opacity={starTwinkle} />
        );
      })}

      {/* Lua com crateras no céu */}
      <g transform={`translate(780, 360)`}>
        <circle r="75" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="6" />
        <circle cx="-25" cy="-20" r="16" fill="#CBD5E1" />
        <circle cx="20" cy="15" r="22" fill="#CBD5E1" />
        <circle cx="-10" cy="30" r="12" fill="#CBD5E1" />
      </g>

      {/* Foguete Espacial subindo */}
      <g transform={`translate(260, ${rocketY})`}>
        {/* Chamas do propulsor */}
        <polygon points="-18,70 0,130 18,70" fill="#EF4444" />
        <polygon points="-10,70 0,110 10,70" fill="#FACC15" />
        {/* Corpo do Foguete */}
        <polygon points="0,-80 40,70 -40,70" fill="#FFFFFF" stroke="#000000" strokeWidth="8" />
        {/* Aletas laterais */}
        <polygon points="-40,40 -65,70 -40,70" fill="#EF4444" stroke="#000000" strokeWidth="6" />
        <polygon points="40,40 65,70 40,70" fill="#EF4444" stroke="#000000" strokeWidth="6" />
        {/* Janela circular do foguete */}
        <circle cx="0" cy="10" r="18" fill="#38BDF8" stroke="#000000" strokeWidth="6" />
      </g>

      {/* ── ASTRONAUTA STICKMAN FINCANDO A BANDEIRA ── */}
      <g transform={`translate(${stickX}, ${stickY})`}>
        {/* Capacete de Astronauta com visor espelhado */}
        <circle cx="0" cy="-60" r="54" fill="#0F172A" stroke="#38BDF8" strokeWidth="9" />
        <ellipse cx="14" cy="-60" rx="30" ry="24" fill="#000000" />
        <circle cx="18" cy="-64" r="8" fill="#38BDF8" opacity="0.8" />

        {/* Mochila de oxigênio nas costas */}
        <rect x="-42" y="-30" width="22" height="70" rx="8" fill="#64748B" stroke="#000000" strokeWidth="6" />

        {/* Tronco */}
        <line x1="0" y1="-6" x2="0" y2="105" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />

        {/* Braço segurando mastro da bandeira */}
        <line x1="0" y1="20" x2="55" y2="20" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />

        {/* Mastro e Bandeira Lunar */}
        <line x1="55" y1="-80" x2="55" y2="240" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
        <polygon points="55,-80 145,-55 55,-30" fill="#3B82F6" stroke="#000000" strokeWidth="5" />

        {/* Pernas de astronauta com botas */}
        <line x1="0" y1="105" x2="-35" y2="240" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
        <line x1="0" y1="105" x2="25" y2="240" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
      </g>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: ERA DA INTELIGÊNCIA ARTIFICIAL (Humano vs Robô IA)
// ─────────────────────────────────────────────────────────────────────────────
const AIFutureScene: React.FC<{
  frame: number;
  fps: number;
  isVertical: boolean;
  wobble: number;
  groundY: number;
  primaryColor: string;
}> = ({ frame, groundY, primaryColor }) => {
  const stickX = 360;
  const stickY = groundY - 260;

  const phoneGlow = Math.sin(frame * 0.3) * 0.3 + 0.7;

  return (
    <g>
      {/* ── HUMANO COM SMARTPHONE ── */}
      <g transform={`translate(${stickX}, ${stickY})`}>
        {/* Cabeça curvada olhando para a tela */}
        <circle cx="0" cy="-60" r="44" fill="#FFFFFF" stroke="#000000" strokeWidth="8" />
        <circle cx="16" cy="-56" r="6" fill="#000000" />

        {/* Tronco curvado */}
        <path d="M 0 -16 Q 10 45 0 105" stroke="#FFFFFF" strokeWidth="9" fill="none" strokeLinecap="round" />

        {/* Braços segurando o celular brilhante */}
        <line x1="5" y1="25" x2="50" y2="35" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
        {/* Smartphone */}
        <rect x="48" y="10" width="30" height="52" rx="6" fill="#0284C7" stroke="#38BDF8" strokeWidth="4" />
        {/* Brilho da tela na face */}
        <circle cx="63" cy="36" r="35" fill="#38BDF8" opacity={phoneGlow * 0.3} style={{ filter: 'blur(12px)' }} />

        {/* Pernas */}
        <line x1="0" y1="105" x2="-25" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
        <line x1="0" y1="105" x2="25" y2="240" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      </g>

      {/* Onda de Dados / Arco de Conexão com o Robô */}
      <path
        d="M 430 1120 Q 560 980 690 1100"
        fill="none"
        stroke={primaryColor}
        strokeWidth="5"
        strokeDasharray="14 10"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* ── ROBÔ INTELIGÊNCIA ARTIFICIAL (CYBER STICKMAN) ── */}
      <g transform={`translate(720, ${stickY})`}>
        {/* Antena no topo da cabeça */}
        <line x1="0" y1="-85" x2="0" y2="-120" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
        <circle cx="0" cy="-125" r="10" fill="#EF4444" />

        {/* Cabeça Robótica Quadrada */}
        <rect x="-45" y="-85" width="90" height="75" rx="14" fill="#0F172A" stroke={primaryColor} strokeWidth="7" />
        {/* Olhos de LED Digitais */}
        <rect x="-26" y="-60" width="16" height="12" fill={primaryColor} rx="3" />
        <rect x="10" y="-60" width="16" height="12" fill={primaryColor} rx="3" />
        {/* Boca em forma de onda de áudio */}
        <line x1="-20" y1="-32" x2="20" y2="-32" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" />

        {/* Tronco Cibernético com Circuitos Luminosos */}
        <line x1="0" y1="-10" x2="0" y2="105" stroke={primaryColor} strokeWidth="10" strokeDasharray="10 6" strokeLinecap="round" />

        {/* Braço robótico cumprimentando ou analisando */}
        <line x1="0" y1="15" x2="-45" y2="-20" stroke={primaryColor} strokeWidth="8" strokeLinecap="round" />
        <circle cx="-48" cy="-24" r="8" fill="#FACC15" />

        {/* Pernas mecânicas */}
        <line x1="0" y1="105" x2="-35" y2="240" stroke={primaryColor} strokeWidth="9" strokeLinecap="round" />
        <line x1="0" y1="105" x2="35" y2="240" stroke={primaryColor} strokeWidth="9" strokeLinecap="round" />
      </g>
    </g>
  );
};
