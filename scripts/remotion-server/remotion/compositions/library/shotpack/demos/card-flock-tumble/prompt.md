---
name: card-flock-tumble
summary: Three UI page cards tumble through 3D from their thin side edges and land as a stepped stack (fully crisp throughout, smoothly continuous splines), keep slowly rotating after landing, snap-suck toward the center, burst into a single turbulent smoke ring that expands outward, and a giant wordmark sweeps across to close
use: High-energy climax sections (the exploding transition from a group of feature pages to a brand slogan); neon dark-field mood; sections that collapse "multi-page capability" into a single phrase
duration: Tumble ~1.5s + slow-rotate showcase ~0.3s + suction 0.3s + smoke ring + giant wordmark ~2s; whole section 4.5s
energy: Extremely High (use at the film's energy peak)
---

## Intent
Three page cards fly through 3D space like thrown playing cards, form a line, and after landing are instantly sucked into the center, bursting into a ring of smoke through which the brand wordmark punches out — "capability showcase → energy collapse → slogan detonation" in one breath. Three linchpins: **smoothness** (side-edge → tumble → landing on one Catmull-Rom spline with continuous derivatives; the hitches of piecewise interpolation get read out), **never stop** (after landing, keep slowly rotating at low angular velocity until the suction; the static segment was cut with "don't stop, keep it rotating" — no still frames in a climax), **crisp throughout** (motion blur/DoF blur all removed, cut with "don't add blur effects").

## Core Motion
- Tumble: each of the three cards goes k0 (near-90° thin side edge)→k1 (mid-tumble)→k2 (stepped landing) on a Catmull-Rom spline, driven by Easing.out(cubic), ~44f
- Landing slow rotation: idle drift ry +0.34°/f, rx −0.1°/f, rz +0.05°/f (14f squared ease-in to avoid a hitch where the spline joins), rotating without stopping until the suction moment
- Suction: 10f Easing.in(quad) accelerates from the slow-rotate pose straight into shrinking toward the center; opacity held full for the first 60% (the "suck-in" motion must stay clearly readable)
- Smoke ring: **a single ring** (multiple rings were cut), feTurbulence with three displacement sets (wispy edges/bright specks/dark specks) + peach-top purple-bottom gradient — ragged turbulent edges, light/dark patches, decelerating outward growth that slowly enlarges, extremely slow decay and lingering, no specular light at the center; zero particle residue (cut)
- Giant wordmark: sweeps across the full screen with a fade-in + slight scale-up, neon gradient stroke

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Three-card spacing/size | Heavily overlapping into a stacked ladder, scale 1.6–1.74 | Two rounds of amplification rulings: "come closer together, make them bigger" — the ladder must read as one group, not three cards |
| Landing slow rotation | ry ~0.34°/f continuous | **No stillness allowed** (ruling); >1°/f reads as not yet landed |
| Suction duration | 10f ease-in | The 22f version was cut with "make it fast"; opacity dropping too early = unreadable suction (rework ruling) |
| Smoke ring | Single ring, turbulent ragged edges, extremely slow decay | Multiple rings cut; smooth neon ring/particle versions cut — match the dense frames of the original for the turbulent texture |
| Blur | Zero blur throughout | Adding blur to tumble/suction was cut in both cases |
| Spline | One Catmull-Rom running through | Piecewise lerp has velocity steps; "silky smooth" is the verdict's own wording |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- Smoke-ring texture ruling: clean graphic rings (stroked circles/concentric waves) were cut in three rounds; the final feTurbulence turbulent ragged edge was calibrated frame-by-frame against the original's dense frames — "it has to match"; the residual gap is that the noise field is static (overall rotation + growth), with no per-frame turbulence rolling, so the flow feel is weak at very close range
- Division of labor with particle-celebrate-hits: that one is particle confetti at hit points; this card's smoke ring is the aftermath of energy collapse, particles forbidden
- Division of labor with bubble-swarm-takeover: that one is a swarm flooding in to take over; this card is three cards precisely lined up then collapsing — the meaning of quantity is the opposite

## Reference Implementation
demos/transition/card-flock-tumble/
(CardFlockTumble.tsx)
Original footage: clickup-30.mp4
