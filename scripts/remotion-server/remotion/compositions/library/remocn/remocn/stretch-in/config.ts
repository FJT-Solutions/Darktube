import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const stretchInConfig: ComponentConfig = {
  componentName: "StretchIn",
  importPath: "@/components/remocn/stretch-in",
  controls: {
    text: { type: "text", default: "REMOCN", label: "Text" },
    fill: { type: "color", default: "#ffffff", label: "Fill" },
    fontSize: {
      type: "number",
      default: 510,
      min: 100,
      max: 700,
      step: 10,
      label: "Font size",
    },
    entryStagger: {
      type: "number",
      default: 3,
      min: 0,
      max: 12,
      step: 1,
      label: "Letter stagger",
    },
    travelFrames: {
      type: "number",
      default: 33,
      min: 4,
      max: 40,
      step: 1,
      label: "Travel (frames)",
    },
    vertexLagFrames: {
      type: "number",
      default: 3.5,
      min: 0,
      max: 8,
      step: 0.5,
      label: "Smear lag (frames)",
    },
  },
  durationInFrames: 60,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#141318" },
};
