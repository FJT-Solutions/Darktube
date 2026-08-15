---
name: graze-face-tour
summary: High-angle face-grazing close-up tour — the camera skims low across the UI surface (sidebar tree/header/list as terrain), while page text initially floats above the interface with matching soft shadows, then accelerates down to stick back onto the interface one after another as the camera advances
use: Feature-zone tours (flying over the UI as landscape); pair with a dark scene + neon edge glow for a product "inner world" segment; interface content appears zone by zone
duration: 4–5s per segment; can chain multiple segments to extend
energy: Medium-high (continuous camera drive + elements landing in sequence, high information density)
tags: ui-entrance
---

## Intent
Shoot the UI as terrain: a steep close-up angle turns the sidebar tree, navigation, and list rows into sweeping landforms, with shallow depth of field reinforcing the "face-grazing" feel. The signature move is **text sticking down from the air**: text/components don't fade in place — they float above the interface (lifted on the 3D z-axis), casting matching soft shadows onto the interface while airborne, then accelerate down one after another as the camera advances, the shadows shrinking away as the height closes — viewers see the interface "complete itself" as the camera passes. The shadow is the perceptible linchpin: without it, floating reads as an ordinary translate-in entrance; with it, the spatial relationship snaps into place.

## Core Motion
- Camera position: CSS perspective + steep rotateX/rotateY (the surface nearly grazing past), continuously advancing along a path across the interface; shallow depth of field = blur growing toward distance
- Floating elements: initial hover height H≈120–180px (lifted along the surface normal); easeFall accelerated descent + soft landing (no bounce-back, or barely any, on touchdown)
- Matching soft shadow: render a blurred, darkened projection at the element's footprint; blur/offset/opacity all follow the current hover height (higher = bigger, blurrier, fainter shadow; landed = shadow collapses into the body and disappears)
- Staggered sticking: each element's landing time is ordered by the camera's travel direction (whatever passes first lands first), so the interface "completes in sequence" before the lens
- Long shots can be split into chained segments: cross-fade between adjacent segments (adjudication: non-overlapping opacity windows produce black flash frames)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Hover height | 120–180px | below 80px neither shadow nor displacement reads; above 250px the landing slams too hard |
| Shadow params | blur/offset/opacity converge linearly with height | a constant shadow that ignores height = sticker feel; the landed shadow must go to zero |
| Staggered sticking | ordered 0.2→0.85 normalized by camera travel direction | all landing on the same frame reads as a switch; random order reads as a bug; **stagger = offset start times but overlapping parallel descents** — serial waiting (one finishes before the next starts) gets cut (runway adjudication) |
| Descent curve | easeFall accelerated + soft landing | an ease-out descent reads like a balloon drifting down; the gravity feel comes from acceleration |
| Segment relay | adjacent segments cross-fade ≥8f | non-overlapping opacity windows cause black flashes (rework adjudication: pure black frames at f100) |
| Depth of field | blur grows toward distance | fully sharp reads as flat scrolling; only shallow depth gives the "face-grazing" feel |

## Known Pitfalls
- The demo was tuned and approved on grayscale/placeholder assets — the parameters are a tuning starting point, not a production spec; re-verify with real assets on first use
- Don't let ambient dark bands swallow floating elements (adjacent candidate, runway adjudication): airborne elements need ~1.3× spotlighting/brightening, otherwise the floating state is imperceptible, which is as good as not doing it
- Division of labor with space-camera-moves/tension-camera-moves: those two are the camera language itself; this card's signature is the face-grazing position **+ elements sticking down** — if either half is missing, use the camera cards instead
- **Landing-rhythm semantics adjudication** (the counter-example to neon-frame-orbit-drop): this card's tour shots = staggered in parallel; an overall-entrance shot must have everything land on the same frame (that card's staggered version was cut). Choose the wrong grammar and both get cut
- The source video (clickup-30) is one continuous ascending long shot; the replica uses a three-segment relay with transitions hidden in the cross-fades — if production needs a true single long shot, path planning costs far more

## Reference Implementation
demos/camera/graze-face-tour/
(GrazeFaceTour.tsx)
Source video: clickup-30.mp4
