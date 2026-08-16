// ─────────────────────────────────────────────
// Remotion Types — Darktube Dual-Engine
// ─────────────────────────────────────────────

/**
 * Uma palavra com timestamp exato (vindo do Whisper).
 * Usada para captions pop/karaoke word-by-word.
 */
export interface SubtitleWord {
  word: string;
  startInSeconds: number;
  endInSeconds: number;
}

/**
 * Estilo de animação Ken Burns e Motion OS por cena.
 */
export type AnimationStyle =
  | 'kenburns-right'   // zoom + pan direita
  | 'kenburns-left'    // zoom + pan esquerda
  | 'kenburns-up'      // zoom + pan cima
  | 'kenburns-down'    // zoom + pan baixo
  | 'zoom-punch'       // zoom dramático entrada + sutil saída
  | 'parallax-up'      // pan para cima + zoom leve
  | 'parallax-down'    // pan para baixo + zoom leve
  | 'parallax-left'    // pan para esquerda
  | 'parallax-right'   // pan para direita
  | 'zoom-out'         // zoom out — começa em macro-close e revela
  | 'tilt-3d'          // rotação 3D real no espaço (perspective + rotateX/Y)
  | 'shake-impact'     // tremor de trauma/câmera no clímax
  | 'spin-in'          // rotação rápida com entrada elástica
  | 'bar-chart'        // gráfico de barras animado
  | 'line-chart'       // gráfico de linha animado
  | 'counter-confetti' // contador com confete
  | 'odometer-digit-roll' // odômetro numérico
  | 'typing-code-block'// terminal de código digitando
  | 'terminal-3d';     // terminal 3D

/**
 * Transição de entrada da cena (usada pelo TransitionSeries do @remotion/transitions).
 */
export type TransitionStyle =
  | 'fade'
  | 'slide-right'
  | 'slide-left'
  | 'slide-up'
  | 'slide-down'
  | 'wipe'
  | 'clock-wipe'
  | 'flip'
  | 'rotate'
  | 'zoom-in'
  | 'none';

/**
 * Efeito de texto da cena (adicionado pelo AI Director Remotion).
 */
export type TextEffect =
  | 'split-bounce'   // cada letra entra com spring staggered (After Effects style)
  | 'typewriter'     // caracteres aparecem um por um com cursor
  | 'glitch'         // distorção RGB na entrada
  | 'kinetic-pop'    // escala com recoil de mola
  | 'editorial'      // tipografia bold com barra neon animada
  | 'pop'            // palavra pop com caixa contrastante
  | 'none';          // sem efeito especial

/**
 * Overlays visuais de atmosfera cinematográfica.
 */
export type OverlayEffect = 'glitch' | 'light-leak' | 'flash' | 'particles' | 'none';

/**
 * Perfis de Color Grading emocional.
 */
export type ColorGrading = 'dark-academia' | 'cyberpunk' | 'warm-cinema' | 'dramatic-bw' | 'vibrant-gold' | 'none';

/**
 * Preset de spring physics (adicionado pelo AI Director Remotion).
 */
export type SpringPreset = 'bouncy' | 'smooth' | 'dramatic' | 'gentle';

/**
 * Estilo de legenda.
 */
export type CaptionStyle = 'pop' | 'karaoke' | 'subtitle';

export type SceneType = 'LETTERING' | 'ILUSTRATIVA' | 'HYBRID' | 'DATA_VIZ' | 'CODE_TECH' | 'UI_SHOWCASE' | 'MAP_JOURNEY';

export interface LetteringLine {
  text: string;
  size?: number; // e.g. 90, 130
  weight?: 700 | 800 | 900;
  color?: string; // hex
  isHighlight?: boolean;
  highlightColor?: string;
  badge?: string;
}

export type LivingBgType =
  | 'dot-grid'
  | 'concentric-rings'
  | 'floating-symbols'
  | 'ambient-particles'
  | 'gradient-mesh'
  | 'grid-mesh'
  | 'mesh-gradient'
  | 'clean';

/**
 * Uma cena individual do vídeo.
 * Cada SceneSegment corresponde a um segmento do script gerado pelo Gemini.
 */
export interface SceneSegment {
  /** Índice da cena (0-based) */
  index: number;

  /** Tipo da cena no padrão VERBO Motion OS */
  sceneType?: SceneType;

  /** Linhas de tipografia estruturada para cenas de LETTERING */
  letteringLines?: LetteringLine[];

  /** Tipo de background vivo */
  livingBgType?: LivingBgType;

  /** Badge cinético flutuante (ex: '+350%', '🔥 ALERTA', '💰 $10K') */
  badgeText?: string;
  badgeColor?: string;

  /** URL do áudio de narração DESTA cena (gerado pelo Edge-TTS) */
  audioUrl?: string;

  /** URL da imagem gerada para esta cena (Flux / Gemini Imagen) */
  imageUrl?: string;

  /** URL do sujeito recortado em PNG transparente para Parallax 2.5D */
  subjectImageUrl?: string;
  foregroundUrl?: string;

  /** Texto completo do segmento (usado para subtitle e fallback) */
  captionText?: string;

  /**
   * Palavras com timestamps por palavra (vindo do Whisper).
   * Se vazio, usa estimativa linear (captionText / durationSeconds).
   */
  words?: SubtitleWord[];

  /** Duração real da cena em segundos (do timestamp do script) */
  durationSeconds: number;

  /** Estilo de animação de imagem desta cena */
  animationStyle?: AnimationStyle;

  /** Transição de entrada desta cena (para TransitionSeries) */
  transitionIn?: TransitionStyle;

  /** Duração da transição em frames */
  transitionDurationFrames?: number;

  /** Efeito de texto (adicionado pelo AI Director Remotion) */
  textEffect?: TextEffect;

  /** Efeito de overlay de entrada */
  overlayEffect?: OverlayEffect;

  /** Efeito de overlay de entrada (alias legado para compatibilidade) */
  captionEffect?: 'glitch' | 'light-leak' | 'flash' | 'bounce' | 'clip-wipe' | 'glitch-rgb' | 'editorial' | string;

  /** Perfil de Color Grading */
  colorGrading?: ColorGrading;

  /** Preset de spring para as animações */
  springPreset?: SpringPreset;

  /** Intensidade geral das animações 0.0–1.0 */
  intensity?: number;

  /** Cor emocional da cena (hex, adicionado pelo AI Director) */
  emotionColor?: string;
}

/**
 * Props principais da composição ShortVideo.
 * Enviados pelo n8n no payload de renderização.
 */
export interface RemotionShortProps {
  /** Lista de cenas do vídeo */
  scenes?: SceneSegment[];

  /** URL da música de fundo (opcional) */
  backgroundMusicUrl?: string;

  /** Estilo de legenda para todas as cenas */
  captionStyle?: CaptionStyle;

  /** Cor principal (legendas, watermark, efeitos) */
  primaryColor?: string;

  /** Cor de texto secundária */
  accentColor?: string;

  /** Exibir watermark */
  showWatermark?: boolean;

  /** Texto do watermark */
  watermarkText?: string;

  /** Formato do vídeo */
  format?: 'vertical' | 'horizontal';
}

/**
 * @deprecated — mantido para compatibilidade retroativa com scripts antigos
 * Use SceneSegment e RemotionShortProps em vez destes.
 */
export interface ScriptSegmentMedia {
  timestamp?: string;
  segment_type?: string;
  mediaUrl?: string;
  voiceoverText?: string;
  imagePrompt?: string;
}

// ─────────────────────────────────────────────
// Dark Clips Remotion Types
// ─────────────────────────────────────────────

export interface DarkClipsVideoProps {
  videoUrl?: string;
  durationInSeconds?: number;
  
  // Header
  profileHeader?: {
    avatarUrl?: string;
    name?: string;
    handle?: string;
    badgeType?: 'none' | 'blue' | 'gold' | 'gray';
    showHeader?: boolean;
    paddingTop?: number;
    yOffset?: number;
    textAlign?: 'left' | 'center' | 'right';
    scale?: number; // 50 to 180 percentage
    avatarSize?: number; // px
    fontSize?: number; // px
  };

  // Headline
  headline?: {
    mainText?: string;
    subText?: string;
    showMainText?: boolean;
    showSubText?: boolean;
    fontFamily?: string;
    fontSize?: number;
    primaryColor?: string; // e.g. '#FACC15'
    secondaryColor?: string; // e.g. '#FFFFFF'
    textAlign?: 'left' | 'center' | 'right';
    mainTextAlign?: 'left' | 'center' | 'right';
    subTextAlign?: 'left' | 'center' | 'right';
    uppercase?: boolean;
    mainTextUppercase?: boolean;
    subTextUppercase?: boolean;
    textShadow?: boolean;
    yOffset?: number;
    mainTextYOffset?: number; // percentage or px
    subTextYOffset?: number; // percentage or px
  };

  // Watermark / Marca d'água
  watermark?: {
    enabled?: boolean;
    type?: 'text' | 'image';
    text?: string;
    imageUrl?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
    xOffset?: number; // 0 - 100 percentage
    yOffset?: number; // 0 - 100 percentage
    opacity?: number; // 10 - 100 percentage
    fontSize?: number; // px
    scale?: number; // 50 - 180 percentage
    color?: string;
    hasShadow?: boolean;
  };

  // Video Placement
  videoPlacement?: {
    yOffset?: number; // 0 - 100 percentage
    scale?: number; // 50 - 100 percentage
    borderRadius?: number; // px
    hasShadow?: boolean;
    aspectRatio?: string;
  };

  // Background
  background?: {
    type?: 'black' | 'white' | 'blur' | 'gradient' | 'neon' | 'zinc' | 'color';
    blurIntensity?: number;
    overlayOpacity?: number;
    customColor?: string;
  };

  // Footer / CTA
  footer?: {
    showFooter?: boolean;
    text?: string;
    fontSize?: number;
    color?: string;
    yOffset?: number;
    textAlign?: 'left' | 'center' | 'right';
    scale?: number;
  };
}

