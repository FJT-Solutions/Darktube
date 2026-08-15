---
name: circle-match-iris
summary: Circle-matched iris transition — the iris bursts from the center of a circular element on the foreground page, and the new page's circular chart inside the iris picks up on the same circle; the match cut gives the iris a semantic anchor
use: Seams where the foreground has a circular element (avatar/icon/round button) and the background has a circular subject (donut chart/ring progress); transition technique card
duration: 4.7s (anchor pulse 30f + iris expansion 45f + chart growth 55f + stillness 40f)
energy: Medium-High
---

## Intent
A plain iris (the glossary's original entry) opens from an arbitrary point and viewers only read "page changed". This card welds it to a match cut: the iris must burst from the center of a **real circular element** in the foreground, and inside the circle the growing new page contains a circular chart that happens to continue on the same circle — what viewers see is "the avatar's circle became the chart's circle", with the circle itself completing the narrative (this person → this person's data). This is the match cut's grounded form in a UI context: it doesn't rely on compositional coincidence, it relies on semantic circle-to-circle. It belongs to the same "background pre-present in foreground" family as the three travel variants, but the anchor is an abstract shape rather than a container.

## Core Motion
- **The two scenes' circles being strictly concentric is the linchpin**: the anchor center is hard-coded as one set of constants (demo: CX=308, CY=384.8, hand-computed from the layout); clip-path circle, new-scene ring, and pulse halo all reference the same set of constants — computing coordinates independently guarantees a misaligned center
- Gaze fixation: before the iris opens, the anchor element pulses twice with a scale-up + two expanding halo rings (30f), pinning the eye on the circle before it moves
- Iris `clip-path: circle(r at x y)`, r 22→2100px (45f inOut cubic); the new-scene ring grows 22→170px in the same window — **the circle is caught mid-expansion** (viewers see the circle being caught before the iris has filled the screen), not drawn after the iris fully opens
- Ring sweep: strokeDasharray = sweep×circumference, rotate(-90) starting at the top, the center number counting up in sync with the sweep

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Anchor pulse | 2× scale 1→1.15 + two halo rings / 30f | Without the gaze-fixation guide, viewers can't find the circle center the instant the iris opens |
| Iris expansion | 22→2100px / 45f Easing.inOut(cubic) | Faster than 30f and the circle catch is unreadable; center offset >10px is an instant illusion break |
| Catch timing | The ring is visible and concentrically growing mid-expansion (~40% progress) | Growing the chart only after the iris fully opens = ordinary transition + ordinary chart animation, and the match feel drops to zero |
| Sweep | 45–100f to target, number counting in sync | Number out of sync with the sweep reads as two animations |
| Ending | After the sweep completes, true stillness ≥40f | R1 |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- On real assets, measure the anchor coordinates from the screenshot (devtools/ruler); what you measure is the element box, not the visual circle center — for avatars with padding, take the content center; after measuring, render a frame and adjust the constants if the alignment is off. Don't trust the first measurement (same ruling as transition-travel C's letterform cavity)
- The foreground anchor must be a **true circle**: using a rounded square (border-radius < 50%) as the anchor reads fake the instant the circle opens — the demo patches the square into a true circle with a white fill
- Semantics must be paired: avatar→personal data, product icon→product metric — circle-to-circle is only the shape; "this circle's content becomes its expansion" is what makes the match cut valid
- One seam one variant, same rule as shot-transitions; this card already carries a chart-growth segment, so don't stack additional entrance motion on the new scene inside the iris

## Reference Implementation
demos/transition/circle-match-iris/
(CircleMatchIris.tsx)
