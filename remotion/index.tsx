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
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={async ({ props }) => {
          const shortProps = props as RemotionShortProps;
          const scenesList = shortProps.scenes || [];
          const fps = 30;
          const DEFAULT_TRANSITION_FRAMES = 18;

          let calcFrames = 0;
          for (let i = 0; i < scenesList.length; i++) {
            const scene = scenesList[i];
            const sceneDur = Math.round((scene.durationSeconds || 5) * fps);
            calcFrames += sceneDur;
            if (i < scenesList.length - 1) {
              const tStyle = scene.transitionIn || 'fade';
              const tFrames = scene.transitionDurationFrames || (tStyle === 'none' ? 0 : DEFAULT_TRANSITION_FRAMES);
              calcFrames -= tFrames;
            }
          }
          const durationInFrames = Math.max(30, calcFrames);

          return {
            durationInFrames,
          };
        }}
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
