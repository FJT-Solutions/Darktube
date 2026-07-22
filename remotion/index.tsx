import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { ShortVideoComposition } from './compositions/ShortVideo';
import { RemotionShortProps } from './types';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ShortVideo"
        component={ShortVideoComposition}
        durationInFrames={30 * 60} // Default 60 segundos a 30fps ( Short )
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          narrationAudioUrl: '',
          backgroundMusicUrl: '',
          backgroundImages: [],
          subtitles: [
            { word: 'DARKtube', startInSeconds: 0, endInSeconds: 1.5 },
            { word: 'REMOTION', startInSeconds: 1.5, endInSeconds: 3.0 },
            { word: 'PREVIEW', startInSeconds: 3.0, endInSeconds: 4.5 },
          ],
          primaryColor: '#EAB308',
          showWatermark: true,
          watermarkText: 'DarkTube AI',
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
