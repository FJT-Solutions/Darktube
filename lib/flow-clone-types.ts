// Tipos puros (seguros para client e server) da clonagem estrutural de video por link no /flow.

import type { FlowProvider } from './flow-llm'
import type { FlowSfx, FlowTakeKind, FlowTransition } from './flow-script'
import type { FlowProductionMode } from './flow-template-base'

export type ClonedBeatSourceType = 'filmed' | 'ai_generated' | 'coded_html_svg'
export type ClonedRecommendedEngine = 'html_svg' | 'remotion' | 'flow'

export interface ClonedSceneBeat {
  n: number
  timestamp: string
  durationSec: number
  beat: string
  kind: FlowTakeKind
  camera: string
  action: string
  ocrText: string
  spokenSummary: string
  transition: FlowTransition
  sfx: FlowSfx
  presence: 'character' | 'faceless'
  sourceType?: ClonedBeatSourceType
}

export interface FlowClonedStructure {
  sourceUrl: string
  sourcePlatform: string
  title: string
  summary: string
  durationSec: number
  aspect: '9:16' | '16:9'
  mode: FlowProductionMode
  visualStyle: string
  pacing: string
  language: string
  ocrTexts: string[]
  transcript: string
  detectedCharacters: string[]
  detectedLocations: string[]
  beats: ClonedSceneBeat[]
  framesAnalyzed: number
  recommendedTakes: number
  recommendedSeconds: number
  recommendedModel: string
  recommendedEngine?: ClonedRecommendedEngine
  paletteHex?: string[]
  energy?: 'cinematografico' | 'fluido' | 'cinetico'
  providerUsed: FlowProvider
  usedFallbackThumbs: boolean
}

export interface CloneCustomization {
  newTheme?: string
  newCharacter?: string
  newLocation?: string
  keepInstructions?: string
}
