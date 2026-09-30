---
name: app-transition-showcase
summary: Three in-app transitions chained together in a phone app: push slides in (list→detail), zoom pulls closer (detail→form), morph transforms shape (form→done card); each transition starts and stops on its own, then the whole device breathes to settle
use: App promo showing in-app page transitions; emphasizes the differences between transition types
duration: ~7.4s (222f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (each of the three transitions has its own start and stop)
tags: transition
---

## Intent
Shoot "how in-app pages switch" as a transition-type showcase: inside the same phone, three different transitions play back to back — push (the new screen presses in from the right while the old screen pushes left at the same speed), zoom (the whole screen scales up and fades out into the next screen), morph (a content card morphs in place into a done card). The core is "type differences": each transition has a different direction of movement, scaling, and shape change, so the viewer instantly distinguishes three different switching feels.

## Core Motion
- Single hero (grayscale phone app pages) full action arc: f4 phone fades in (opacity 0.85→1) + settles with a slight rise (translateY 20→0, 16f ease-out)
- (1) push (f24–64, 40f ease-out): new screen translateX 100%→0 presses in, old screen 0→-30% pushes left at the same speed; both screens couple on the same frame to create a "push" feel
- (2) zoom (f88–128, 40f ease-out): detail screen scale 1→1.4 scales up and fades out, form screen scale 0.85→1 scales up and fades in; the two screens' scaling crossfades in sync
- (3) morph (f152–188, 36f ease-out): form content morphs in place into a done card — card scale 0→1 + opacity 0→1, centered position, a shape transformation rather than content interpolation
- Each transition has an explicit dwell between them: f72 after push, f136 after zoom, f196 after morph; hold still before switching to the next one
- After settling, a whole-device 1.6s (48f) breathing cycle (scale 1.00→1.008→1.00), holding until f222

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phone entrance | f4 fade in 0.85→1 + translateY 20→0 (16f, ease-out) | Starting the fade too low looks like a black screen; too much displacement reads as "bouncy" |
| push | f24–64, new screen translateX 100%→0, old screen 0→-30% (40f ease-out) | Both screens must move at the same speed, otherwise it's a "slide" not a "push" |
| zoom | f88–128, detail scale 1→1.4 fades out / form 0.85→1 fades in (40f ease-out) | The scaling must be applied to the whole screen, not just the content card |
| morph | f152–188, card scale+opacity morph in place (36f ease-out) | It's a shape/scale morph, not per-character content interpolation |
| dwell | ≥14f hold after each transition (f72 / f136 / f196) | Without dwell it chains into "perpetual motion" and can't be read as three independent transitions |
| Breathing | After settling, every 48f (1.6s) scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |
| Palette | Grayscale: #f4f4f2 screen background, #fff cards, #26262b detail header/checkmark, stage beige-gray #e8e6e1 | Grayscale keeps the transitions from being interfered with by color |

## Known Pitfalls
- The three transitions must be clearly distinguishable: push is displacement, zoom is scaling, morph is shape change; don't make them all fade in/out
- Every screen needs a dwell (hold) window; transitions can't run continuously — the viewer needs to "read" each screen
- Morph is a position/scale morph (scale+opacity transform in place), not per-character content interpolation
- Screen content must be self-drawn vector mockups, no screenshot textures
- Copy uses fictional demo data, not pointing at a real product

## Reference Implementation
demos/mobile/app-transition-showcase/
(AppTransitionShowcase.tsx)
