import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { SceneSegment, RemotionShortProps } from '../../types';
import { CinematicWorldMapScene, SUBSEA_CABLES, CameraPreset } from '../CinematicWorldMapScene';

export const MapJourneyComposition: React.FC<RemotionShortProps> = ({
  scenes = [],
  primaryColor = '#00F0FF',
  accentColor = '#FFFFFF',
  format = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  let sceneLocalTime = 0;

  for (let i = 0; i < scenes.length; i++) {
    const dur = scenes[i].durationSeconds || 5;
    if (time >= accumulatedTime && time < accumulatedTime + dur) {
      activeSceneIndex = i;
      sceneLocalTime = time - accumulatedTime;
      break;
    }
    accumulatedTime += dur;
  }

  const currentScene = scenes[activeSceneIndex] || scenes[0] || ({} as SceneSegment);
  const dur = currentScene.durationSeconds || 5;
  const durationFrames = Math.round(dur * fps);

  // Seleção de rota e câmera pelo índice ou metadados da cena
  const cableKeys = ['ellalink', 'dunant', 'pacific_faster', 'twoafrica'] as const;
  const cableKey = cableKeys[activeSceneIndex % cableKeys.length];
  const activeCable = SUBSEA_CABLES[cableKey] || SUBSEA_CABLES.ellalink;

  const cameraPresets: CameraPreset[] = [
    'global-atlantic',
    'atlantic-cable',
    'pacific-chokepoint',
    'global-atlantic',
  ];
  const cameraPreset = cameraPresets[activeSceneIndex % cameraPresets.length];

  return (
    <AbsoluteFill style={{ backgroundColor: '#040712' }}>
      <CinematicWorldMapScene
        cameraPreset={cameraPreset}
        activeCable={activeCable}
        headline={currentScene.badgeText || activeCable.name}
        subheadline={currentScene.captionText || '99% do tráfego mundial da internet depende desta rede submersa.'}
        metricBadge={`${activeCable.lengthKm.toLocaleString()} KM // ${activeCable.capacityTbps} TBPS`}
        primaryColor={primaryColor}
        format={format}
        durationFrames={durationFrames}
      />
    </AbsoluteFill>
  );
};
