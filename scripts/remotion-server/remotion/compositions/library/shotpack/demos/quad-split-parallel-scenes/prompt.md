---
name: quad-split-parallel-scenes
summary: The picture hard-cuts into a 2×2 quad split; four quadrants each run their own micro-scene in parallel (typing, whip push-in, word-by-word, interaction chain), key beats staggered 3–6 frames apart to create an information barrage
use: The montage beat of a rhythm section where "many features, happening simultaneously"; the density peak mid-trailer
duration: ~2.1s (63f@30fps, no transitions the whole way)
energy: High (four parallel tracks + staggered-beat impact, the standard BGM chorus slot)
---

## Intent
Use parallel density instead of sequential presentation: four things happening on screen at once, viewers can't read each in detail, but every 3–6 frames a quadrant "moves" — the scanning rhythm gets pinned down. This is a technique card: all in-cell content is replaceable, the staggered-beat choreography is the recipe.

## Core Motion
- Four independent quadrant scenes (content as examples): TL mini browser typing character by character + 6 tabs popping in sequentially with outBack + inQuad slow push 1→1.45 the whole way; TR mono typing + t=0.42–0.54 whip push-in scale 1→2.1 (with sin envelope blur 4px); BL three words popping in word-by-word at 0.24/0.46/0.56 with outBack; BR five-step interaction chain (pill slides in → cursor bezier tour → click zoom → text rewrite → card pops out)
- **The staggered beats are the soul**: TL tabs from 0.08, one every 0.13; TR whip 0.42; BL three words 0.24/0.46/0.56; BR clicks 0.42/0.74 — any adjacent event interval 3–6 frames, something is always moving but never in sync
- The two typewriter cursor blink frequencies are staggered (16-frame cycle vs 14-frame cycle +5 phase) to avoid simultaneous blinks
- BR cursor tours two quadratic beziers (`qBez`), `sin(π)` scale 0.7 bounce-back at the click moment
- Four quadrants' background colors alternate light/dark (#c3c6cc/#f2f1ef/#e7e6e3/#b8bcc3) to keep grid lines readable without borders

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Stagger interval | Adjacent events 3–6 frames | <2 frames reads as the same beat (in-sync movement = stiff); >8 frames the density scatters and the barrage feel disappears |
| TL slow push | inQuad 1→1.45, origin 50% 78% | The "baseline noise motion" of gradual acceleration all the way, keeping even the static panel non-static; >1.6 crops the tab row |
| TR whip push-in | 0.42–0.54, scale 2.1 + blur peak 4px | This is the card's heaviest beat, landing on the BGM accent; the blur envelope must be sin (symmetric in/out) |
| Typing speed | TXT1 25 chars / 0.02–0.95 | When swapping copy keep the character count similar, otherwise the typing rhythm's stagger relationship with other quadrants drifts |
| BR interaction chain | slide in 0.12 → tour 0.3 → click 0.42 → typing 0.46 → second tour 0.62 → click 0.74 → card 0.8 | Five steps interlock; changing any step requires shifting the rest; the card's outBack pop is the chain-end accent |
| Background colors | Four alternating neutral gray tones | When swapping in a project theme color, keep adjacent cells' brightness difference ≥15%, otherwise the grid-line feel disappears |

## Known Pitfalls
- This is a technique card: the four quadrants' content is entirely swappable (product screenshots/recordings/other motion cards), but **the stagger table must be rearranged** — new content's keyframes inherit the original timeline, otherwise the four quadrants become a collage of four independent videos
- 2.1s is the density ceiling for duration; stretched past 3s+, each quadrant needs a second round of events, otherwise the back half has "nothing moving"
- The cursor blink uses `floor(t*63)` frame calculation; after changing dur, re-check the two cursors' phase offsets
- All four quadrants typing simultaneously / popping in simultaneously is the most common degenerate implementation — check: step through frame by frame, no frame should have two quadrants "heavy events" at the same time

## Reference Implementation
demos/rhythm/quad-split-parallel-scenes/
(QuadSplitParallelScenes.tsx)
