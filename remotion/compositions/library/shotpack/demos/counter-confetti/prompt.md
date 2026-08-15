---
name: counter-confetti
summary: A big number sprints up the count with easeOutQuart plus a scale overshoot; one beat before landing, 52 confetti pieces blast in on parabolas from both sides; an impact ring expands and the label's letter-spacing tightens to close
use: Celebration beats for milestone/achievement numbers: user counts, revenue, downloads — revealing metrics that "deserve popping champagne"
duration: ~4.6s (138f @ 30fps; counting 0.3–2.6s · confetti from 2.4s · settled 3.3s)
energy: High (the count-up builds tension + the burst releases it; the standard emotional-peak shot)
---

## Intent
Numbers aren't "displayed", they cross the finish line: the count curve goes fast-then-slow like a 100-meter sprint entering slow motion, and the confetti bursts a beat **before** the number lands — the celebration arrives half a beat ahead of the result, emotion outruns information, and the viewer gets excited first, then reads the number.

## Core Motion
- The count runs on easeOutQuart (t=0.06–0.56): the first third of the time covers two-thirds of the value, matching the "sprint–decelerate–cross the line" feel; `toLocaleString` thousands grouping
- The number's scale runs in two phases: 0.2→1.3 burst in (outCubic), then 1.3→1 settle back once the count lands (outBack, a light bounce) — entering one size larger, settling into place straight
- **Stealing the beat**: confetti BURST=0.52, earlier than the count landing at 0.56 — the celebration leads the result by 0.04 (~5 frames); this half-beat is the soul of the card
- 52 confetti pieces with real physics: they start ±250px off both sides of the frame, initial velocity vx 150–450 driving inward / vy −230~−450 launched upward, gravity g 900–1420 pulls them back, self-rotation ±750°, each piece staggered ≤0.06
- Landing impact ring: from 0.545, scale 0.35→2.95 expanding and fading out (outQuart); the label fades in at 0.62 with letter-spacing tightening 11px→5px — a "stamping it down" feel

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Count curve | easeOutQuart, 0.06–0.56 | Switching to outCubic weakens the sprint feel; a linear count is the most common "no emotion" approach |
| Beat-steal amount | BURST leads by 0.04 | Leading 0–0.02 reads as the same beat; >0.08 and the confetti looks like "someone else's celebration" |
| Confetti count | 52 pieces (8-color palette) | <30 is too sparse to read as rain; >80 covers the number. PAL is "performance confetti" and generally doesn't recolor to brand |
| Gravity/initial-velocity ratio | g≈2.5×|vy| | Puts the parabola apex at the upper third of the frame; g too small and the confetti drifts past the top edge |
| scale overshoot | 1.3 peak + outBack settle | The number is the hero; overshoot >1.5 collides with the label layout |
| Final value | p*1000 (demo value) | With real numbers: keep "rolling from 0 to the final value"; jumping from a start point loses the sprint feel |

## Known Pitfalls
- Confetti physics use `life = u*1.1` normalized seconds — changing dur alters the perceived gravity (the same u maps to a different real duration), so g/vy must be retuned
- The 0.04 beat-steal is a constant hardcoded in both BURST and the count endpoint; when changing the counting window, shift BURST along with it to keep the lead
- Confetti opacity fades from 0.74 down to 0.05 in the tail — don't let confetti still be flying at t=1; the settle segment (label letter-spacing tightening) needs a clean background
- Add SFX: ticks densifying through the count + pop/confetti on the BURST beat + impact on the landing beat — missing any of the three layers collapses the emotion (see the counter class in sound-design.md)

## Reference Implementation
demos/data/counter-confetti/
(CounterConfetti.tsx)
