import { sustainedGlitchExampleCode } from "@/components/docs/examples/sustained-glitch-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const sustainedGlitchConfig: ComponentConfig = {
  componentName: "SustainedGlitch",
  importPath: "@/components/remocn/sustained-glitch",
  controls: {
    intensity: {
      type: "number",
      default: 1,
      min: 0,
      max: 2,
      step: 0.05,
      label: "Intensity",
    },
    frequency: {
      type: "number",
      default: 1,
      min: 0.1,
      max: 6,
      step: 0.1,
      label: "Frequency",
    },
    slices: {
      type: "number",
      default: 24,
      min: 6,
      max: 48,
      step: 1,
      label: "Slices",
    },
    seed: {
      type: "number",
      default: 1,
      min: 1,
      max: 20,
      step: 1,
      label: "Seed",
    },
  },
  durationInFrames: 120,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#0a0a0a" },
  snippet: sustainedGlitchExampleCode,
};
