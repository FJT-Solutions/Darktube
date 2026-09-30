import { tvPowerOffExampleCode } from "@/components/docs/examples/tv-power-off-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const tvPowerOffConfig: ComponentConfig = {
  componentName: "TvPowerOff",
  importPath: "@/components/remocn/tv-power-off",
  controls: {
    durationInFrames: {
      type: "number",
      default: 18,
      min: 8,
      max: 30,
      step: 1,
      label: "Duration",
    },
    gain: {
      type: "number",
      default: 1,
      min: 0,
      max: 2,
      step: 0.05,
      label: "Surge",
    },
    afterglow: {
      type: "number",
      default: 1,
      min: 0,
      max: 2,
      step: 0.05,
      label: "Afterglow",
    },
    phosphor: {
      type: "color",
      default: "#d8ecff",
      label: "Phosphor",
    },
  },
  durationInFrames: 62,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#050505" },
  snippet: tvPowerOffExampleCode,
};
