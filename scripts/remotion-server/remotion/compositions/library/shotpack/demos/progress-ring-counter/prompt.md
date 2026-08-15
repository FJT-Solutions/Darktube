---
name: progress-ring-counter
summary: A circular progress ring grows from 0 to full (arc + ring-head dot advancing), the center percentage counter rolls in sync 0→100%, and when done a checkmark springs out with a subtle ring pulse, while stat cards at the bottom stagger in
use: App promo showing progress data for health/goals/balance/learning; emphasizes the "progress ring + counter + completion" feedback loop
duration: ~5.6s (168f @ 30fps, including ≥30f of stillness after settling)
energy: Medium-low (the arc's steady growth is a low-energy peak; the completion checkmark gives one small pulse)
tags: data
---

## Intent
Shoot "goal completion" as a readable progress loop: the ring grows from 0, the ring-head dot advances along the arc, the center percentage rolls in sync, and at 100% a checkmark pops out with a slight pulse — the completion moment has a clear landing point. The core is "three lines in sync": the arc length, the percentage, and the ring-head position must all derive from the same progress value; if any one detaches, the viewer feels the data and the graphic don't match.

## Core Motion
- Phone f4 fade in + translateY 60→0 (16f ease-out); title reveals with ease-out at f16
- Ring progress (f26–116, ease-out): SVG strokeDashoffset grows from circumference→0, ring-head dot advances along angle = prog·2π−π/2; center percentage Math.round(prog·100) rolls in sync
- Stat cards stagger in from f40, 6f per card (opacity + translateY 12→0)
- Complete (f118): center digit switches to a checkmark (green disc + check path), springs out (damping 12 / stiffness 180); ring pulses scale 1→1.05→1 (sin decay)
- After settling, a 1.6s (48f) whole-device micro-breathing holds until f168

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Ring growth | f26–116, dashoffset circumference→0 (ease-out) | Ease-out makes it fast at first and slow at the end — the most comfortable read |
| Ring-head dot | angle = prog·2π−π/2, r=7 | Must advance on the same frame as the arc length; it can't lag |
| Percentage | Math.round(prog·100) | The counter derives from the same prog as the arc; never animate it independently |
| Completion checkmark | From f118 spring (damping 12 / stiffness 180) | The checkmark needs an "arrival" pulse before going still; no hard cut |
| Stat cards | From f40, 6f per card (12f ease-out) | Cards settle mid-ring-growth, so they don't compete with the completion for focus |
| Breathing | After settling, every 48f scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |

## Known Pitfalls
- The arc length, percentage, and ring-head must all derive from the same prog value; independent calculations visibly detach
- The checkmark must spring in (with overshoot) paired with a ring pulse; directly swapping the digit looks "stiff"
- Before completion the center is a counter, after completion a checkmark; the switch must land on the same frame as 100%
- Screen content must be self-drawn vector mockups (SVG ring), no screenshot textures; data uses fictional demo values

## Reference Implementation
demos/mobile/progress-ring-counter/
(ProgressRingCounter.tsx)
