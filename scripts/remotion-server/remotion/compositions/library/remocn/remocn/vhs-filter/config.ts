import { vhsFilterExampleCode } from "@/components/docs/examples/vhs-filter-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const vhsFilterConfig: ComponentConfig = {
  componentName: "VhsFilter",
  importPath: "@/components/remocn/vhs-filter",
  controls: {
    bleed: {
      type: "number",
      default: 1,
      min: 0,
      max: 3,
      step: 0.1,
      label: "Chroma bleed",
    },
    wobble: {
      type: "number",
      default: 1,
      min: 0,
      max: 3,
      step: 0.1,
      label: "Tape wobble",
    },
    noise: {
      type: "number",
      default: 1,
      min: 0,
      max: 3,
      step: 0.1,
      label: "Noise",
    },
    intensity: {
      type: "number",
      default: 1,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Intensity",
    },
  },
  durationInFrames: 90,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#0a0a0a" },
  snippet: vhsFilterExampleCode,
};
