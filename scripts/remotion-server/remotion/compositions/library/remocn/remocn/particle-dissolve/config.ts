import { particleDissolveExampleCode } from "@/components/docs/examples/particle-dissolve-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const particleDissolveConfig: ComponentConfig = {
  componentName: "particleDissolve",
  importPath: "@/components/remocn/particle-dissolve",
  controls: {
    particleSize: {
      type: "number",
      default: 4,
      min: 1,
      max: 16,
      step: 1,
      label: "Grain size",
    },
    scatter: {
      type: "number",
      default: 0.08,
      min: 0.01,
      max: 0.4,
      step: 0.01,
      label: "Scatter",
    },
    shimmer: {
      type: "number",
      default: 0.6,
      min: 0,
      max: 1.5,
      step: 0.05,
      label: "Shimmer",
    },
    aberration: {
      type: "number",
      default: 0.5,
      min: 0,
      max: 1.5,
      step: 0.05,
      label: "Aberration",
    },
    direction: {
      type: "select",
      default: "reveal",
      options: ["reveal", "up", "down", "left", "right"],
      label: "Direction",
    },
    stagger: {
      type: "number",
      default: 0.55,
      min: 0,
      max: 0.9,
      step: 0.05,
      label: "Stagger",
    },
  },
  durationInFrames: 84,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#0a0a0a" },
  snippet: particleDissolveExampleCode,
};
