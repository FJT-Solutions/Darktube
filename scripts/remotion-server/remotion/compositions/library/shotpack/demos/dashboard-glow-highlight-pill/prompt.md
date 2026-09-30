---
name: dashboard-glow-highlight-pill
summary: Gold lettering hovers over a black field as a data dashboard rises from the bottom with perspective and keeps drifting in 3D; a gold light spot tours from the right side down to the bottom, stretches into a capsule, then draws out the popup's glowing outline starting from it
use: Revealing heavy features for finance/data products; premium "look here" guidance; the core beat of a black-and-gold brand film
duration: ~2.0s (60f@30fps)
energy: High (2s packs rise + tour + draw-on + popup in four segments; handoffs must be airtight)
---

## Intent
Use a single beam of light to pull the viewer's attention from "the whole dashboard" to "this one popup". The light spot first tours between panels (announcing something is coming), stretches into a capsule (build-up), then starts drawing the popup outline from the capsule's landing point (handoff) — three segments are one beam's continuous transformation; a break anywhere turns them into three unrelated animations. The whole film is only 2s, so each segment starts from the previous one's landing point.

## Core Motion
- Gold text "Ready." uses `background-clip:text` + three `drop-shadow` glow layers, held at full brightness to t≈0.30 then faded with `inQuad`; glow breathes at `0.85±0.15·sin(t·π·9)`
- Dashboard runs 10 POSE keyframes (`[t, rotateX, rotateY, tx%, ty%, scale]`, `inOutQuad` between segments): at 0.300 `rotateX 34°/scale 1.62` shows only the top-bar slice, by 0.365 basically level and full-frame, then yaw sweeps from −13° to +2.6°, and 0.62→0.72 has a `scale 0.943→0.707` pull-back making room for the popup
- Background blur "rises then retreats": `blur 0→4.5px` (0.58→0.66 inOutQuad) then retreats 52% in 0.80→0.93, dim layer peak 0.22 retained
- Light spot 6 keyframes travel monotonically from `(80.5%,42%) 22×22` to `(44.1%,67.4%) 96×16` — down-left + continuously stretching horizontally, no mid-return; 0.655→0.678 fades out for the handoff
- Glow outline `stroke-dashoffset` draw-on (0.655→0.775 outQuad); the start point `SX` is reverse-computed from the light spot's final-frame x=44.1%; 0.79→0.93 settles: stroke width 2.9→1.0px, `#fff0c4→#e6c887`, glow almost removed, becoming a persistent thin gold frame
- Popup base plate 0.665→0.75 arrives first (opacity×0.72), text sharpens only at 0.715→0.84; the popup and the outline share the exact same transform chain, drifting at 0.45/0.5× the camera pose

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Gold text fade | full brightness to t≈0.30, 0.30→0.355 inQuad | Must overlap the dashboard's rise; clearing the stage first then rising breaks the chain |
| Dashboard rise | rotateX 34°→5.5°, scale 1.62→1.055, t 0.300→0.365 | Straightening within 0.065 (≈4f) is deliberate: slower reads "panel floats up" instead of "camera presses down" |
| Persistent 3D drift | yaw −13°→+2.6°, scale 0.943→0.707 | The drift must not stop: stillness exposes it as a flat image |
| Light spot tour | 6 keyframes, 22×22 → 96×16 | Monotonic down-left, only stretching never returning; one return reads "the light is looking for something" |
| Background blur | blur peak 4.5px, retreats 52% in 0.80→0.93, dim 0.22 | Rise without retreat = blurry ending; retreating to 0 loses the popup's depth |
| Draw-on stroke | dashoffset 0.655→0.775 outQuad, start at bottom edge counterclockwise | outQuad's fast start catches the capsule's "fling-out" momentum |
| Stroke settling | 0.79→0.93: 2.9→1.0px, #fff0c4→#e6c887 | Settling is the semantics of "light becoming UI"; without it, it stays an effect |
| Popup fade-in | base 0.665→0.75 (cap 0.72 opacity), text 0.715→0.84 | Base before text gives the "frame first, content fills in later" order |

## Known Pitfalls
- **The outline SVG and popup must share the same box and a 1:1 px viewBox.** Once used `300×220` + `preserveAspectRatio="none"`, non-uniformly squashed to x0.39/y0.49: stroke width uneven, rounded corners stretched into ellipses, the whole outline floating outside the shape — this is the root cause of "drawn-light position doesn't match the popup"
- The light spot can't use `mix-blend-mode:screen`: the root's `perspective` isolates the blending, making the spot go gray; use a solid bright core + `box-shadow` outer glow instead
- The draw-on start `SX` must be reverse-computed from the light spot's last-frame x. With hard-coded coordinates, changing the tour path breaks the "light stretches into a capsule then draws" handoff
- Gold text uses `background-clip:text`, so glow can only go through `filter: drop-shadow` — `text-shadow` doesn't work on transparent text
- The dashboard's order book/K-line/buy-sell panels and popup copy are all placeholder data (deterministic random-walk generation); swap in the real project interface for production

## Reference Implementation
demos/effects/dashboard-glow-highlight-pill/
(DashboardGlowHighlightPill.tsx)
