import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const extrudePopConfig: ComponentConfig = {
  componentName: "ExtrudePop",
  importPath: "@/components/remocn/extrude-pop",
  controls: {
    letter: { type: "text", default: "WIN", label: "Text" },
    bodyColor: { type: "color", default: "#e8192b", label: "Body color" },
    faceColor: { type: "color", default: "#ffffff", label: "Face color" },
    minimaxRadius: {
      type: "number",
      default: 80,
      min: 0,
      max: 200,
      step: 5,
      label: "Extrude radius",
    },
    extrudeAngleDeg: {
      type: "number",
      default: -58.6,
      min: -180,
      max: 180,
      step: 1,
      label: "Extrude angle",
    },
    extrudeEndFrame: {
      type: "number",
      default: 48,
      min: 10,
      max: 90,
      step: 1,
      label: "Extrude ends (frame)",
    },
  },
  durationInFrames: 90,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#141318" },
};
