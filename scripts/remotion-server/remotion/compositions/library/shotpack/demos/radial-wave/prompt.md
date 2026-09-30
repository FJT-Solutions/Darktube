---
name: radial-wave
summary: A 17×9 dot grid lights up staggered by Euclidean distance from the wave source; each dot overshoots scale to 1.5 then settles to a constant on state; after the first wave sweeps, a second bright-blue pulse gathers back inward from the outer ring to the center
use: "system power-on" beat for product/brand openings; also the establishment shot for data grids, node maps, and coverage-range narratives
duration: ~3.8s (114f@30fps)
energy: Medium-high (one burst at the start; after the wavefront passes it settles into a constant low-energy base)
---

## Intent
Rewrite the static fact "many dots exist at once" into the dynamic fact "energy spreads from one source to all". The viewer sees not a dot-matrix image but a power-up: the center lights first, brightness pushes outward like a ripple, and after it finishes the whole grid stays on — laying the base for what the next beat will show. The second reverse wave is a receipt, telling the viewer this system responds.

## Core Motion
- Grid 17×9 = 153 dots, positioned in percentages (`left:(c+0.5)/COLS`) so changing rows/columns needs no coordinate recompute; each dot pre-stores normalized distance `dist = hypot(c-cx, r-cy) / maxD` (maxD = hypot(8,4))
- First wave: `seg(t, dist*0.35, dist*0.35+0.18, E.outCubic)` — the start is linearly delayed by distance (outer ring delayed 0.35), each dot's own travel stays constant at 0.18; the wavefront is "staggered starts", not variable speed
- Each dot's scale isn't a simple 0→1 but `w1*(1+0.5*sin(w1*π))`: bulging to ~1.5 mid-travel then returning to 1 — the sine envelope puts the overshoot at the middle of the travel rather than at the landing
- Second wave: `seg(t, 0.62+(1-dist)*0.25, +0.15)` inverts the offset (outer ring moves first), using `sin(w2*π)` as a pure pulse stacked into a 0.8 scale increment and a 0.25 opacity increment, leaving no state behind
- At the pulse peak (`pulse2 > 0.3`) it hard-cuts to `#b9f2ff` with a `0 0 12px #7fd8ff` glow — only the second wave glows; the first wave stays constant `#6c8cff`, so the two waves can't visually blur into one event

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Grid size | COLS=17 / ROWS=9 (153 dots) | dot count decides the wavefront's "resolution"; <8 columns and the distance bands are too coarse — the wave reads as three or four concentric rings jumping |
| Wave-speed coefficient | `dist*0.35` | this 0.35 is the inverse wave speed: larger = slower wave, longer tail; >0.5 and the outer ring waits past halfway through the piece to light |
| Per-dot travel | 0.18 (~21f) | decides wavefront thickness; <0.1 the front is razor-sharp like a scan line, >0.3 nearly the whole field lights at once and the spreading feel disappears |
| Overshoot magnitude | `1+0.5*sin(w1*π)` → peak 1.5 | the 0.5 coefficient is "one bounce"; dropping the sine term is a flat 0→1 fade, >0.8 and dots bite each other's edges |
| Second wave | start `0.62+(1-dist)*0.25`, window 0.15, amplitude 0.8 | 0.62 is the breathing room between waves; pulling earlier than 0.5 stacks it onto the first wave's tail, reading as a chaotic flash |
| Constant-on base | `opacity = 0.25 + w1*0.5 + pulse2*0.25` | 0.25 is the presence of unlit dots; set to 0 and everything beyond the wavefront is black — the grid's "scale" stops being conveyed |
| Highlight threshold | `pulse2 > 0.3` color switch + glow | lower threshold = longer glowing segment; this is a hard cut, not a gradient — a threshold near 0 shows an obvious on/off jump |

## Known Pitfalls
- The wave source is hard-coded to the geometric center (`cx=(COLS-1)/2, cy=(ROWS-1)/2`). Starting from a corner or a "node" requires changing cx/cy AND maxD, or the normalized distance exceeds 1 and the outer ring's start pushes past t=1, never lighting
- The final frame isn't fully still: the center dot's (dist=0) second-wave window is 0.87→1.02, reaching only 87% at t=1 with `pulse2≈0.41` still highlighting. To loop or end cleanly, compress the second wave's start under 0.85
- The dot's `width:10px` and `margin:-5px` are a bound pair (centered via negative margin); changing dot diameter requires syncing margin or the whole grid skews right-down by half a dot diameter
- Colors come in only two tiers (constant `#6c8cff` / peak `#b9f2ff`) — rebranding changes these two plus the glow color, three spots total; the background `#0a0b10` is the premise of the glow — this brightness-pulse system is nearly invisible on white

## Reference Implementation
demos/ui-entrance/radial-wave/
(RadialWave.tsx)
