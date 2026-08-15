import { underwaterRippleExampleCode } from "@/components/docs/examples/underwater-ripple-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const underwaterRippleConfig: ComponentConfig = {
  componentName: "UnderwaterRipple",
  importPath: "@/components/remocn/underwater-ripple",
  controls: {
    amplitude: {
      type: "number",
      default: 7,
      min: 0,
      max: 40,
      step: 1,
      label: "Amplitude",
    },
    scale: {
      type: "number",
      default: 1,
      min: 0.2,
      max: 4,
      step: 0.1,
      label: "Scale",
    },
    speed: {
      type: "number",
      default: 2,
      min: 1,
      max: 8,
      step: 1,
      label: "Cycles",
    },
    dispersion: {
      type: "number",
      default: 1,
      min: 0,
      max: 4,
      step: 0.1,
      label: "Dispersion",
    },
  },
  durationInFrames: 120,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#06171c" },
  snippet: underwaterRippleExampleCode,
};
