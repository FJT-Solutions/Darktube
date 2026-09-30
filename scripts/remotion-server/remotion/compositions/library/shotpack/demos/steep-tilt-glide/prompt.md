---
name: steep-tilt-glide
summary: Under a fixed camera, an upright page stands at a steep 60° perspective (right edge near, left edge far), and the page itself slides along its own 3D lateral plane past the lens (object moves, camera doesn't); the slide carries velocity ghosting, floating text/components stick down, and the scene opens from dark into light
use: Showcase tours of long/multi-section UI (content slides past a fixed camera position one by one); dark-scene neon mood; the "side-sweep" position that complements the face-grazing camera cards
duration: 4s (120f) single shot; wider pages can run longer
energy: Medium-high (perspective spectacle + continuous motion, but an even rhythm)
tags: ui-entrance
---

## Intent
Stand the page up as a slanted wall: the lens stays pinned, the 60° steep perspective brings the right edge close to the face while the left edge vanishes into the vanishing point, and the page slides laterally along its own plane — content passes by one after another like train cars. The linchpin is **the object moves, the camera doesn't**: perspective/origin/rotY stay constant throughout; the only thing that moves is the page's local translateX — the moment the camera moves, the semantics degrade into camera spectacle, whereas the point here is "the page showing itself off." The angle converged to exactly 60° over three rounds (-45° "wrong" → -53° "a bit more" → -60° chosen).

## Core Motion
- Camera constants: perspective 1100, origin 30% 58%, rotateY(-60°)+rotateZ(-2°), transformOrigin left top — one number, never changing throughout
- Page: an ultra-wide panel (6200×2400 @ content coordinates), sliding along its local X axis +60→-4100 on bezier(0.3,0.12,0.72,0.9) — a soft start easing into near-constant speed, with the tail slope never reaching zero (no uneasy dead stop)
- Velocity ghosting: the trail layer re-projects past positions (f-2.5/f-5), with opacity ∝ slide speed (faster = denser ghost)
- Floating stick-down: page elements hover at 230–280px via FloatWrap with matching soft shadows, sticking down staggered with the slide progress (tour grammar)
- Reveal to light: the panel starts darkened to 0.7, revealed to full brightness by ~1.4s; an extra gradient shadow on the left edge recedes with it

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Tilt angle | rotateY **-60°** (precisely fixed by the user) | -45° was cut as "wrong angle", -53° "a bit more"; >-70° makes content unreadable |
| Motion model | all camera constants, the page moves itself | **linchpin** — the camera-panning version was cut with "the camera is fixed; the page moves along the lateral plane of its own 3D space" |
| Slide curve | a bezier whose tail slope never reaches zero | a mid-run dead stop gets caught (v4 rework); a fully linear curve loses the breathing start |
| Ghosting | opacity ∝ speed, two layers at f-2.5/f-5 | constant ghosting reads as a double-image glitch |
| Page width | ≥3 screens of content | too narrow and the slide finishes in two seconds, not enough for one shot |
| Floating stick-down | staggered (tour grammar) + shadow following height | semantic adjudication: see the graze-face-tour/orbit-drop three-card family |

## Known Pitfalls
- The demo was tuned and approved on grayscale/placeholder assets — the parameters are a tuning starting point, not a production spec; re-verify with real assets on first use
- Angle adjudication: the perspective angle is this card's identity; keep production tweaks in the 55–65° range — leaving it means switching techniques
- Division of labor with graze-face-tour: that one's camera moves (face-grazing tour) with a still page; this one's camera is still while the page moves. One-or-the-other in the same segment
- Division of labor with runway-ground-skim: that one is an overhead flat-lay + vertical stick-down + rise-up; this one is side-standing + lateral slide, with orthogonal axes
- Ultra-wide pages are expensive to draw by hand; production can substitute real long screenshots (the slide logic stays the same)

## Reference Implementation
demos/camera/steep-tilt-glide/
(SteepTiltGlide.tsx)
Source video: clickup-30.mp4
