---
name: collab-cursor-moves
summary: Collab cursors as actors in two variants — dialogue-duet, a two-cursor dialogue duet on a dark stage (approach/orbit/light handoff/magnified into a transition), and cast-ensemble, a five-cursor ensemble atmosphere layer (staggered fly-in + sine drift + typing cameo + converging onlookers)
use: Narrative passages on collaboration/multiplayer/handoff themes; A-variant carries a pure UI-less narrative beat, B-variant lays a "team presence" warmth over canvas scenes
duration: A ~4.7s (140f) / B ~4.7s (140f)
energy: A Medium (high narrative density) / B Low-medium (atmosphere layer, can pad any duration)
---

## Intent
Cursors in this library have so far been "operating tools" (input-trigger-moves' cursor-performance
is a single-cursor click performance). This card promotes name-badged collab cursors into **actors**:
A-variant's two named cursors choreograph a "design-development handoff" story on a bare dark stage through displacement alone — with
no UI elements at all, the viewer still reads the plot, and the cursors' spatial relationships are the dialogue; B-variant's five cursors fly
in staggered and then drift continuously as ambient particles, carrying the entire "team presence" feel, and one of them can even stop to
type (a cameo bit). SVG cursors + name badge chips cost almost nothing and deliver extreme narrative density —
the cheapest visual argument for a "collaboration" theme.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A dialogue-duet | Blue/green two named cursors: bezier entry → approach and converse (pulse breathing) → swap sides on upper/lower arcs → name badges one-bright-one-dim light handoff → green cursor easeIn magnified tens of times into a giant arrow as transition cover | Two-role handoff narratives (design→dev, you→AI); needs a UI-less pure narrative breathing beat |
| B cast-ensemble | 5 named colored cursors spring in staggered onto a grayscale canvas → two-frequency sine drift on station → one types out a line on a sticky note → everyone converges as onlookers with easeInOut at the end | Full-film atmosphere layer for canvas/whiteboard-type products; needs "others are here too" background aliveness beyond the main content |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A displacement | All cubic beziers: entry easeOut 24f / approach easeInOut 30f / orbit easeInOut 38f / whip-out easeIn 24f, no linear | Straight lines + linear instantly read as "the program moving an icon"; curves + easing read as "a person moving" |
| A orbit | Both take semicircular arcs (upper 180°→360° vs lower 0°→180°) swapping left/right in sync, R≈270px | Same-arc same-direction reads as collision; split upper/lower arcs are the body language of "yielding" |
| A light handoff | Badge opacity 0.28+0.72·lit, saturate 0.35+0.65·lit, lit>0.6 adds glow; handoff completes mid-orbit at 70–84f easeInOut | One bright and one dim reads as "turning over the speaking turn"; both bright fails to show who leads |
| A transition magnify | 100–134f easeIn, scale 2.8→68 rushing toward an off-frame corner, badge fading in sync | easeIn acceleration is the key to the whip-out; the giant arrow is a foreground cover, wiring into transition-hidden-cut grammar |
| B entry | 5 cursors staggered delay 0/5/9/13/17f, spring(damping 15); badges fade in 12f later + float up 10px | Badges appearing on the same frame as cursors read as stickers; fading in with the deceleration reads as "the person arrives and announces themselves" |
| B drift | Two-frequency sine stack (0.055/0.021 rad/f, per-cursor phase offset), amplitude ±46/30px | Single-frequency sine reads as a pendulum; two out-of-phase frequencies read as "a human hand's randomness" |
| B typing cameo | 60f linear character release after landing + 8f-period cursor bar blink | Decorative typing can be at 1f/character level; body-text interactive typing goes back to typewriter-moves pacing |
| B convergence | 26f easeInOut starting at 92f to onlooker positions, drift amplitude decaying to 25% retained | Post-convergence drift must not hit zero — a fully static cursor group reads as a freeze |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec,
  so first real use must re-verify with real assets
- Badge color = identity encoding, must stay consistent across the whole film (blue = Designer stays blue); changing colors mid-film makes the viewer think it's a different person
- A-variant is a one-shot "scene" per film, ≤1 time (P4); B-variant is a full-film atmosphere layer; both can coexist in one film but A's two leads must come from B's ensemble (same name, same color), or it reads as two separate groups
- B-variant drifting cursors must never cover the main content being read — the atmosphere layer yields; drift range must avoid the subject's safe zone
- Division of labor with input-trigger-moves: that card's cursor "operates UI" (clicks carry payload), this card's cursors "perform for you" (displacement is the plot); when a cursor needs to click something, go back to that card
- Sound: A-variant orbit pairs a light whoosh, the handoff a soft chime, the magnified whip-out a heavy whoosh; B-variant entry gets one very light pop per cursor, the drift segment stays quiet, the typing segment gets light keyboard sounds

## Reference Implementation
demos/interaction/collab-cursor-moves/
(CursorCastEnsemble.tsx / CursorDialogueDuet.tsx)
Source film: A figma-devmode 0:16–0:20 / B figma-devmode 0:05 + miro-promo throughout + pitch-app 82–90s typing cameo
