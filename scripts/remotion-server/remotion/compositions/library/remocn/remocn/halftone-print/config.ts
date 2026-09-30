import { halftonePrintExampleCode } from "@/components/docs/examples/halftone-print-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const halftonePrintConfig: ComponentConfig = {
  componentName: "HalftonePrint",
  importPath: "@/components/remocn/halftone-print",
  controls: {
    dotSize: {
      type: "number",
      default: 10,
      min: 4,
      max: 32,
      step: 1,
      label: "Dot size",
    },
    angle: {
      type: "number",
      default: 0,
      min: 0,
      max: 90,
      step: 1,
      label: "Screen angle",
    },
    misregistration: {
      type: "number",
      default: 1.2,
      min: 0,
      max: 6,
      step: 0.2,
      label: "Misregistration",
    },
    paperTint: {
      type: "color",
      default: "#f4efe4",
      label: "Paper",
    },
  },
  durationInFrames: 90,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#26231d" },
  snippet: halftonePrintExampleCode,
};
