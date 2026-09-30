import { securityCamExampleCode } from "@/components/docs/examples/security-cam-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const securityCamConfig: ComponentConfig = {
  componentName: "SecurityCam",
  importPath: "@/components/remocn/security-cam",
  controls: {
    compression: {
      type: "number",
      default: 0.7,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Compression",
    },
    blockSize: {
      type: "number",
      default: 10,
      min: 4,
      max: 32,
      step: 1,
      label: "Macroblock",
    },
    noise: {
      type: "number",
      default: 0.6,
      min: 0,
      max: 2,
      step: 0.05,
      label: "Sensor noise",
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
  snippet: securityCamExampleCode,
};
