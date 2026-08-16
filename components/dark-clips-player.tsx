"use client";

import React from 'react';
import { Player } from '@remotion/player';
import { DarkClipsVideoComposition } from '@/remotion/compositions/DarkClipsVideo';
import { DarkClipsVideoProps } from '@/remotion/types';

interface DarkClipsPreviewPlayerProps extends DarkClipsVideoProps {
  fps?: number;
  width?: number;
  height?: number;
  className?: string;
}

export const DarkClipsPreviewPlayer: React.FC<DarkClipsPreviewPlayerProps> = ({
  durationInSeconds = 15,
  fps = 30,
  width = 1080,
  height = 1920,
  className = 'w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-black',
  ...inputProps
}) => {
  const durationInFrames = Math.max(30, Math.floor((durationInSeconds || 15) * fps));

  return (
    <div className={className}>
      <Player
        component={DarkClipsVideoComposition}
        inputProps={{
          ...inputProps,
          durationInSeconds,
        }}
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
