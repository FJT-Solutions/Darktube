---
name: grain-dissolve
summary: A full line of text bursts into boiling grain noise with a diagonal selection box appearing; the noise cloud rapidly condenses into a larger glowing short wordmark, then translation decays to zero and freezes
use: Closing "XX. Now Live" launch announcements; the energy-gathering beat that compresses a long sentence into a brand short mark
duration: ~2.0s (60f@30fps; sand-ification 0.26–0.56s · condensing 1.2–1.42s · solidify-settle ending)
energy: Medium-high (a short, one-shot energy pulse; a natural outro beat-sync)
---

## Intent
Shoot "condensing a sentence into one word" as a physical event: the sentence first destabilizes and boils into particles (information disintegrating), the selection box implies "being selected and extracted", then all the particles' energy collapses inward into a larger, brighter short wordmark — what the viewer reads is "all of this comes down to it".

## Core Motion
- The filter chain is the only engine: `feTurbulence` (fractalNoise, baseFrequency 0.9→1.3) + `feDisplacementMap` (scale 0→52) + `feGaussianBlur` (0→1.1px), all three driven by the same `burst` curve (t=0.13–0.28, outCubic)
- The grain "boils" via `seed = floor(t*46)` swapping the seed every frame — a new noise field each frame, particles never still
- t=0.60–0.71 cross-fade: the full line (33px) fades out, the short wordmark (54px bold) fades in, both under the same filter — the switch happens at peak boiling, so the viewer never sees the text swap
- The `lock` curve t=0.68–0.90 pulls displacement scale and blur back to 0, "solidifying" the particles into crisp glyphs
- Three-stage white glow: 0.3 dim during sand-ification → spikes to 0.7 at condensation → settles back to 0.45 after t=0.88, with the `drop-shadow` radius 4–24px breathing in sync
- The diagonal selection box (45° line array + four-corner pixel-checkerboard handles) appears with the burst and is removed at t=0.55–0.64 — it exits before condensation, never competing with the subject

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| displacement scale | Peak 52 | Below 30 it's just "slight fringing"; above 80 the particles scatter past recognition — "dimly discernible" is the floor for the sanded texture |
| baseFrequency | 0.9 → +0.4 | Higher = finer particles; below 0.5 it becomes large blocky distortion, not "sand" |
| Seed swap rate | floor(t*46), 46 times in 2s | Lowering it makes the noise-field repetition visible; keep the swap rate ≥20 times/sec |
| Sand window | 0.13–0.28 (outCubic) | The clean text's 0.13 of stillness up front is "normalcy before destabilizing"; cutting it removes the contrast |
| Condensation cross-fade | 0.60–0.71 (inOutCubic) | Must complete the text swap inside the peak-boiling stretch; earlier and the viewer sees the two lines' overlapping ghost |
| Glow envelope | burst·0.3 + cond·0.7 − settle·0.45 | The condensation spike is the beat-sync point, pressing the BGM accent; don't settle to 0 — leave soft-glow "afterglow" |

## Known Pitfalls
- When changing the wordmark copy (ACME → the project short mark), both `<text>` lines must change: the full-line pattern `{ XX. Now Live }` and the short mark XX must reference the same object, or the narrative breaks
- A longer short mark (>6 characters) needs the 54px font size shrunk or the selection-box bw widened, or the condensed mark overflows the frame and shifts the visual weight
- `feDisplacementMap` performs poorly on Safari; acceptable for this card's 2s short shot — stretching the duration requires measuring real frame rates
- The selection-box exit (0.55–0.64) must precede condensation completion (0.71) — a box lingering past solidification reads as "still selecting", inverting the meaning

## Reference Implementation
demos/outro/grain-dissolve/
(GrainDissolve.tsx)
