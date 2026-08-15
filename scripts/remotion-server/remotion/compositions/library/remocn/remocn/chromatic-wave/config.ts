import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const chromaticWaveConfig: ComponentConfig = {
  componentName: "ChromaticWave",
  importPath: "@/components/remocn/chromatic-wave",
  controls: {
    headline: { type: "text", default: "MUSIC", label: "Headline" },
    kicker: { type: "text", default: "APPLES", label: "Kicker" },
    fill: { type: "color", default: "#ffffff", label: "Fill" },
    waveHeight: {
      type: "number",
      default: 28,
      min: 0,
      max: 40,
      step: 1,
      label: "Wave height",
    },
    maxDisplacementPx: {
      type: "number",
      default: 39,
      min: 0,
      max: 60,
      step: 1,
      label: "Displacement (px)",
    },
    turbulentAmount: {
      type: "number",
      default: 130,
      min: 0,
      max: 200,
      step: 2,
      label: "Turbulence",
    },
  },
  durationInFrames: 100,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
};
