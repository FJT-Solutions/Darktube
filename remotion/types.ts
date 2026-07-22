export interface SubtitleWord {
  word: string;
  startInSeconds: number;
  endInSeconds: number;
}

export interface RemotionShortProps {
  narrationAudioUrl?: string;
  backgroundMusicUrl?: string;
  backgroundImages?: string[];
  subtitles?: SubtitleWord[];
  primaryColor?: string;
  accentColor?: string;
  fontSize?: number;
  showWatermark?: boolean;
  watermarkText?: string;
}
