export interface SubtitleWord {
  word: string;
  startInSeconds: number;
  endInSeconds: number;
}

export interface ScriptSegmentMedia {
  timestamp?: string;
  segment_type?: string;
  mediaUrl?: string; // Image or Video URL (auto-generated or manually pasted)
  voiceoverText?: string;
  imagePrompt?: string;
}

export interface RemotionShortProps {
  narrationAudioUrl?: string;
  backgroundMusicUrl?: string;
  backgroundImages?: string[];
  scenes?: ScriptSegmentMedia[];
  subtitles?: SubtitleWord[];
  primaryColor?: string;
  accentColor?: string;
  fontSize?: number;
  showWatermark?: boolean;
  watermarkText?: string;
}

