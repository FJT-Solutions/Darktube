import { crtScreenExampleCode } from "@/components/docs/examples/crt-screen-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const crtScreenConfig: ComponentConfig = {
  componentName: "CrtScreen",
  importPath: "@/components/remocn/crt-screen",
  controls: {
    curvature: {
      type: "number",
      default: 1,
      min: 0,
      max: 2,
      step: 0.05,
      label: "Curvature",
    },
    scanlines: {
      type: "number",
      default: 1,
      min: 0,
      max: 1.5,
      step: 0.05,
      label: "Scanlines",
    },
    maskScale: {
      type: "number",
      default: 2,
      min: 1,
      max: 6,
      step: 1,
      label: "Mask pitch",
    },
    vignette: {
      type: "number",
      default: 1,
      min: 0,
      max: 1.5,
      step: 0.05,
      label: "Vignette",
    },
  },
  durationInFrames: 90,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#0a0a0a" },
  snippet: crtScreenExampleCode,
};
