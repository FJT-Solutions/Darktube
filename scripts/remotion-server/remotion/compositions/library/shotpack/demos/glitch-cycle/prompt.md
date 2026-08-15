---
name: glitch-cycle
summary: A single monospace slot row cycles 4 status phrases; each phrase's head and tail go full-glitch via the probabilistic keyframes [1,0,0,0.1,0,0,1], the middle occasionally twitches a single character, and on every switch the whole line layers RGB split with a horizontal jitter; the last phrase's probability drops to 0 so the ending is clean
use: Status announcements for loading/building/deploying; the "system self-description" in tech openers; an underlay that advances time in a machine voice
duration: ~5.6s (168f@30fps, 4 phrases at 42f each)
energy: Medium-high (continuous high-frequency noise pulses, switching points are peaks)
---

## Intent
The laziest way to report status is four lines fading in one by one. The cycle crushes
them into **a single slot**: phrase heads and tails use glitch to "melt down" then
"solidify," the middle is nearly clean with only occasional twitches — the viewer reads
"the system is advancing step by step," not four independent captions. Glitch density
is this card's syntax: dense = switching right now, sparse = currently inside a state.
A bottom progress bar strings the four beats into one timeline, and the last phrase
drops its probability to 0, so settling equals ending.

## Core Motion
- Slot pre-built with `MAXCH` spans sized to the longest phrase (`min-width:0.66em`
  fixed slot width), shorter phrases pad the right with spaces — **characters are never
  added or removed, only content changes**, the whole line never reflows
- Time evenly divided: `slot = floor(t·4)`, intra-phrase progress `p = t·4 - slot`
  (42f per phrase)
- Glitch probability keyframes `KF=[1,0,0,0.1,0,0,1]` linearly interpolated by p:
  **head at 1.0 fully scrambled, middle at 0, ~p=0.5 bounces back to 0.1 (occasional
  twitch), tail returns to 1.0 melting into the next phrase**
- Last phrase gets `KF_LAST=[1,0,0,0.1,0,0,0]`, probability zeroed at the end → t=1 is clean
- Per-character decision: `rand(i·31 + bucket·17 + slot·97) < g` decides replacement
  with a pool character; hit characters randomly turn #6c8cff blue or #4a5270 dark gray;
  `bucket = floor(frame/2)`, i.e. re-rolled every 2 frames
- Line jitter and RGB split strength all multiply g: `jx = ±g·10`px, `jy = ±g·4`px,
  `text-shadow` left-red right-cyan each offset `g·3`px (enabled only when g>0.04) —
  **one noise variable drives character swap, translation, and color spread simultaneously,
  so the three never fight**; the 120×2px bottom progress bar `width = t·100%` advances
  linearly, underpinning the four beats without relation to them

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phrase list | 4 phrases, longest 17 characters (`COMPILING SHADERS`) | 42f per phrase is the floor for "can read one state"; 5+ phrases drops each below 34f and viewers only see flashes |
| Probability keyframes | `[1,0,0,0.1,0,0,1]` (6 segments) | The middle 0.1 is the "alive" evidence; deleting it makes phrase middles rigid; raising the 0 segments to 0.3+ turns the whole film into a glitch |
| Re-roll frequency | every 2 frames (`floor(frame/2)`) | Re-rolling every frame blurs into a gray band; 4+ frames and the scramble reads as "another word," not noise |
| Jitter amplitude | `x ±g·10` / `y ±g·4`px | x greater than y is the key to horizontal tearing (equal jitter reads as an earthquake); >20px the whole line jumps out of its slot |
| RGB split | left-red right-cyan each `g·3`px, threshold g>0.04 | This is the "electronic fault" ID; without the threshold, the mid-curve 0.1 probability keeps the text permanently fringed |
| Slot font | SF Mono 26px, `letter-spacing:3px`, slot `0.66em` | Monospace + fixed slot width is mandatory; 3px letter-spacing gives the scramble breathing room, squished together reads as a glitch block |
| Progress bar | 120×2px, `#6c8cff` fill, linear | The only linear element, giving the four beats of noise a stable reference; without it the cycle doesn't read as "advancing" |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **When swapping in project copy, keep the four phrases close in character count
  (demo 12–17 characters)**: slot count is built once from the longest phrase, shorter
  phrases pad right with spaces — if one phrase is 4 characters and another 30, the short
  one sits lonely left-aligned in 30 slots, line width is propped up by the longest phrase
  throughout, and the rhythm reads as drifting
- Probability keyframes map 6 equal segments onto intra-phrase progress: changing phrase
  count changes each phrase's length, but the keyframe shape stays — so more phrases make
  the two "full-glitch" segments absolutely shorter and the switching feel weaker; past
  5 phrases, widen the head/tail 1.0 segments
- Last phrase must use `KF_LAST` (ending at 0): the normal KF would leave t=1 on full
  scramble, reading as unrendered when the next shot takes over
- Deep-background only: #0a0b10 background + cold blue noise is the palette's foundation;
  RGB split is nearly invisible on light backgrounds; sound is also critical — the four
  switching points are naturally four rhythm points, production must add electronic
  fault/switch sounds; layering discipline per sound-design.md (same element same sound,
  alternating dual samples on rapid repeats to avoid machine-gun feel)
- Division of labor with scramble: that card is **one-shot decryption** (scramble→fixed,
  never scrambles again); this card is **cyclic reporting** (scramble→fixed→scramble→fixed);
  keep only one per film — placing both reads as using the same move twice

## Reference Implementation
demos/typography/glitch-cycle/
(GlitchCycle.tsx)
