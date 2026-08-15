---
name: white-flash-logo-simplify-cut
summary: A colorful liquid-gradient wordmark sits in flowing shimmer, the frame slams to white overexposure in one beat, and a flat version of the wordmark fades in and freezes on the white ground — one white flash completes a dimensionality reduction of texture
use: Brand-section closers (showy presentation→clean final look); the transition beat where mood switches from showing off to a formal announcement
duration: ~3.6s (108f@30fps; seated shimmer 0–1.2s · slam to white 1.2–1.5s · flat freeze 1.7–2.7s)
energy: Medium-High (one pulse-like accent, stillness both before and after)
---

## Intent
First give plenty of showiness (a six-color liquid gradient flowing over the letterforms, soft light sweeping), then use one white flash to "purify" it into a flat three-color wordmark — viewers read "the show is over, this is its official identity". The dimensionality reduction is rhetoric: switching from sensory texture to rational recognition.

## Core Motion
- Liquid layer: six-color gradient `background-size:320%`, `backgroundPosition = t*100%` flowing slowly throughout; one 220×120 radial soft light (blur 6px + screen blend) sweeping ±30px horizontally with t as a highlight
- Slam to white t=0.34–0.42 (inQuad accelerating in) white layer covers fully; in the same window give the liquid layer a `sin(π)` pulse: blur 0→5px + brightness 1→2.2 — the one frame of "overexposure burning through"
- The white layer **stays after slamming in**, all-white ground for the rest of the segment
- Flat wordmark t=0.48–0.74 fades in + scale 0.96→1 (outCubic), text color a three-stop linear gradient (`GRAD_A/B/C` constants, replaceable per project)
- The soft-light layer dies in sync with the white slam (`1-flashK`), not lingering on the white ground

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| White-slam window | 0.34–0.42 (inQuad) | Converts to 0.29s@3.6s — the slam must be "fast in, never fades out"; outQuad makes the white read as drifting in |
| Overexposure pulse | blur 5px + brightness ×2.2, sin envelope | Cutting the pulse makes the slam look like a pure edit; blur >8px blurs the liquid letters into mush so "it's the wordmark burning" is lost |
| Flat entrance | 0.48–0.74, scale 0.96→1 | The 0.06 white-screen silence between slam and entrance is the breathing slot; too short and viewers have no time to "clear the screen" |
| Liquid flow speed | backgroundPosition t*100% | Extending dur slows the flow automatically; the seated segment needs ≥1s for the flowing feel to be readable |
| Wordmark size | Liquid 62px / flat 58px | The flat version one size smaller is the "settled and closed" hint; equal sizes read as re-skin, not re-identity |
| Gradient constants | `GRAD_A/B/C` (defined at block top) | Swapping in the project's three brand colors completes the integration; the liquid layer's six colors are usually kept (it's the "show", not the brand) |

## Known Pitfalls
- The white layer is "slam in then stay", not a flash-back-to-black — the second half's ground color is white; if the next shot is dark, connect another transition, or reuse this card's ending white-ground direct cut
- The `WORDMARK` constant is a placeholder wordmark (5 letters); longer words need the font size and letter-spacing scaled down together, and both layers (liquid/flat) must be updated
- The white slam paired with SFX is mandatory (impact/whoosh-bright class); an unsounded white flash reads as a dropped frame of footage
- The mix-blend-mode:screen soft-light layer being invisible on the white ground is expected; don't adjust it after the slam

## Reference Implementation
demos/transition/white-flash-logo-simplify-cut/
(WhiteFlashLogoSimplifyCut.tsx)
