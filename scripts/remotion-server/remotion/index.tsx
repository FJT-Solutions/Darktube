import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { ShortVideoComposition } from './compositions/ShortVideo';
import { DarkClipsVideoComposition } from './compositions/DarkClipsVideo';
import { TactileDocumentaryDossier } from './compositions/TactileDocumentaryDossier';
import { CableCrossSectionDiagram } from './compositions/CableCrossSectionDiagram';

// ─── Templates Catalog ──────────────────────────────────────────────────────
import { SurveillanceCamScene } from './compositions/templates/SurveillanceCam';
import { VHSNoirComposition } from './compositions/templates/VHSNoir';
import { InvestigationBoardScene } from './compositions/templates/InvestigationBoard';
import { ChatConversationScene } from './compositions/templates/ChatConversation';
import { CountdownTimerScene } from './compositions/templates/CountdownTimer';
import { DataStoryViralComposition } from './compositions/templates/DataStoryViral';
import { HeroShotRevealComposition } from './compositions/templates/HeroShotReveal';
import { RedditStoryComposition } from './compositions/templates/RedditStory';
import { PollDebateComposition } from './compositions/templates/PollDebate';
import { QuizTriviaComposition } from './compositions/templates/QuizTrivia';
import { TierListComposition } from './compositions/templates/TierList';
import { DarkFactCardComposition } from './compositions/templates/DarkFactCard';
import { EditorialStoryComposition } from './compositions/templates/EditorialStory';
import { InfiniteZoomComposition } from './compositions/templates/InfiniteZoom';
import { UIMotionMorphComposition } from './compositions/templates/UIMotionMorph';
import { MatrixCodeRainComposition } from './compositions/templates/MatrixCodeRain';
import { NewspaperRevealComposition } from './compositions/templates/NewspaperReveal';
import { HologramHUDComposition } from './compositions/templates/HologramHUD';
import { TimelineHistoryComposition } from './compositions/templates/TimelineHistory';
import { BookQuoteComposition } from './compositions/templates/BookQuote';
import { WhiteboardExplainerComposition } from './compositions/templates/WhiteboardExplainer';
import { BlueprintTechnicalComposition } from './compositions/templates/BlueprintTechnical';
import { SplitScreenReactionComposition } from './compositions/templates/SplitScreenReaction';
import { ProcessFlowchartComposition } from './compositions/templates/ProcessFlowchart';
import { IsometricWorldComposition } from './compositions/templates/IsometricWorld';
import { StockTickerComposition } from './compositions/templates/StockTicker';
import { AnatomyDiagramComposition } from './compositions/templates/AnatomyDiagram';
import { LoopEngineeringComposition } from './compositions/templates/LoopEngineering';
import { MapJourneyComposition } from './compositions/templates/MapJourney';

import { RemotionShortProps, DarkClipsVideoProps } from './types';

const sampleShortProps: RemotionShortProps = {
  scenes: [
    {
      index: 0,
      captionText: 'DARKTUBE AI: O Futuro da Criação Procedural de Vídeo',
      durationSeconds: 4,
      animationStyle: 'kenburns-right',
      transitionIn: 'fade',
      textEffect: 'pop',
      springPreset: 'bouncy',
      letteringLines: [
        { text: 'NOVA GERAÇÃO', isHighlight: true, highlightColor: '#FACC15', badge: 'DESTAQUE' },
        { text: 'TECNOLOGIA DE PONTA' },
      ],
      badgeText: '★ EXCLUSIVO',
    },
  ],
  primaryColor: '#8B5CF6',
  accentColor: '#06B6D4',
  format: 'vertical',
  showWatermark: true,
  watermarkText: 'DARKTUBE AI',
};

const calculateShortMetadata = async ({ props }: { props: unknown }) => {
  const shortProps = (props as RemotionShortProps) || {};
  const scenesList = shortProps.scenes || sampleShortProps.scenes || [];
  const fps = parseInt((shortProps as any).fps || '24', 10);
  const DEFAULT_TRANSITION_FRAMES = Math.round(18 * (fps / 30));

  let calcFrames = 0;
  for (let i = 0; i < scenesList.length; i++) {
    const scene = scenesList[i];
    const sceneDur = Math.round((scene.durationSeconds || 4) * fps);
    calcFrames += sceneDur;
    if (i < scenesList.length - 1) {
      const tStyle = scene.transitionIn || 'fade';
      const tFrames = scene.transitionDurationFrames || (tStyle === 'none' ? 0 : DEFAULT_TRANSITION_FRAMES);
      calcFrames -= tFrames;
    }
  }
  const durationInFrames = Math.max(Math.round(4 * fps), calcFrames);

  const isVertical = (shortProps.format || 'vertical') === 'vertical';
  const width = parseInt((shortProps as any).width || (isVertical ? 720 : 1280), 10);
  const height = parseInt((shortProps as any).height || (isVertical ? 1280 : 720), 10);

  return {
    fps,
    width,
    height,
    durationInFrames,
    defaultProps: sampleShortProps,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── CORE ENGINES ── */}
      <Composition
        id="DarkClipsVideo"
        component={DarkClipsVideoComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={async ({ props }) => {
          const clipProps = props as unknown as DarkClipsVideoProps;
          const durationSeconds = clipProps.durationInSeconds || 15;
          return {
            durationInFrames: Math.max(30, Math.round(durationSeconds * 30)),
          };
        }}
      />
      <Composition
        id="ShortVideo"
        component={ShortVideoComposition}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />

      {/* ── PHASE 1: FOUNDATION ── */}
      <Composition
        id="TactileDocumentaryDossier"
        component={TactileDocumentaryDossier as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="CableCrossSectionDiagram"
        component={CableCrossSectionDiagram as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="SurveillanceCam"
        component={SurveillanceCamScene as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="VHSNoir"
        component={VHSNoirComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="InvestigationBoard"
        component={InvestigationBoardScene as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="ChatConversation"
        component={ChatConversationScene as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="CountdownTimer"
        component={CountdownTimerScene as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />

      {/* ── PHASE 2: ENGAGEMENT ── */}
      <Composition
        id="DataStoryViral"
        component={DataStoryViralComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="HeroShotReveal"
        component={HeroShotRevealComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="RedditStory"
        component={RedditStoryComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="PollDebate"
        component={PollDebateComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="QuizTrivia"
        component={QuizTriviaComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="TierList"
        component={TierListComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="DarkFactCard"
        component={DarkFactCardComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />

      {/* ── PHASE 3: PREMIUM ── */}
      <Composition
        id="EditorialStory"
        component={EditorialStoryComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="InfiniteZoom"
        component={InfiniteZoomComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="UIMotionMorph"
        component={UIMotionMorphComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="MatrixCodeRain"
        component={MatrixCodeRainComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="NewspaperReveal"
        component={NewspaperRevealComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="HologramHUD"
        component={HologramHUDComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="TimelineHistory"
        component={TimelineHistoryComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />

      {/* ── PHASE 4: COMPLETE ── */}
      <Composition
        id="BookQuote"
        component={BookQuoteComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="WhiteboardExplainer"
        component={WhiteboardExplainerComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="BlueprintTechnical"
        component={BlueprintTechnicalComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="SplitScreenReaction"
        component={SplitScreenReactionComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="ProcessFlowchart"
        component={ProcessFlowchartComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="IsometricWorld"
        component={IsometricWorldComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="StockTicker"
        component={StockTickerComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="AnatomyDiagram"
        component={AnatomyDiagramComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="LoopEngineering"
        component={LoopEngineeringComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
      <Composition
        id="MapJourney"
        component={MapJourneyComposition as any}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateShortMetadata}
      />
    </>
  );
};

registerRoot(RemotionRoot);
