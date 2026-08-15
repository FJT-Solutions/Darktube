---
name: bubble-swarm-takeover
summary: Pearl-gloss bubble swarm curtain transition — bubbles of varied sizes drift in from off-screen, growing until they fill the whole screen, while the page simultaneously "washes white". The cut is hidden at the occlusion peak, and once the bubbles scatter outward the new scene is already there; an i18n text-capsule variant can be mixed in
use: Chapter-level scene changes where the brand world has "physical decorative objects" that can serve as a curtain (bubbles/petals/icons are all re-skinable); sections where the transition itself is a brand exposure
duration: ~4.3s (130f: drift-in ~67f + peak-hide cut + scatter ~43f)
energy: Medium-High (sustained swarm movement, no instantaneous impact)
---

## Intent
The foreground-occlusion approach in transition-hidden-cut is "an object sweeping across for 1–3 frames", and wipe-transitions is a geometric boundary sweeping across — both are "boundary" thinking. This card is "curtain" thinking: let a **swarm** of brand objects spend 2 seconds drifting into the foreground, growing to cover the screen, hide a hard cut at the occlusion peak, then scatter to reveal the new scene. What makes it superior to geometric wipes is that the curtain is itself a brand asset — the longer the transition, the more brand exposure, so slowness is no longer a problem. Two linchpins: **the peak must truly fill the screen** (6 giant bubbles are anchored to a grid as the safety net; the random swarm only carries the atmosphere); **the white-wash layer sits between the page and the bubbles** — the page loses its details first, then the bubbles can take over all the attention, and the cut happens behind the white veil so viewers have no chance to compare frames before and after.

## Core Motion
- Bubbles = CSS radial-gradient circles (highlight offset at 34%/28%, four groups of pink/purple/blue/cyan hue variations) + inset white halo + outer glow; three depth layers: far blur7 / mid in focus / near blur9 bokeh
- 34 regular bubbles random-seeded (mulberry32): entry timing 8–50f, starting off-screen on all four sides, landing points scattered across the whole screen; sinusoidal wobble (amplitude 10–32px) keeps the swarm "alive"
- 6 giant bubbles (r 430–570) anchored to 2×3 grid landing points, entering at 22–36f — full coverage at the peak depends on them, not on luck
- Peak frame 75 is a hard scene cut (frame < PEAK ? A : B); the white-wash layer's opacity 0→0.92 (42–68f)→0 (82–104f), a white overlay sandwiched between the page and the bubbles
- Scatter = push outward radially by 1700px from the screen center as the pole, ease-in acceleration on exit + shrink 35% + fade out at the tail; ease-out on entry, ease-in on exit, breathing in opposite directions
- i18n capsule variant: text capsules hang on designated bubbles, drifting with the host (+ slight rotation), enabled when presenting abstract capabilities like "multilingual"; ≤3 capsules, more turns into a word cloud (that's another technique)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Peak frame | 75/130 | The hidden-cut point; drift-in before the peak needs ≥60f to feel like a "rising tide", <40f reads as a face-slap |
| Bubble count | 34 random + 6 grid giants | The giants are the screen-coverage guarantee; removing them always leaves gaps; <20 random bubbles and the swarm feels sparse |
| White-wash | 0→0.92→0, held at 0.92 across the peak window | <0.8 lets old/new scenes be compared and breaks the illusion; 1.0 becomes a pure white flash and swallows the bubbles |
| Depth of field | blur 7 / 0.5 / 9, three layers | All-sharp reads as sticker rain; without blurred foreground there's no depth sense of "passing through the swarm" |
| Scatter | Radial 1700px ease-in + scale ×0.65 + tail fade-out | Retreating along the original path reads as reverse playback; only fading out without pushing outward reads as the bubbles "bursting" |
| Wobble | sin(f×0.09) × 10–32px | Without it the swarm looks like a texture being translated; >50px reads as turbulence |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Division of labor with transition-hidden-cut: that card is a 1–3 frame "invisible scissors" (the occluder is an element already in the composition, fast in and fast out); this card is a 2-second-level "curtain ritual" (the occluder is an outside swarm, slow to swell and slow to scatter) — tight seam budgets use that card, chapter curtains use this card
- Selected at the same layer as wipe-transitions/shot-transitions: geometric wipes/whiteout are neutral transitions; this card carries its own brand character — don't force it when the brand has no "physical decorative object" asset, and use geometric styles back for neutral sections
- The highlight offset of the pearl-gloss gradient (34%/28%) is what creates the "3D sphere" illusion; switching to a centered radial gradient instantly makes it a flat dot
- Within ±2f of the peak frame, no bubble may have an opacity gap <1 that exposes the underlying layer — check by exporting the peak frame as a single frame and looking for old-scene pixels
- When re-skinning in production (petals/logos/emojis), keep the two iron rules: three depth layers + grid safety net. Shapes can change, structure cannot

## Reference Implementation
demos/transition/bubble-swarm-takeover/
(BubbleSwarmTakeover.tsx)
Original footage: loom-ai 9–12s (i18n capsule variant folded in from 30–34.5s)
