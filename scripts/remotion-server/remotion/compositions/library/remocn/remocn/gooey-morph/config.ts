import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const gooeyMorphConfig: ComponentConfig = {
  componentName: "GooeyMorph",
  importPath: "@/components/remocn/gooey-morph",
  controls: {
    word: { type: "text", default: "HELLO", label: "Word" },
    fill: { type: "color", default: "#f2f2f2", label: "Fill" },
    fontFamily: {
      type: "text",
      default: "'Bodoni Moda', Georgia, serif",
      label: "Font family",
    },
    blurRadius: {
      type: "number",
      default: 6,
      min: 0,
      max: 20,
      step: 1,
      label: "Goo blur radius",
    },
    displaceAmount: {
      type: "number",
      default: 20,
      min: 0,
      max: 80,
      step: 1,
      label: "Displace amount",
    },
    barTravelFrames: {
      type: "number",
      default: 30,
      min: 10,
      max: 60,
      step: 1,
      label: "Bar travel (frames)",
    },
  },
  durationInFrames: 120,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#141318" },
};
