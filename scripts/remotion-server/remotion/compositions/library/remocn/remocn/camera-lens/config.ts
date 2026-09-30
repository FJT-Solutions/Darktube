import { cameraLensExampleCode } from "@/components/docs/examples/camera-lens-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const cameraLensConfig: ComponentConfig = {
  componentName: "CameraLens",
  importPath: "@/components/remocn/camera-lens",
  controls: {
    softness: {
      type: "number",
      default: 0.5,
      min: 0,
      max: 2,
      step: 0.05,
      label: "Corner softness",
    },
    bloom: {
      type: "number",
      default: 0.5,
      min: 0,
      max: 2,
      step: 0.05,
      label: "Bloom",
    },
    aberration: {
      type: "number",
      default: 0.5,
      min: 0,
      max: 3,
      step: 0.1,
      label: "Aberration",
    },
    vignette: {
      type: "number",
      default: 0.5,
      min: 0,
      max: 1.5,
      step: 0.05,
      label: "Vignette",
    },
    distortion: {
      type: "number",
      default: 0.05,
      min: 0,
      max: 0.6,
      step: 0.01,
      label: "Distortion",
    },
  },
  durationInFrames: 90,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#0a0a0a" },
  snippet: cameraLensExampleCode,
};
