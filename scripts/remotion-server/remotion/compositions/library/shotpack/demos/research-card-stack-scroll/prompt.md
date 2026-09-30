---
name: research-card-stack-scroll
summary: Dark paper cards fly in along a bottom-right axis into the center, one every 12 frames, stacking with a 1-frame squash on landing; only the top card renders fully clear (title + authors + abstract), cards below increasingly blur and darken with stack depth, showing only their title bar; the horizontal grid background scrolls down in sync as a speed reference
use: "read a huge amount of material / processed a flood of documents" volume conveyance; capability shot for research, retrieval, batch-processing products
duration: ~4.8s (144f@30fps)
energy: Medium-high (uniform high frequency — no explosion but constant pressure)
---

## Intent
The message is "quantity", but handing 13 cards at once reads as a wall. Make it a pipeline instead: cards come in one at a time, each one gets "read" (the top card is always the fully-rendered one), and once read, it sinks into the pile and blurs. The viewer feels continuous throughput rather than a static heap. The background grid moving down at the same speed is the velocity reference — without it, the piling reads as "cards shrinking in place".

## Core Motion
- The timeline uses real frame numbers rather than normalized t: internal `F=144`, each card's local time `e = t*144 - i*12`, and all orchestration (entrance, stacking, depth) is hard-coded around a `PER=12`-frame beat unit
- Entrance is a brisk 6-frame action: `seg(clamp((e+6)/6), 0, 1, E.outCubic)` — note the start is `e=-6`, i.e. the card starts flying 6 frames before its own beat arrives, with `translateY(-40→0)` + `scale(0.94→1)`
- Landing squash: while `e ∈ [0, 1.6)`, the y-axis scale additionally multiplies 0.97, pressing for only 1.6 frames — too short to read as deformation, just "slammed solid"
- Stacking drift: after landing, `drift = e/12*30`, 30px down per beat plus `XOFF=9`px right, forming a slight bottom-right axis; the axis makes the 13 cards a pile with thickness rather than concentric stacking
- Depth decay: `depth = min(1, drift/(30*3))` — decaying to full within three beats, `blur(depth*4)` + `brightness(1-depth*0.25)`; below that, `(drift-30*3.2)/(30*1.6)` pulls opacity to 0 for recycling
- Focus is unique: `focus = floor(f/12)`, only the card with `i === focus` shows its body (author line + 4 abstract skeletons), all other cards' bodies are `opacity:0` leaving only the title — "the one being read" is always exactly one
- Background grid: `translateY((f/12*30*S) % 24)` — the displacement derives from the same `GAP=30` as the cards' drift, so the grid and the pile move at exactly the same speed; the 24px modulo makes it seamlessly loop

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Beat | PER=12 frames/card, 13 cards | 12f is the lower bound of "tight but readable"; <8f the title can't be read, >20f the quantity feel collapses into per-card showcase |
| Entrance travel | 6 frames (outCubic), lead of -6 frames | travel is only half a beat → every card has already landed before the next arrives; travel ≥ PER has two cards in flight at once |
| Entrance displacement/scale | `translateY(-40→0)`, `scale 0.94→1` | 40px against a 96px card height is small — cards "drop in" not "fly in"; the scale difference is only 0.06 — any larger reads as a popup |
| Landing squash | 1.6 frames, y-axis ×0.97 | 3% is the just-perceivable amount; >6% or >3f shows rubber deformation |
| Stacking axis | y+30px, x+9px per beat | the 9/30 ratio decides the axis slope; x to zero becomes concentric stacking straight below, losing the thickness feel |
| Depth decay | `depth = drift/90`, blur 0→4px, brightness 1→0.75 | decays within 90px (3 beats) → only ~3 cards are ever "half-clear" on screen; stretching the decay distance makes the blurred pile below too thick and the frame dirty |
| Recycle window | fade starting after `drift > 96px`, to 0 within 48px | recycling too early shows cards vanishing at frame center; too late and all 13 are present, raising both DOM and blur cost |
| Content coordinate space | logical 420×250, overall `scale(min(W/420, H/250))` | all pixel values live in the logical space; changing canvas size needs no re-layout; card 296×96 and 9.5px font are all logical values |

## Known Pitfalls
- Card count and beat are bound: `13 cards × 12 frames = 156 frames > F=144` — the last two are still entering at t=1, so the final frame isn't a clean still. For a freeze ending, cap the count under `F/PER - 1` (≤11 cards at a 12-frame beat)
- `focus = floor(f/12)` can exceed the card-count ceiling (at f=144 focus=12, exactly the last card) — after adding cards or changing the beat, confirm focus won't long point at a nonexistent index, or you get "no card is ever clear"
- All timing constants are hard-coded on the 144-frame assumption (`F=144`, `fr=f/F`). Changing duration requires changing F too, or the beat stretches with the duration and the 12-frame tightness is lost
- Titles are 13 realistic-looking paper-title placeholders, `preprint:24xx` numbering generated from the index — swap in real project document titles for production; the abstract skeleton widths from `rand(i*5+k)` are deterministic pseudo-random, don't replace with Math.random
- Dark cards (`INK` base + `#2A2A2A` stroke) on `#FAFAFA` light base is the premise of this contrast set; after lightening the card colors, the `brightness(0.75)` depth decay is nearly invisible — switch to opacity or grayscale decay

## Reference Implementation
demos/ui-entrance/research-card-stack-scroll/
(ResearchCardStackScroll.tsx)
