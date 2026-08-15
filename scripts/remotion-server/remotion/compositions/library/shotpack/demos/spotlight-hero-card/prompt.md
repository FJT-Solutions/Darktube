---
name: spotlight-hero-card
summary: A spotlight sweeps the page and locks onto one card; after a 45° oblique push-in the card springs up to float, a beam traces its outline twice, then it seats back into place
use: "Single-protagonist" product opening; promoting one core object (card/item/module) to the film's protagonist
duration: ~4.6s (82–220f)
energy: Medium (the highest-texture shot; slow and steady rhythm)
tags: effects, camera
---

## Intent
The opening says exactly one thing: this card is the product's atomic unit. The spotlight does the eye-guidance for the viewer, the pop-up float gives it volume and weight, the outline beam is the "scanning/inspecting" metaphor, and seating back into place says it belongs to this page.

## Core Motion
- The roaming spotlight passes a few intermediate stops before locking onto the card's center; the light pool contracts + pulses at the lock moment, with an outer vignette pressing the frame darker
- Camera pushes from a full-page front view to an oblique close-up (left-side camera position dominant); the focus point offsets slightly so the card lands right of frame center
- Card rise (with overshoot) → hover sin bob → reseat (a small press on landing)
- SVG rounded-rect outline beam runs two laps: first fast and bright, second slow and dim
- After liftoff, a page-background patch is laid in place + accent-color (amber in the template film) breathing outline; it brightens and disappears at the landing moment
- Optional 3D floating annotation (the hover-3d-annotation technique): during the hover, a two-line large-serif annotation appears at the card's left (font size 37, width 230px), translateZ 92 + sin 3px bob (44f period, close to but out of sync with the card's 40f — "resonance", not mirroring); behind the keywords, a marker-ink fluorescent bar oklch(88% 0.095 85) grows over 12f, casting a soft ellipse shadow onto the page; the annotation must live in the same 3D space under the same camera perspective (C3) — the v1 flat overlaid text was rejected and redone (flat overlay breaks 3D space unity); it enters before the card reseats

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Card selection | cards[3], center x exactly 960 (page center) | Pick the hero card for "compositionally centered after the push-in", not just any card |
| Camera | Static full-page zoom 0.78 (82–114f) → 16f push-in to zoom 2.6; rotY 34° dominant + rotX only 8°, persp 1200; focus point 30px left of card center; after reseat touches down, cx/cy/zoom/rot all locked ≥15f | A side-on horizontal camera position reads better than an overhead shot ("shoot from the left, not from below", Q6); ban tail-drift like zoom 2.6→2.58 at the end — the breathing must be true stillness (R1) |
| Spotlight | 4 intermediate stops (86→130f), light pool radius 620→420→360 contracting, +6% pulse on lock; vignette 0.16→0.42 | Intermediate stops make "random illumination" believable; going straight at the target reads as programmatic |
| Action arc | rise 10f (bezier(0.2,1.25,0.3,1) overshoot) → hover 54f (sin bob, amplitude 4px, 40f period, z=110px lift) → reseat 18f, press 0.997 on landing | Lock→land ≈98f≈3.3s — texture shots must "slow down to 3 seconds" (R3); first versions are almost always too fast |
| Outline beam | lap1 142→156f (strokeWidth 5+2.5 double layer), lap2 162→182f (3.5+1.75, overall opacity 0.62); strokeDasharray "0.14 1" driven via dashoffset | The two laps differing in speed is what reads as "continuous scanning"; one lap is a blink; the beam is given to the protagonist only once (Q4) |
| Double-layer shadow | `0 8·lift px …, 0 46·lift px 90·lift px`, growing with height | If the shadow doesn't grow with height, the float doesn't hold |

## Sound
Pop-up pinned to whoosh-big (pinned at f127 in the template film), beam scan pinned to sparkle (f141), reseat pinned to transition-snap (f204) — pop-up / light effect / settle each get their own dedicated sound (S2, S4).

## Known Pitfalls
- A multi-card opening dance can't carry the first impression (Q5) — the opening was torn down several times before converging on a single card; start directly from single-protagonist + complete action arc
- Under the push-in close-up, text on the card gets soft — the root cause is texture rasterization resolution, not DoF; the supporting technique is expanded in aesthetic guideline Q2
- Per-card glint flashes were rejected twice ("not every card needs to flash", Q4); light effects go strictly to the protagonist only

## Reference Implementation
template/src/aifl/live/SceneOpen.tsx
