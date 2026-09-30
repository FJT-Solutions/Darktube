---
name: particle-sand-fill
summary: Particles rain into a funnel to build bars — the bar chart doesn't grow, it "gets rained into existence": square particles fall one by one and pile into bars; when full, they solidify into a solid bar and the value pops in
use: Bar-chart / magnitude-comparison entrances; data segments that tell an "accumulation/convergence" story
duration: 4–5s
energy: Medium-high (construction-feel entrance)
tags: effects
---

## Intent
Replacing the bar chart's "grow-taller animation" entrance with "falling and piling up": a rain of squares falls above each bar, particles drop one by one (gravity-accelerated), stopping at the pile surface with a 15% bounce, layering up to the target height; then the particle surface fades out into a solid bar and the value label pops in at the top. The "amount" of the data becomes a visible "accumulated one grain at a time" — division of labor with unit-dot-swarm-regroup (dot swarms migrating across a plane to form a shape): there, the same batch of dots changes formation; here, falling material constructs the graphic.

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Particle size | 14px squares | The original vocabulary's 4px was imperceptible; QA bumped it 3.5× |
| Particles per bar | ~50 | Too few and the pile looks sparse; too many and individual grains become indistinguishable |
| Falling | Gravity-accelerated, landing frames pre-resolved in closed form | Pile height = fallen count × particle size; real collision simulation is forbidden |
| Bounce | One 15% bounce on surface contact | No bounce reads like a texture being pasted; multiple bounces drag the rhythm |
| Inter-bar stagger | 6f per bar start | All falling at once reads as mechanical; staggering gives a "rain front moving across" feel |
| Convergence | Full → particle surface fades out → solid bar + label pop in with back-out | Freezing on the particle state looks dirty; it must solidify into a solid |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- All landing frames are pre-resolved in closed form (each particle's landing spot/frame computable at compile time); frame determinism is the prerequisite for correct rendering — frame-by-frame state accumulation is forbidden
- Only suits 3–5 bars for magnitude comparison; dense charts with a dozen-plus bars use a regular entrance (too many rain curtains reads as noise)
- The boundary vs. the rejected "fragment shatter" precedent: this is construction (building a graphic from nothing), not destruction (shattering an intact graphic) — the direction semantics are opposite; don't make a reverse-play variant
- Sound: fine-grained particle landing sounds as the bed; a light "tock" per bar when it fills; one tick when the label pops

## Reference Implementation
demos/data/particle-sand-fill/
(ParticleSandFill.tsx)
