"use client";

import React from 'react';
import { Player } from '@remotion/player';
import { ShortVideoComposition } from '@/remotion/compositions/ShortVideo';
import { RemotionShortProps } from '@/remotion/types';

interface RemotionPlayerProps extends RemotionShortProps {
  durationInSeconds?: number;
  fps?: number;
  width?: number;
  height?: number;
  className?: string;
}

export const RemotionPreviewPlayer: React.FC<RemotionPlayerProps> = ({
  durationInSeconds = 60,
  fps = 30,
  width = 1080,
  height = 1920,
  className = 'w-full max-w-sm aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-zinc-800',
  ...inputProps
}) => {
  const durationInFrames = Math.max(1, Math.floor(durationInSeconds * fps));

  return (
    <div className={className}>
      <Player
        component={ShortVideoComposition}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={width}
        compositionHeight={height}
        style={{
          width: '100%',
          height: '100%',
        }}
        controls
        autoPlay={false}
        loop
      />
    </div>
  );
};
