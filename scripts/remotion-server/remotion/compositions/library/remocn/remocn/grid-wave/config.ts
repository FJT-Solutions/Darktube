import { gridWaveExampleCode } from "@/components/docs/examples/grid-wave-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const gridWaveConfig: ComponentConfig = {
  componentName: "gridWave",
  importPath: "@/components/remocn/grid-wave",
  controls: {
    tileSize: {
      type: "number",
      default: 90,
      min: 30,
      max: 260,
      step: 10,
      label: "Tile size",
    },
    waveWidth: {
      type: "number",
      default: 0.16,
      min: 0.04,
      max: 0.5,
      step: 0.02,
      label: "Wave width",
    },
    lift: {
      type: "number",
      default: 2,
      min: 0,
      max: 4,
      step: 0.1,
      label: "Lift",
    },
    gap: {
      type: "number",
      default: 0.12,
      min: 0,
      max: 0.45,
      step: 0.01,
      label: "Gap",
    },
    tint: { type: "color", default: "#8fb4ff", label: "Tint" },
    direction: {
      type: "select",
      default: "ripple",
      options: ["ripple", "left", "right", "up", "down"],
      label: "Direction",
    },
  },
  durationInFrames: 84,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#0a0a0a" },
  snippet: gridWaveExampleCode,
};
