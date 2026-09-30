---
name: tension-camera-moves
summary: Four emotional camera moves — bullet-time freeze orbit, dutch-roll righting, slow-push pressure, pull-back isolation; the camera makes viewers "feel" instead of "watch"
use: Camera language for emotional nodes (awe/correction/buildup/closure); complements space-camera-moves' "spectacular big moves" — these four are small in motion, heavy in emotion
duration: 4–5s per variant; ≤2 variants total per video (≤1 use each)
energy: A High / B Medium / C Low, building / D Low, closing
---

## Intent
space-camera-moves' three variants are spectacular highlights that "shoot the page as a 3D object"; these four are the opposite — the motion itself is restrained, and all the power lives in the emotional semantics: A says "this moment deserves time stopped" (moving elements are frozen mid-motion while the camera orbits to examine); B says "the problem is solved, the world is righted" (the sickening tilt hangs, then rolls back to level on the beat); C says "something is about to happen" (a push-in so slow it's imperceptible, stacking tension toward a hard-cut release at the peak); D says "in the end, only this one thing remains" (as it pulls back, the surroundings go dark layer by layer, leaving a single point suspended to close the whole film). Each variant owns an emotional slot — the direct vocabulary for "what the viewer should feel in this segment" at storyboard time.

## Four-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A bullet-time-freeze-orbit freeze orbit | the chart freezes mid-growth, the camera sweeps rotateY 55° around the hovering UI plane and back, then time resumes and the growth finishes | the crowning moment for core data/charts; the frame that's "worth stopping the clock for" |
| B dutch-roll-to-level dutch roll to level | the pain-point segment hangs at a -10° dutch angle (with slight drift), then one beat of the solution rolls it back to level with a single overshoot | the pain-point→solution flip beat; correction semantics |
| C slow-push-in slow push pressure | 4s of uniformly accelerating push 1.00→1.14 + deepening vignette, hard-cutting to a bright scene with no transition at the tension peak | building tension before big numbers/statements; the dark→light chapter explosion |
| D pull-back-isolation pull-back isolation | pulling back from the glowing hero card close-up, sibling cards fade out staggered by distance and the background sinks to black, leaving the lone card suspended center-stage | closing; the curtain call for "the whole film was for this one number" |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A dual clocks | content animation driven by `effFrame = f<F1 ? f : f<F2 ? F1 : F1+(f-F2)`, camera driven by real f | linchpin: during the freeze, content must be visibly fully static while the camera moves — the two clocks mind their own business |
| A orbit | under perspective 1600, rotateY 0→55°→0 (two inOut cubic segments, ~10f hover at the apex) + scale 1→1.12→1 | 55° is the floor for "orbit around to see the side"; >70° makes the panel a paper-thin break |
| B tilt | rotate -10° + ±0.8° long-period sine drift + 2px vertical drift; scale 1.15 to avoid showing edges | the drift is the living "hanging in discomfort" feel; a purely static dutch angle reads as a composition error |
| B righting | 14f ease-out overshooting past 0 to +1.2° → 10f settling back to 0 (single overshoot, no oscillation); scale synchronizes 1.15→1.08 | the overshoot is "the hand strength of the righting"; more than two oscillations reads as a spring toy |
| C push-in | `scale [0,120f]→[1.00,1.14] Easing.in(quad)` + vignette opacity 0→0.5 on the same curve | the accelerating curve is the essence — a uniform push reads as an ordinary zoom; amplitude >1.2 becomes a plain push-in |
| C hard cut | at the peak frame, cut straight to the next scene with zero transition; the contrast from dark scene A to bright scene B must be strong | the cut itself is the release; adding any transition is like drawing a bow fully and letting it down slowly |
| D pull-back | scale 2.2→0.62 / 110f Easing.out(cubic), origin locked to the hero card center | for the first 20f the hero card still fills the frame — it opens as a close-up, no extra hold needed |
| D dousing | sibling cards ordered by hypot distance, one every 8f from f30, reaching opacity→0 + brightness→0.3 within 16f; background sinks into #141414 over f60–110 | dousing near-to-far = "the world collapses outward into darkness"; dousing out of order reads as a glitch |
| D glow | the hero card gets a double white box-shadow fading in over f60–100 | the glow is the visual testimony of "only it remains"; it only holds when synchronized with the sinking black |
| Ending | after all four variants' actions, true stillness ≥30f | R1; D is the film's full stop — give the stillness a solid 40f+ |

## Known Pitfalls
- The demo was tuned and approved on grayscale/placeholder assets — the parameters are a tuning starting point, not a production spec; re-verify with real assets on first use
- C's "imperceptible in the first 2 seconds" is a design intent, not a defect — judging/acceptance checks the full playback; a frame-diff showing tiny early changes is normal (already confirmed valid)
- A is time manipulation like speed-ramp-freeze/impact-feedback — don't stack them in the same shot (frame remaps fight each other); A's freeze is "stopped for you to see" + camera motion, while speed-ramp's freeze-frame is "stop to annotate" — choose by semantics, not by resemblance
- B's dutch angle presses only the "pain-point" segment — a permanently tilted video is music-video language; in a product film it reads as an unsteady camera
- The bright scene after C's hard cut must be information-complete and readable (it inherits all the stacked attention); cutting into another build-up segment wastes the tension
- When D closes the film, following it with outro-group-photo-launch conflicts (one closes, one opens) — choose one or the other

## Reference Implementation
demos/camera/tension-camera-moves/
(BulletTimeFreezeOrbit.tsx / DutchRollToLevel.tsx / PullBackIsolation.tsx / SlowPushIn.tsx)
