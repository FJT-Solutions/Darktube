import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const perspectiveSqueezeConfig: ComponentConfig = {
  componentName: "PerspectiveSqueeze",
  importPath: "@/components/remocn/perspective-squeeze",
  controls: {
    upperText: { type: "text", default: "REMOCN", label: "Upper line" },
    lowerText: { type: "text", default: "BEST", label: "Lower line" },
    fill: { type: "color", default: "#f2f2f2", label: "Fill" },
    upperFontFamily: {
      type: "text",
      default: "Impact, 'Arial Narrow', sans-serif",
      label: "Upper font",
    },
    lowerFontFamily: {
      type: "text",
      default: "Impact, 'Arial Narrow', sans-serif",
      label: "Lower font",
    },
    lineGap: {
      type: "number",
      default: 50,
      min: 0,
      max: 120,
      step: 2,
      label: "Line gap",
    },
  },
  durationInFrames: 225,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
  previewBackdrop: { type: "color", value: "#141318" },
};
