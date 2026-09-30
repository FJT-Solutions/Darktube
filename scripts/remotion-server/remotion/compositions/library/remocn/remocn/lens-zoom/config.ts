import { lensZoomExampleCode } from "@/components/docs/examples/lens-zoom-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const lensZoomConfig: ComponentConfig = {
  componentName: "lensZoom",
  importPath: "@/components/remocn/lens-zoom",
  controls: {
    lensSteps: {
      type: "number",
      default: 9,
      min: 4,
      max: 32,
      step: 1,
      label: "Lens steps",
    },
    blurSamples: {
      type: "number",
      default: 7,
      min: 2,
      max: 32,
      step: 1,
      label: "Blur samples",
    },
    shakeAmount: {
      type: "number",
      default: 50,
      min: 0,
      max: 300,
      step: 5,
      label: "Shake amount",
    },
    shakeTranslatePx: {
      type: "number",
      default: 73,
      min: 0,
      max: 80,
      step: 1,
      label: "Shake travel (px)",
    },
  },
  durationInFrames: 112,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#141318" },
  snippet: lensZoomExampleCode,
};
