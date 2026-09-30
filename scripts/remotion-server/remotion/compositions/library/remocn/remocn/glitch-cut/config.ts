import { glitchCutExampleCode } from "@/components/docs/examples/glitch-cut-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const glitchCutConfig: ComponentConfig = {
  componentName: "glitchCut",
  importPath: "@/components/remocn/glitch-cut",
  controls: {
    intensity: {
      type: "number",
      default: 1,
      min: 0,
      max: 2,
      step: 0.1,
      label: "Intensity",
    },
    slices: {
      type: "number",
      default: 24,
      min: 8,
      max: 64,
      step: 2,
      label: "Slices",
    },
    rgbSplit: {
      type: "number",
      default: 1,
      min: 0,
      max: 2,
      step: 0.1,
      label: "RGB split",
    },
    blockNoise: {
      type: "number",
      default: 0.6,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Block noise",
    },
  },
  durationInFrames: 78,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#0a0a0a" },
  snippet: glitchCutExampleCode,
};
