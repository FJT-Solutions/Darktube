---
name: deck-deal-flyin
summary: In a dark metallic background, a close-up of a physical deck of cards opens with an orbit, then pulls back to the page as a pile of cards slams into the grid like dealing — hard accelerating — with the camera chasing the scroll and resting half a second on the full board
use: list pages and card walls showing "massive content / endlessly streaming in"; establishing the first impression of information density
duration: dealing segment ~2.6s (36–113f), preceded by an optional ~2s (62f) deck close-up
energy: High (workhorse of the rhythm-climbing segment; don't use as the opening first shot)
---

## Intent
First the suspense (what is this pile?), then the answer (it's dozens of projects flying into the page and taking their places). The viewer should feel "things streaming in endlessly", each card slamming into place with urgency.

## Core Motion
- First half (pile-orbit-open, optional): all cards stacked into a physical deck with real height, dark brushed-metal background, camera orbiting around the deck in a tilted close-up, then pulling back while the metal background fades into the page — "pull back reveals the dashboard"
- **Anticipation (borrowed from Disney's principle 2)**: before the first card deals, one paragraph-level anticipation beat — the whole deck presses down slightly and the top card pulls back opposite to the deal direction, drawing the viewer's eye to the deck before the dealing. Anticipation only happens once at the paragraph level, **not per card** (per-card anticipation would drag down R2's hard-acceleration beat)
- Second half (deck-deal): 26 cards deal from the deck to grid target positions in reading order, with deal intervals contracting in hard acceleration; each card flies with a z-arc peak, overshoot settle, and landing press bounce-back (settle/press are principle 5's follow-through — a fast stop paired with cushioning; cutting it reads as a hard freeze)
- Camera chases with a downward scroll (getting faster), rests still 0.5s on the full board, then swooshes back to the search box to hand off to the next beat; during the ending rest, layers stop at different frames — card bodies lock first, shadows lag 2–4f in converging, afterimages dissipate last (drag hierarchy, borrowed from principle 5; all elements freezing on the same frame reads mechanical)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| orbit | frames 0→34, rotX 46/rotY −30/rotZ 9/zoom 1.95 around to rotX 42/rotY 26/rotZ −7/zoom 1.85, persp 1100 | The close-up needs all four pieces: side tilt angle + perceivable height + orbit + contrasting dark material (Q7, called out item by item by the user) |
| Stack height | STACK_STEP=3px physical layer height × 26 cards → top card z≈78px; pose jitter px/py via deterministic formula `(((k*7)%9)−4)*2` ±8px, rotZ ±3° | Jitter must be deterministic pseudo-random (hard rule: rendering must be reproducible); real randomness jitters between renders |
| Metal background | 4 layers: warm key light radial + two repeating-linear-gradient brushed stripes (1px white/2px black, 100deg) + 115deg steel gradient; plane 9000×9000 | Plane size must be generous (9000²) so no oblique angle breaks the illusion; the metal layer fades out during 34–56f in sync with the camera move |
| Anticipation | 10–14f before the first cue: whole deck presses down 40–50px (~60% of stack height) + top card pulls back ~30px opposite the deal, easing easeOut, released at the deal moment | **The magnitude must cross the eye's threshold**: the 4px/2px first version was totally imperceptible to users; it only passed after 12× magnification (48/30px) (judgment 2026-07-09 evolution round #2) — after rendering, self-check "can you see the build-up without scrubbing frames"; invisible means not done. Budget the frames from the tail of the orbit, don't crowd the dealing segment |
| Deal rhythm | kth card cue = 36 + 4k − 0.0792·k(k−1), intervals contracting from 4f to 0.2f | Uniform intervals instantly read mechanical; even uniform acceleration wasn't enough — it needed "hard-accelerating" level (R2/B3) |
| Card count | 10 real cards + 16 extras = 26; grid extends down 5 rows, paper extends 2036px | Not enough cards and the flood feel doesn't hold — err on the side of more; extras land in real extended grid slots, not floating (Q9) |
| Single-card flight | deal 8f (bezier(0.3,0,0.2,1), z arc peak +90px sin, scale peak 1.06) + settle 4f (bezier(0.3,0,0.25,1.15) slight overshoot) + press 0.996→1 bounce-back 2f | To bounce on landing you need a bezier with y1>1; settle+press total 6f ≈ 30% of the 8f flight — a fast stop with sufficient cushioning (principle 5 proportions); after settling, force identity transform against sub-pixel drift on tilted surfaces |
| Ending drag hierarchy | within the rest segment, layers stop at different frames: card body locks as soon as the press bounce-back ends, landing shadow `0 32px→0 2px` lags the body 2–4f, flight afterimage opacity trails another 3–5f to dissipation | Borrows principle 5's drag hierarchy (root→primary→secondary offset 2–4f); the 0.5s rest-still ruling is unchanged — the layered offsets happen at the head of the rest segment, everything locked by its end (the pattern has settled into assets/lib/helpers/motion.ts lagged) |
| Motion blur (per card) | during flight a 5% path-lag blur(6px) afterimage, opacity 0.25·(1−t) | Ghost afterimages are cheaper and sufficient vs. real motion blur — keep this approach at the single-card level |
| Motion blur (camera) | wrap fast camera-move segments with ≥30px/f (like the chase scroll) in `@remotion/motion-blur`'s `<CameraMotionBlur shutterAngle={180} samples={10}>`; use `<Sequence>` to slice the wrap to the start of the fast segment, don't wrap slow close-up segments (<10px/f) | At 30fps the camera jumps 50–70px per frame and strobing appears; a fast-pan smear is a physical instinct of film cameras; larger shutterAngle = longer smear (>270 gets blurry), samples scale with render budget (each +1 roughly doubles render time); wrapping the entire shot would smear-soften the 1px-level fine texture (brushed metal) during the slow orbit — wrap only the fast segment; borrowed from the official Remotion ecosystem, not a user judgment (2026-07-11 evolution round #8) |
| Chase scroll | 62→82f ~50px/f, 82→98f ~70px/f, 98→113f rest in place 15f=0.5s, then 11f swoosh back to the search box | The 0.5s stillness on the full board is a word-for-word user requirement (R2); removing it guarantees rework |

## Sound
Orbit pull-back + first batch of dealing pins whoosh-big (template pins at f308), the accelerating dealing segment pins whoosh-fast (f340/356). For rapid successive landing sounds, three tactics against the machine-gun effect: alternate two samples, step volume down, and let intervals follow the accelerating animation curve — when it gets dense enough to blur into one, let the sound fade into a single swoosh rather than voicing card by card (S2).

## Known Pitfalls
- Abstract flood-style attempts didn't converge across multiple rounds; switching to the "dealing" physical metaphor passed in one round (R2/B3) — for group motion, find the physical metaphor before writing code
- Card textures must be real page-element slices (Q1); hand-rolled fake cards look fake at a glance; extras reuse real card slices in offset positions
- Everything flying at once reads as an explosion; staggered accelerating is the soul; if the first-half orbit is cut, the dealing start needs another way to establish "where the pile came from"
- The anticipation/follow-through techniques borrow from Disney's 12 principles (condensed version built into the pixel2motion skill); the anticipation magnitude already has a user judgment (2026-07-09: "OK, I can see it now", after two smaller magnitudes were imperceptible); the drag-hierarchy layering remains the default recommendation — when it conflicts with R2 judgments (e.g., user wants faster and harder), the judgment wins
- Textbook proportions (anticipation = 20–30% of the main move) produce pixel displacements too small at a pull-back camera position — **compute pixels first, proportions second**; promo audiences watch the wide shot, not the close-up
- `<Sequence>` re-basing frame numbers plus CameraMotionBlur's internal Freeze makes PageCam sample wrong frames (horizontal smear breaks the illusion) — for absolutely-framed shots, pass the `frame` prop to PageCam to restore absolute frames (the lib component already supports it)

## Reference Implementation
template/src/aifl/live/SceneFlyIn.tsx
