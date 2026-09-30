---
name: type-entrance-moves
summary: Title entrance, two variants — scramble-decode (the answer grows out of noise) and letter-drop-physics (characters fall with gravity, bounce, settle), pick one by tone
use: Big title/chapter card entrances; mutually exclusive with split-flap-title (mechanical flip) and document-typewriter-reveal (typewriter) within the same family
duration: single variant 4–5s (including hold and still ending; action segments A ~66f / B ~106f)
energy: Medium-high (A leans rational progression, B leans physical playfulness)
---

## Intent
The entrance library already has the typewriter (steady document feel) and the split
flap (mechanical ritual). These two variants fill two more personalities: A is terminal
hacker energy — characters first read as a patch of high-speed noise, then lock in as
"decoded" one by one left-to-right, the viewer watching the answer grow out of the
scramble, suited to a confident tech-product reveal; B is physical comedy — characters
fall from the sky, bounce off the ground, and stand crooked, then snap to attention on
the final beat, suited to a light-tone cold open. The four title entrances: ≤2 types
per film (P4).

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A scramble-decode scramble decode | all characters jump through high-speed scramble, hold, then lock into the true characters one by one left-to-right; each lock inverts colors for a 2f flash, bottom progress bar advancing in sync | Tech/developer products; the rational "answer surfacing" progression |
| B letter-drop-physics character drop | characters drop from the top staggered, gravity acceleration + two decaying bounces + landing crooked, then all snap straight on the final beat | Light-tone openers; "alive object" title ice-breaking |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A scramble period | 0–20f, all characters jump a random character every 2f (charset A–F/0–9/#$%&), color G.mid | Must be monospace + fixed 1ch slot width; proportional fonts jitter the whole line with every jump |
| A decode beat | character i locks into its true character at frame 20+i×6, turning dark; first 2f after lock invert colors (dark background, white character) | 6f/character is the "individually discernible" floor; ceiling 10f, slower reads as stuck |
| A pseudo-random | `CHARSET[floor(h(i*101+floor(f/2)*7+13)*len)]`, h = sin hash | Math.random strictly forbidden — jumps must be frame-deterministic or rendering is unreproducible |
| B drop | character i launches at frame 10+i×5; y = −DROP + DROP·(t/24)² (gravity) → 4u(1−u) parabolic bounce 30% → second bounce 9% | Bounce decay 30%/9% is the "springy but not clownish" sweet spot; a third bounce reads as jelly |
| B crooked | on landing, rotate to seed hash ±6° and hold | The tilt is half of the "physics" feel; landing perfectly straight reads as a plain translation entrance |
| B attention snap | after all settle (e.g. frame 110), 6f ease-out collective rotate→0 + scale 1.06→1 | The collective snap is the period mark — staggered snapping dissolves the "attention" ritual |
| Ending | both variants' motion done, true stillness ≥20f | R1: all properties locked during stillness (including B's tilt zeroed) |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- A is a sound-critical candidate: a "tick" sound pinned per-character lock
  (sound-design §4.5) doubles the decryption feel; B's landing thuds likewise — both
  variants still work silent but lose half their punch
- A's charset shouldn't mix in glyphs too similar to the true characters (e.g. O/0
  jumping around) — viewers misjudge them as already locked
- B characters don't do real collisions (demo uses independent per-character
  trajectories) — spacing the characters is enough; real "knock each other crooked"
  needs pre-baked trajectories, high cost low return
- The title-entrance family now has four variants (this card's two + split-flap-title +
  document-typewriter-reveal), ≤2 types per film, and all carry high attention — don't
  race other high-energy entrances on the same frame

## Reference Implementation
demos/typography/type-entrance-moves/
(LetterDropPhysics.tsx / ScrambleDecode.tsx)
