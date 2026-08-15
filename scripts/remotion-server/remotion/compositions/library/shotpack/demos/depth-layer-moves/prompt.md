---
name: depth-layer-moves
summary: Two layered-depth camera moves — a multi-layer parallax glide (three speed tiers translating sideways to create depth) and a fake dolly-zoom (subject pinned, background swelling in)
use: Segments where a flat screenshot needs "thickness"; use the dolly-zoom for dramatic tension-building moments (≤1 per video)
duration: parallax glide 4–5s continuous; dolly-zoom 3–4s one-way travel
energy: parallax = Medium (texture-forward); dolly-zoom = Medium-high (pressure builds)
---

## Intent
Panning the whole page is "watching the page"; layered depth is "being inside the page's space." The parallax glide adds depth to a lateral move (Disney's multiplane camera principle — the same texture as Linear's videos); the fake dolly-zoom inverts it — the hero stays frozen while the whole world presses in, building tension for a dramatic moment.

## Core Motion
- **Parallax glide (3 layers)**: background full page (factor 0.35 + blur 2px + desaturate 0.92 + opacity 0.85, receding into environment), mid-ground real card slices (factor 0.7, the main reading layer, no blur), foreground floating blocks (factor 1.4 + blur 3px, sweeping past the camera). One shared drive displacement multiplied by each layer's factor
- **Fake dolly-zoom**: the hero high-res card is pinned dead-center at fixed px (takes part in no transform); the background layer (full page + card cluster as one) swells from the frame center with scale 1→2.25 + blur deepening 0→3.5px; the hero's drop shadow deepens with progress (offset 12→28px) to reinforce the "pinned" feel
- Neither variant tears apart the real page layout: the full page becomes a single layer, and standalone elements get their own layers as slices — the relationship between layers is "depth of field," not "a page being ripped apart"

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Parallax layer factor | 0.35 / 0.7 / 1.4 | a ≥2× gradient between layers is the minimum to be discernible; keep layers ≤4 to avoid overload |
| Depth anchors | blur on near/far layers + background desaturation | without blur/saturation anchors it reads as "stray slices flying around" |
| Dolly expansion travel | scale 1→2.0–2.5 | too little travel and the pressure feels weak; keep background opacity ≤0.6 so it doesn't read as a glitch |

## Known Pitfalls
- The main reading layer/hero must be high-res texture with no blur — the viewer is reading it
- The combination of parallax with PageCam's rot 3D (oblique parallax) is unverified — render a still to confirm before real use
- The dolly-zoom is "dramatic seasoning": ≤1 per video; use the parallax glide for everyday segments
- Parameters were tuned and signed off on placeholder assets, not finalized for production — re-verify after the first real use

## Reference Implementation
demos/camera/depth-layer-moves/
(DollyZoomReal.tsx / MultiplaneReal.tsx)
