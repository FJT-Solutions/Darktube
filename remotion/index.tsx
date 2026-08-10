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
        durationInFrames={30 * 60} // Default 60s @ 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [
            {
              index: 0,
              captionText: 'DARKtube AI Video',
              durationSeconds: 3,
              animationStyle: 'kenburns-right',
              transitionIn: 'fade',
              textEffect: 'pop',
              springPreset: 'bouncy',
              words: [
                { word: 'DARKtube', startInSeconds: 0,   endInSeconds: 1.2 },
                { word: 'AI',       startInSeconds: 1.2, endInSeconds: 2.0 },
                { word: 'Video',    startInSeconds: 2.0, endInSeconds: 3.0 },
              ],
            },
            {
              index: 1,
              captionText: 'Remotion TransitionSeries',
              durationSeconds: 3,
              animationStyle: 'zoom-punch',
              transitionIn: 'slide-right',
              textEffect: 'split-bounce',
              springPreset: 'dramatic',
              words: [
                { word: 'Remotion',          startInSeconds: 3.0, endInSeconds: 4.2 },
                { word: 'TransitionSeries',  startInSeconds: 4.2, endInSeconds: 6.0 },
              ],
            },
          ] as RemotionShortProps['scenes'],
          backgroundMusicUrl: '',
          captionStyle: 'pop',
          primaryColor: '#EAB308',
          accentColor: '#FFFFFF',
          showWatermark: true,
          watermarkText: 'DarkTube AI',
          format: 'vertical',
        } satisfies RemotionShortProps}
      />
    </>
  );
};

registerRoot(RemotionRoot);
