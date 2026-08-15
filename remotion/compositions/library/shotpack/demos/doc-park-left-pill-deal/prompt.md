---
name: doc-park-left-pill-deal
summary: The document doesn't fade out but slides out to the left leaving only ~35% width, slightly shrinking to 0.92; on the right, three white outlined pills deal in slowly to the narration rhythm (outBack pop-in); after each lands, its subtitle darkens word by word, then the whole sentence fades out before the next arrives; the document auto-scrolls very slowly the whole time, keeping "being read" alive
use: narration-driven "analysis conclusions delivered one at a time" paragraphs; core explainer shot for document understanding, recommendation reasons, review feedback products
duration: ~5.8s (174f@30fps)
energy: Low (slow dealing rhythm, no peaks; kept alive by the auto-scroll)
---

## Intent
Conclusions must arrive one at a time or the viewer won't remember them. But if you fade out the source document, the conclusions become castles in the air — the viewer doesn't know where these words came from. This card's answer is **keeping the source in the picture**: the document parks on the left showing just a sliver, still slowly scrolling (proving it's being read), and every conclusion on the right grows out of that document. The dealing rhythm is deliberately slow to leave room for the narration to finish a sentence.

## Core Motion
- Parking is not fading: `seg(t, 0.06, 0.24, E.inOutCubic)` drives `translateX(0→-55%) scale(1→0.92)`, with `transform-origin: 0% 50%` anchoring the scale to the left edge so the shrinking document doesn't leave the frame's left side — ending with only ~35% width visible
- Constant auto-scroll: `doc.inner.style.transform = translateY(-(t*3 % 1) * 40)`, content is 60px taller than the container, walking 3 integer cycles of 40px each over the piece. The modulo guarantees t=1 returns to 0 — the final frame is stable
- Slow dealing: three pills' starts are hard-coded at `T0 = [0.26, 0.48, 0.70]` — spacing 0.22 (~38f / 1.27s), which is one short narration sentence in length, not a normal UI stagger
- Each pill runs two curves in parallel: `o = seg(t, f, f+0.035, E.outQuad)` handles opacity (fast, ~6f), `b = seg(t, f, f+0.062, E.outBack)` handles `translateY(14→0) scale(0.94→1)` (slow, ~11f, with overshoot) — see first, settle second, which feels more "caught" than a single curve
- Subtitles orchestrated in four segments: start `cs = f+0.05` (~3 frames after the pill settles), `show` appears fast over a 0.02 window, `inn` darkens word by word spread over `(ce-cs)*0.7`, `ce` is the next pill's start minus 0.03 (last pill ce=0.98), `out` fades over `ce-0.05→ce` — every sentence clears before the next pill enters, so the screen always holds exactly one sentence
- The pills' final state is a static list (`top = 54 + k*48`); once all three settle they stay on screen, reading as "the conclusion list has taken shape"

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Deal start | `T0 = [0.26, 0.48, 0.70]`, spacing 0.22 (≈38f) | The spacing IS the narration sentence length; compressed below 0.12, the word-by-word darkening can't finish and subtitles read as blinking out |
| Park window | 0.06→0.24 (inOutCubic) | Must settle before the first pill (0.26); overlapping shows the "document still sliding while pills are already dealing" muddle |
| Park magnitude | `translateX -55%` + `scale 0.92`, ~35% visible | Too little visible (<25%) turns the document into decoration, losing the "source" meaning; too much and the right side can't fit the 172px-wide pills |
| Pill opacity window | 0.035 (~6f, outQuad) | Intentionally shorter than the position window — solid first, then steady; equal windows read as a plain fade-in |
| Pill position window | 0.062 (~11f, outBack), y 14→0, scale 0.94→1 | outBack's overshoot is the "dealt onto the table" feel; outCubic becomes a flat float-up |
| Subtitle delay | `cs = f + 0.05` (~9f) | Subtitle starts only after the pill settles (0.062); starting earlier shows the subtitle before the conclusion |
| Subtitle darkening travel | `(ce-cs)*0.7` | 70% of the sentence's visible time, with the last 30% as fully-solid reading time; set to 1.0 and the sentence gets faded out right as it finishes reading |
| Auto-scroll | `t*3 % 1` × 40px (3 integer cycles) | 3 cycles over 5.8s is ~0.7px/f — the "being read" hint-level speed; >3px/f steals attention and becomes a scrolling showcase |

## Known Pitfalls
- The auto-scroll cycle count must be an integer or the final frame parks mid-cycle and won't align with the next shot; when changing duration, re-pick the 3 (the content overflow is fixed at 60px and the displacement hard-coded at 40px — neither can be exceeded)
- The last subtitle's `ce = 0.98` means it fades out over 0.93→0.98, leaving the final frame with only three pills and no subtitle. To hold the last sentence to the end, set the last pill's `ce` >1 and drop `out`
- Pill positions are hard-coded as `left:214px, top:54+k*48`, 172px wide — a matched set for the 480-wide canvas with the parked document (~87px visible). Changing the park magnitude requires syncing the PX values or they'll overlap
- The three pill labels (Quick Start / Bundle Plan / Starter Kit) and three subtitles are placeholders, and subtitle length directly affects how fast "word-by-word darkening" reads — with real copy, retune the `inn` travel to the new sentence lengths
- Pill count is hard-coded at 3 (the length of `T0`). Adding a 4th runs out of time: the last start would exceed 0.9 and the subtitle can't finish; beyond 4, consider shortening sentences instead of cramming
- A subtitle's `ce` depends on `T0[k+1]`; changing any pill's start cascades into the previous subtitle's visible time — this coupling is intentional (subtitles always fill up to just before the next one), but be aware it's not an independent parameter when tuning

## Reference Implementation
demos/ui-entrance/doc-park-left-pill-deal/
(DocParkLeftPillDeal.tsx)
