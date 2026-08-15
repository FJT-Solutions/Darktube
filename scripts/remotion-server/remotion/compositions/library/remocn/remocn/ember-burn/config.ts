import { emberBurnExampleCode } from "@/components/docs/examples/ember-burn-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const emberBurnConfig: ComponentConfig = {
  componentName: "emberBurn",
  importPath: "@/components/remocn/ember-burn",
  controls: {
    patches: {
      type: "number",
      default: 5,
      min: 2,
      max: 16,
      step: 1,
      label: "Patches",
    },
    edgeSoftness: {
      type: "number",
      default: 0.07,
      min: 0.005,
      max: 0.2,
      step: 0.005,
      label: "Edge softness",
    },
    contentBias: {
      type: "number",
      default: 0.6,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Eats bright first",
    },
    heat: {
      type: "number",
      default: 0.5,
      min: 0,
      max: 1.5,
      step: 0.05,
      label: "Heat distortion",
    },
    glowColor: { type: "color", default: "#ff7a2f", label: "Glow" },
    emberAmount: {
      type: "number",
      default: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Embers",
    },
  },
  durationInFrames: 80,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#0a0a0a" },
  snippet: emberBurnExampleCode,
};
