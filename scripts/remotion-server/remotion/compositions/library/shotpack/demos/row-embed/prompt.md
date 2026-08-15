---
name: row-embed
summary: Content rows descend from the air like cards, level out via rotateX, and the instant they embed, a thin accent-colored seam lights along their bottom edge
use: detail-page/list shots where "structured data grows into the page"; batch entrance of row-level content
duration: ~2s (12–68f)
energy: Medium
---

## Intent
Detail-page rows don't "appear" — they "grow in": each row descends from the air and embeds flush into the page layout, and the accent seam at the embed moment is the visual foley of a "click" snapping closed.

## Core Motion
- Rows fly in from above one by one on a beat, leveling out via rotateX from a tilt, with scale overshooting slightly then press-bouncing back
- Row positions are pre-covered with page-background patch placeholders; after landing the patch disappears, letting the texture show through
- At the embed instant, a 2px accent seam on the row's bottom edge expands from the center to both sides, then fades out
- The camera pans down at constant speed in parallel, the row rain and camera move running together

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Beat | ith row cue = 12 + i·9, 12f flight, last row lands at 60f, accent seam finishes 68f ≤ the 70f shot budget | compute "when does the last row land" first, then set the cue spacing — beat × row count must fit the budget (the core arithmetic of document-typewriter-reveal) |
| Flight pose | `perspective(900px) translateY(−120·air) rotateX(16°·air)`, scale 1.06→0.995 then 4f press-bounce back to 1 | the rotateX level-out is the key "embedding" read; a pure vertical drop reads as a sticker |
| Flight body | backgroundImage from a full-page screenshot, negative backgroundPosition offset cutting out the row | texture cut-outs don't re-render content (Q1) — re-rendered rows show visible differences in font rendering vs. the page |
| Empty-slot patch | row positions pre-covered with page-background patch, disappears 2f after landing | without the patch, the baked-in row from the texture shows through first, and the fly-in becomes a "ghost" |
| Embed flash | 2px accent seam on the bottom edge expanding from center to both sides in 5f (Easing.out cubic), fading 8f, with a 6px glow | the seam is only on the bottom edge and flashes once; flashing all four edges reads as a selection frame |
| Camera | cy 300→760 uniform 75f pan down | the camera move and row rain run in parallel, producing "watch it grow as you look"; if the camera waits for the rows to finish, the shot drags |

## Sound
Paragraph cut-in pins transition-soft (template pins at f475); row landings don't get per-row voicing — with many rows and even spacing, per-row pops go machine-gun; the visual accent seam carries the "visual foley" instead (S2 reverse self-check).

## Known Pitfalls
- The fly-in endpoint must be a real layout slot in the page, embedding on landing (Q9) — needs to "fly in from the air, embed into the dashboard"; hovering above without landing looks fake
- Effects like the accent seam must be clipped inside the carrying element's rounded-corner boundary (Q4 judgment) — light spilling past rounded corners is a classic source of cheapness

## Reference Implementation
template/src/aifl/live/SceneDetail.tsx
