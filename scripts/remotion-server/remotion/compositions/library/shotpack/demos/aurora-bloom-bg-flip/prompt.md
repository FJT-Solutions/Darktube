---
name: aurora-bloom-bg-flip
summary: Soft-focus purple-orange blobs rise from the bottom of a light gray background, then the whole base color darkens to near-black in ~0.36s and the blobs compress into afterglow; the copy syncs a blur-out sentence switch with a blur-in, leaving a gap between sentences rather than cross-fading
use: Narrative turning points ("for many years…→everything changed"); the beat where a brand film pulls from build-up to accent; paragraph transitions between light and dark palettes
duration: ~5.2s (156f@30fps)
energy: Low to high (first 2/3 is build-up; the darkening instant is the film's accent)
---

## Intent
Use "base-color inversion" as an accent mark: for the first 62% let the aurora rise slowly and the viewer adapt to the light background, then darken the whole frame to near-black in under 0.4s — this hits more like "turning the page" than any zoom/flash-white. The copy switch must land after the inversion, with a gap in between, so the viewer absorbs the visual change before reading the new sentence.

## Core Motion
- Three `blur(60px)` blobs rise from the bottom of the frame: main purple `rgba(107,79,224,.85)` at 90%×85%, orange core `rgba(217,122,74,.9)`, white melt edge `rgba(255,255,255,.8)`
- Rise `seg(0.04→0.62, outCubic)`: `translateY 32%→−6%` + `scale 1→1.25`
- Inversion `flip = seg(0.63→0.70, inOutQuad)` (normalized 0.07 ≈ 0.36s): base color `mix([236,236,236] → [10,10,18])`, blob opacity 1→0.4 compressed into afterglow, white melt-edge layer removed via `1−flip`
- Orange core independently drifts `translateX ±8%` (2.2 cycles/full film) slowly sideways, giving the blob internal relative motion instead of moving as one block
- Sentence A word-by-word `blur 0→8px` + fade out (stagger 0.04, 0.10 each, inQuad); sentence B word-by-word `outQuint` blur-in (stagger 0.06, 0.11 each), then within 0.16 after landing the DEEPP purple settles to white

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Blob blur/size | blur(60px), main layer 90%×85%, container inset −10% | Below 40px blur you can see it's a circle — a "color ball", not "light" |
| Rise | translateY 32%→−6% + scale 1→1.25, t 0.04→0.62 outCubic | Taking 60% of the duration is deliberate: the longer the build-up, the more weight the inversion carries |
| Inversion duration | t 0.63→0.70 inOutQuad ≈ 0.36s | **The linchpin**: stretched to 1s it stops being an accent and becomes a gradient transition |
| Base color | #ececec → #0a0a12 (not pure black) | Pure black causes banding at the afterglow blob edges |
| Blob dim | opacity 1→0.4, white melt-edge layer zeroed in sync | Without dimming, purple-orange overexposes into a blob in the dark field |
| Orange core drift | translateX ±8%, 2.2 cycles/full film | At 15% it reads as "one ball moving" |
| Sentence A blur-out | word-by-word stagger 0.04, 0.10 each, inQuad, blur→8px | inQuad makes the vanish accelerate, reading as "swallowed by light" |
| Sentence B blur-in | word-by-word stagger 0.06, 0.11 each outQuint + purple→white within 0.16 | Color settling comes slightly after entry; it turns white only on the settled instant — the "final draft" signal |
| Sentence gap | A ends t≈0.64 → B starts 0.76 (≈0.6s with no text) | cross-fade smears the two sentences together; only the gap reads as "turning the page" |

## Known Pitfalls
- The white melt-edge layer (blobC) only works on a light background; it must be removed with `1−flip` at the inversion, or a gray fog remains in the dark field
- DEEPP/PURPLE is this effect's **core light color**, not a brand-color slot; to swap in a project color, change the blob layers + sentence B text color as one group — changing only the text color disconnects it from the background
- Copy is neutral placeholder ("For many years" / "everything changed"); the word-by-word stagger rhythm depends on word count and length — adjust the 0.04/0.06 intervals when swapping sentences
- Write the base color frame-by-frame in JS (`mix()` produces solid colors); don't use CSS transitions, or the color is indeterminate when seeking to any frame

## Reference Implementation
demos/effects/aurora-bloom-bg-flip/
(AuroraBloomBgFlip.tsx)
