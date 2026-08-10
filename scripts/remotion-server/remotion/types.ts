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
 * Estilo de animação Ken Burns por cena.
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
  | 'spin-in';         // rotação rápida com entrada elástica

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
  | 'flip'
  | 'clock-wipe'
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

/**
 * Uma cena individual do vídeo.
 * Cada SceneSegment corresponde a um segmento do script gerado pelo Gemini.
 */
export interface SceneSegment {
  /** Índice da cena (0-based) */
  index: number;

  /** URL do áudio de narração DESTA cena (gerado pelo Edge-TTS) */
  audioUrl?: string;

  /** URL da imagem gerada para esta cena (Flux / Gemini Imagen) */
  imageUrl?: string;

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
