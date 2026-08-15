---
name: cube-navigation
summary: Content pasted onto all six faces of a 3D cube, the camera alternating between front close-up → pulled back to an isometric view of the edges → rotating to a face and pushing in, stepping through each; every face computes lighting in real time from its normal direction
use: "Face-by-face navigation" showcase for multi-module products: spatial walkthrough of 3–6 sections like Overview/Metrics/Timeline
duration: ~6.0s (180f@30fps; five camera steps, ~0.7s each + hold)
energy: Medium (steady spatial cruising, with beats coming from the perspective shift at each face rotation)
---

## Intent
Upgrading "switching pages" to "rotating a cube": modules are not parallel tabs but six faces of one entity. The camera alternates between close-up (reading content) and isometric (seeing structure), so viewers always know "which face of the whole I'm on". Spatial continuity replaces the transition.

## Core Motion
- Six faces each `rotateX/Y(±90/180°) translateZ(95px)` onto a 190px cube, `backface-visibility:hidden`, each face with its own hue (224/268/330/190/154/34) + title + 4 info bars + corner glyph
- The camera walks a lookup interpolation of 6 key poses (`acc` + inOutCubic): front close-up (d=235) → isometric pull-back (rx−22/ry−38/d=−130) → right-face close-up → isometric → back-face close-up → isometric ending; the close-up and isometric d values differ by 365px, so "push in / pull back" carries the bulk of the perspective change
- Five segment windows `[0.10,0.24][0.30,0.44][0.50,0.62][0.66,0.78][0.84,0.97]`, with holds between segments to read the face
- **Normal lighting**: each face's normal is rotated by Rx·Ry and its z component taken, `brightness(0.5+lit*0.62) + saturate(0.8+lit*0.4)` — a face naturally brightens turning toward the camera and sinks turning away, killing the plastic look
- Opening 0–0.08 overall fade-in

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Cube size | S=190px, perspective 760px | persp/S ≈ 4 is the balance where "edges are readable without distortion"; persp <500 has strong wide-angle distortion |
| Close-up distance | translateZ(235px) | Larger = more face-to-face; the isometric segment's −130 pulls back to expose three faces, and the difference between the two values sets the "breathing amplitude" |
| Segment window | Each segment 0.12–0.14 + hold 0.04–0.06 | A rotation segment shorter than 0.1 can't be tracked; the hold is the content-reading slot |
| Isometric angles | rx −22~−27 / ry −38~−52 per step | Isometric requires both rx and ry; missing one is just planar rotation |
| Lighting factor | brightness 0.5–1.12 | Lower bound <0.4 makes the back face fully black and loses volume; removing lighting instantly turns it into a "cardboard box" |
| Face content | Title + info bars + glyph (placeholder) | When swapping in real screenshots, keep each face's own hue background — it's the first recognition cue of "face identity" |

## Known Pitfalls
- What moves is the camera rig (`translateZ + rotateX/rotateY` in a fixed order); don't switch to moving each face — the normal-lighting formula depends on the rig's rotation matrix
- The six face hues are the navigation memory points; switching them all to one hue family makes it "rotated but don't know which face you're on"
- The ry step value decides which face you turn to (−90 right face / −180 back face); adding/removing faces requires re-arranging the CAM table and keeping ry monotonic (swinging back and forth causes dizziness)
- The lighting `max(0, z2)` intentionally makes backlit faces fully dark — if you want a touch of ambient light, use `0.15 + 0.85*lit` instead of raising the brightness floor

## Reference Implementation
demos/transition/cube-navigation/
(CubeNavigation.tsx)
