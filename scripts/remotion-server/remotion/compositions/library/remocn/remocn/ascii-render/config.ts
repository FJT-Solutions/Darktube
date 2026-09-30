import { asciiRenderExampleCode } from "@/components/docs/examples/ascii-render-example";
import { type ComponentConfig, FPS, H, W } from "@/lib/customizer-config";

export const asciiRenderConfig: ComponentConfig = {
  componentName: "AsciiRender",
  importPath: "@/components/remocn/ascii-render",
  controls: {
    glyphSize: {
      type: "number",
      default: 26,
      min: 10,
      max: 64,
      step: 2,
      label: "Glyph size",
    },
    charset: {
      type: "text",
      default: " .:-=+*#%@",
      label: "Charset",
    },
    colored: {
      type: "boolean",
      default: false,
      label: "Source colour",
    },
    ink: {
      type: "color",
      default: "#9dff9d",
      label: "Ink",
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
  snippet: asciiRenderExampleCode,
};
