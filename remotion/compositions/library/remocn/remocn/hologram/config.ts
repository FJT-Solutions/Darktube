import { hologramExampleCode } from "@/components/docs/examples/hologram-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const hologramConfig: ComponentConfig = {
  componentName: "Hologram",
  importPath: "@/components/remocn/hologram",
  controls: {
    tint: {
      type: "color",
      default: "#63e8ff",
      label: "Tint",
    },
    glow: {
      type: "number",
      default: 1,
      min: 0,
      max: 3,
      step: 0.1,
      label: "Glow",
    },
    ghost: {
      type: "number",
      default: 1,
      min: 0,
      max: 3,
      step: 0.1,
      label: "Ghost",
    },
    flicker: {
      type: "number",
      default: 1,
      min: 0,
      max: 3,
      step: 0.1,
      label: "Flicker",
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
  previewBackdrop: { type: "color", value: "#04070d" },
  snippet: hologramExampleCode,
};
