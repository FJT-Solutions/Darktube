---
name: space-camera-moves
summary: Two 3D-spatial camera moves — exploded-view (components blow apart along Z then reassemble) and drone-dive-landing (drone plunge landing)
use: Highlight segments that shoot flat pages as 3D objects; both are "big moves" — ≤2 combined per video
duration: A 5s (explode-hover-reassemble entire run); C 3–5s one-way plunge
energy: High
---

## Intent
The depth-layer card adds depth to a pan — layers move, but the page is still a page. These two go further: the whole page is treated as a 3D object, and the camera (or the world) performs live-action-grade maneuvers around it. Each variant owns one narrative slot: A says "see what it's made of" (exploded-view showcase, Apple keynote language); C says "plunge from the global view onto the hero" (a god's-eye dive straight into a hero close-up, wide → focus).

## Two-Variant Selection

| Variant | Approach | Use Case |
|----|------|----------|
| A exploded-view | after the full page is tilted in 3D, components blow apart along the Z axis into a staggered hover, then one beat later reassemble in reverse order with a closing shake | architecture/composition showcases: "what's inside this product"; module overview segments |
| C drone-dive-landing | near-vertical overhead hover → sharp plunge → air-cushion deceleration into a hero card close-up | opening establishing → into the topic; chapter launches that slam from a global map into a single point |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A spatial base | perspective 1600 + whole group scale 0.76 + rotateX 18° rotateY -12° + preserve-3d | the tilt is where the sense of space comes from; a frontal blow-apart reads no depth |
| A blow-apart | each component translates along Z 60–320px, staggered 3f, 14f per layer with ease-out-back(1.7) | the back bounce gives a mechanical "click"; identical depth across components reads as the whole page floating up |
| A reassemble | reverse-order ease-in 12f, with a 2f exponential-decay shake (amp ~13px) on the landing frame | the shake is the drop hammer — without it the reassembly reads as a limp fade-in |
| A depth anchors | shadows shift down and blur with z·p + floor darkened 22% + distant layers brightness ↓28% | missing any one of the three cues muddies the layer relationships |
| C travel | one shared p drives rotateX 72°→0 + scale 0.42→1.35 + translate converging; origin pinned to the hero card center (e.g. 518,335) | one p = one camera maneuver; driving them separately reads as three animations fighting |
| C velocity curve | main dive 25f Easing.in(cubic) eating 82% of the travel → air cushion 20f Easing.out(poly(5)) covering 18% | the sudden speed drop at the switch is the air-cushion pushback feel; the 82/18 ratio matters more than the frame counts |
| C atmosphere | wrap the whole scene in CameraMotionBlur(shutterAngle 220, samples 9); a soft elliptical shadow under the page during the overhead phase dries up on landing | the soft shadow sells "hover height"; blur sells speed — missing either dimension feels fake |

## Known Pitfalls
- The demo was tuned and approved on grayscale/placeholder assets — the parameters are a tuning starting point, not a production spec; re-verify with real assets on first use
- Both variants need real screenshot layering/high-res textures: A needs the page sliced into per-component screenshots (header/sidebar/cards each as independent images — a single whole-page image can't blow apart); C's endpoint is a close-up, so treat the assets with aesthetic guideline Q2's high-resolution rasterization technique first
- C's easy-to-miss trap: Remotion has no Easing.quint — write Easing.poly(5) (a pitfall hit in this batch's actual renders)
- A's component layout must be absolutely positioned to replicate the original page grid (the demo's 8 layers replicate FakeDashboard A); a flowing layout can't do per-component translateZ

## Reference Implementation
demos/camera/space-camera-moves/
(DroneDiveLanding.tsx / ExplodedView.tsx)
