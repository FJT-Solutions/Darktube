import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { RemotionShortProps } from '../types';

export const ShortVideoComposition: React.FC<RemotionShortProps> = ({
  narrationAudioUrl,
  backgroundMusicUrl,
  backgroundImages = [],
  subtitles = [],
  primaryColor = '#EAB308', // Gold/Yellow viral style
  accentColor = '#FFFFFF',
  fontSize = 64,
  showWatermark = true,
  watermarkText = 'DarkTube AI',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Calculate slide duration per background image
  const imageCount = backgroundImages.length || 1;
  const framesPerImage = Math.max(1, Math.floor(durationInFrames / imageCount));

  // Current subtitle word calculation
  const currentTimeInSeconds = frame / fps;
  const currentWord = subtitles.find(
    (s) =>
      currentTimeInSeconds >= s.startInSeconds &&
      currentTimeInSeconds <= s.endInSeconds
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', fontFamily: 'Inter, sans-serif' }}>
      {/* Background Images with Ken Burns Zoom Effect */}
      {backgroundImages.length > 0 ? (
        backgroundImages.map((imgUrl, index) => {
          const startFrame = index * framesPerImage;
          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={framesPerImage + 5} // slight overlap
            >
              <KenBurnsImage imgUrl={imgUrl} framesPerImage={framesPerImage} />
            </Sequence>
          );
        })
      ) : (
        <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }} />
      )}

      {/* Dark vignette overlay for contrast */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Dynamic Viral Subtitles in Center/Lower-third */}
      {currentWord && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: '60%', // Lower third positioning
            pointerEvents: 'none',
          }}
        >
          <AnimatedSubtitleWord
            word={currentWord.word}
            primaryColor={primaryColor}
            accentColor={accentColor}
            fontSize={fontSize}
          />
        </AbsoluteFill>
      )}

      {/* Optional Watermark */}
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 40,
            padding: '8px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '1px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {watermarkText}
        </div>
      )}

      {/* Narration Audio */}
      {narrationAudioUrl && <Audio src={narrationAudioUrl} />}

      {/* Background Music with Auto Volume */}
      {backgroundMusicUrl && (
        <Audio src={backgroundMusicUrl} volume={0.15} />
      )}
    </AbsoluteFill>
  );
};

// Ken Burns Zoom/Pan Animation component
const KenBurnsImage: React.FC<{ imgUrl: string; framesPerImage: number }> = ({
  imgUrl,
  framesPerImage,
}) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, framesPerImage], [1, 1.15], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={imgUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

// Animated Subtitle Word component
const AnimatedSubtitleWord: React.FC<{
  word: string;
  primaryColor: string;
  accentColor: string;
  fontSize: number;
}> = ({ word, primaryColor, accentColor, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        transform: `scale(${pop})`,
        color: primaryColor,
        fontSize: `${fontSize}px`,
        fontWeight: 900,
        textTransform: 'uppercase',
        textAlign: 'center',
        padding: '12px 24px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        borderRadius: '16px',
        border: `3px solid ${primaryColor}`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
        letterSpacing: '2px',
        textShadow: '0 4px 12px rgba(0,0,0,0.9)',
      }}
    >
      {word}
    </div>
  );
};
