import {
  type ComponentConfig,
  FONT_WEIGHT_OPTIONS,
  FPS,
  H,
  W,
} from "@/lib/customizer-config";

export const kineticWarpConfig: ComponentConfig = {
  componentName: "KineticWarp",
  importPath: "@/components/remocn/kinetic-warp",
  controls: {
    text: { type: "text", default: "REM\nOCN", label: "Text" },
    textColor: { type: "color", default: "#FFFFFF", label: "Color" },
    fontFamily: { type: "text", default: "Passion One", label: "Font family" },
    fontUrl: {
      type: "text",
      default:
        "https://fonts.googleapis.com/css2?family=Passion+One:wght@400;700;900&display=block",
      label: "Font URL",
    },
    fontWeight: {
      type: "select",
      default: "700",
      options: FONT_WEIGHT_OPTIONS,
      label: "Font weight",
    },
    fontSize: {
      type: "number",
      default: 107.1,
      min: 40,
      max: 200,
      step: 0.1,
      label: "Font size",
    },
    layerScale: {
      type: "number",
      default: 480,
      min: 100,
      max: 800,
      step: 10,
      label: "Layer scale (%)",
    },
    keyframeStride: {
      type: "number",
      default: 20,
      min: 5,
      max: 40,
      step: 1,
      label: "Keyframe stride",
    },
  },
  durationInFrames: 120,
  fps: FPS,
  compositionWidth: W,
  compositionHeight: H,
};
