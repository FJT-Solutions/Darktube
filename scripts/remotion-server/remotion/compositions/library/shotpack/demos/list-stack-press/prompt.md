---
name: list-stack-press
summary: List cards fly up one by one from the bottom of the frame stacking into a pile; each landing presses the whole pile down and bounces it back, while the counter ticks up one in sync
use: feed / radar / inbox-style "something new every day" shots; asset lists emphasizing continuous accumulation
duration: ~3s (18–88f)
energy: Medium
---

## Intent
"Stacking has weight": every new card that lands presses the settled pile down and bounces it back — the viewer reads "this is stuff genuinely accumulated" from the physical feedback. The counter ticking in sync nails down the quantity feel.

## Core Motion
- **Anticipation (borrowed from Disney's principle 2)**: before the first card rises, one paragraph-level anticipation beat — the counter lights up/zeroes 4–6f before the first card with a slight scale(0.96)→1, drawing the eye to the stacking area before the first card enters. Only once at the paragraph level, not per card
- Cards rise from below the frame, alternately tilting slightly and leveling out, stacking up on an even beat
- Each arrival presses the whole pile down 6px with an 8f bounce-back (the stackPress pulse — principle 5's follow-through: the new card's momentum transfers to the whole pile and dissipates through cushioning; this one stroke is where "has weight" comes from)
- After landing, layers settle per drag hierarchy (principle 5): card body stops first → whole pile bounces back → highlight bar grows in (lagging 2–4f) — all three on the same frame reads as a texture swap
- A single glaze sweep passes over the whole pile at the end
- A screen-space DigitRoll counter rolls one digit per landed card; the camera follows the stack downward

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Beat | CUES=[18,30,42,54,66] (even 12f), each card flies 22f, bezier(0.45,0.05,0.25,1.12) overshooting at the tail | a small count (5 cards) can stay even; batch entrances need accelerating intervals (see deck-deal's R2) |
| Entrance | rises from 600px below, alternate ±2° tilt leveling out, scale 1.06→1 | alternating tilt breaks symmetry; same-direction tilt reads as copy-paste |
| Stack press | when the next card arrives, the whole pile presses down 6px, bounces back in 8f (pulse [cue,cue+4,cue+8]→[0,6,0]) | this is the key stroke for "has weight"; removing it reduces stacking to simple layout |
| Shadow | air `0 32px 64px`, settled `0 2px 8px` | shadows converge with height — the same language as deck-deal/spotlight |
| Linked highlight | after landing, lagging 2–4f, a 40%-wide accent base bar grows at 72% height (template uses amber) (7f growth + 5f fade); the last card is only ~12f from the cut point and needs compressed rhythm | highlight is a secondary action (principles 5/8): follow the primary move (landing press-bounce), don't fight it on the same frame; trailing elements' rhythm must be compressed against the remaining frame budget, not copied from earlier ones |
| Glaze sweep | 420px wide, rotate 14°, mixBlendMode overlay, frames 82→96 sweeping from −700 to 2600 | the sweep happens exactly once per shot and sweeps the whole pile, not card by card (Q4) |
| Counter (digit-roll technique) | DigitRoll keyed on landedCount to force a reroll, one digit per landed card; each digit delay=i·4, 22f to settle, bezier(0.25,0.8,0.25,1); roll amount=(10+target)·lineH — rolling through a full 0-9 band before landing | counter and landing out of sync instantly breaks the illusion — keyed reroll is the simplest; "rolling through one band" guarantees roll feel for any target; digit band double-stitched + overflow hidden + tabular-nums (without tabular, horizontal jitter); the roll must settle before its owning screen fades out (this timing was specifically fixed before) |
| Camera | zoom 1.35→0.9, five keys following the stack downward | head-on position (see Known Pitfalls); the camera only follows vertically |

## Sound
Each landing doesn't get a per-card long sound; the counter settling pins click-camera (template pins at f648), the paragraph cut-in pins transition-soft (f623). If per-card pops are used, refer to S2's three tactics against the machine-gun effect.

## Known Pitfalls
- Stacking/list information shots must be head-on (Q6) — when the whole piece was tilted, this shot was individually rolled back to head-on; stylized camera positions must be validated shot by shot, not applied globally
- Per-card glint sweeps were rejected twice (Q4); use a static accent base bar for highlights, and let the press-bounce carry the dynamism
- Same motion vocabulary as history-list-stack (the tail segment of document-typewriter-reveal) — one piece treats the same technique as protagonist only once (P4); when used in both places, one must demote to a supporting role
- Anticipation/drag-hierarchy parameters borrow from Disney's 12 principles (condensed version built into the pixel2motion skill), not user judgments — a default recommendation, not a mandate; when it conflicts with a judgment, the judgment wins
- Anticipation magnitude must cross the eye's threshold (deck-deal judgment 2026-07-09: small magnitudes were totally imperceptible to users; only 12× magnification passed) — after rendering, self-check "can you see the build-up without scrubbing frames"

## Reference Implementation
template/src/aifl/live/ScenePapers.tsx
