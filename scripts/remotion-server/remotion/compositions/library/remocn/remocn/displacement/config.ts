import { displacementExampleCode } from "@/components/docs/examples/displacement-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const displacementConfig: ComponentConfig = {
  componentName: "displacement",
  importPath: "@/components/remocn/displacement",
  controls: {
    grid: {
      type: "number",
      default: 60,
      min: 4,
      max: 100,
      step: 2,
      label: "Grid",
    },
    cellAspect: {
      type: "number",
      default: 1,
      min: 0.25,
      max: 4,
      step: 0.25,
      label: "Cell aspect",
    },
    shift: {
      type: "number",
      default: 1,
      min: 0,
      max: 4,
      step: 0.1,
      label: "Shift",
    },
    aberration: {
      type: "number",
      default: 1,
      min: 0,
      max: 3,
      step: 0.1,
      label: "Aberration",
    },
    grain: {
      type: "number",
      default: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Grain",
    },
    stagger: {
      type: "number",
      default: 0.45,
      min: 0,
      max: 0.85,
      step: 0.05,
      label: "Stagger",
    },
  },
  durationInFrames: 72,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#0a0a0a" },
  snippet: displacementExampleCode,
};
