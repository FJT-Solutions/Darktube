---
name: chart-live-moves
summary: Three live-chart variants — oscilloscope-stream (the waveform writes in live at the right edge + a sudden spike), unit-dot-swarm-regroup (dots migrate in three acts to form digits), axis-rescale-shock (a new value bursts out of the frame, forcing the y-axis to rescale)
use: Data-narrative segments; respectively telling "real-time", "every number is a person", and "growth that can't be contained"
duration: 4–6s each
energy: Medium-high (data is the story)
---

## Intent
Charts aren't illustrations, they're drama. All three variants share a premise (validated in testing): **a real chart context is required** — real axis labels, real data, real copy; grayscale placeholder bars can't measure the expressive power of a data narrative. A oscilloscope-stream: the waveform's writing point pins to the right edge, bobbing up and down while old data flows out to the left; midway, one sudden spike (amplitude 2.2×, the reading jumps up with a highlight color) — "real-time" isn't said aloud, and there's an event too. B unit-dot-swarm-regroup: 320 dots (each ≈40 customers) scatter → gather into three clusters (floating real Free/Pro/Enterprise labels) → line up into bars (real axis labels) → coalesce into a dot-matrix big number "12,847" — the same batch of dots, and the viewer can follow one of them as it rejoins its place. C axis-rescale-shock: the line climbs normally, a new value bursts through the chart's top edge and out of the card by 220px (a thick highlight line jabs into the title area), pauses half a beat, then the y-axis "whooshes" into a rescale (old ticks fly out / new ticks slide in / grid densifies / the old line squashes into a horizon), and the new value settles back with its true-value label popping in — performing growth as "the axis can't contain it".

## Three-Variant Selection
| Variant | Core Move | Use Case |
|----|----------|------|
| A oscilloscope-stream | Sample window translates 8px/f + cosine-envelope spike + hard stop into true stillness | Monitoring/real-time products: a system that's "alive" |
| B unit-dot-swarm-regroup | Three-act spring migration with staggered offsets (stiffness 150, 8f stagger); the finale assembles the dot-matrix digits | User-count/composition narratives: "every dot is a person" |
| C axis-rescale-shock | Bursts 220px past the frame + three-way rescale (ticks swap / grid densifies / old line squashes) + 8px shock | Growth-curve highlight: "off the charts" made literal |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Real context | Real title / real axis labels / real units / real readings | **Library prerequisite**: all three grayscale versions got cut; with real context they all pass |
| Hero color | Accent color (amber in the template) marks events/heroes (spike reading, Pro cluster, overflow segment) | All-gray and you can't tell "where the focus is" |
| A flow speed | 8px/f | 5.5 is already perceptible, 8 is clearer; the waveform is a pure function, no randomness allowed |
| B dot count/diameter | 320 / 9px | Too few dots and you can't spell digits; too small and individuals vanish |
| C overflow distance | 220px past the card top | The 80px version isn't "explosive" enough; it has to actually jab into the title area to feel like an event |
| Ending | All three need ≥36f of true stillness | A drifting tail on a data chart reads as "it's not done yet" |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- The three variants are three independent techniques, not a combo pack — if a film uses two or more, each appears ≤1 time and in separate segments
- A's spike event and C's rescale can only happen once; repeating them reads as cheap
- B's finale digit bitmaps must be pre-computed by hand (the dot count has to exactly fill the on-pixel count to look clean)
- Division of labor with dataviz-landscape-open (abstract data-landscape opener): that one is opening atmosphere; these three are concrete in-segment data arguments
- Sound: one warning tick on A's spike; one whoosh per act of B's migration; on C one riser for the burst and one "whoosh" for the rescale

## Reference Implementation
demos/data/chart-live-moves/
(AxisRescaleShockV2.tsx / OscilloscopeStreamV2.tsx / UnitDotSwarmRegroupV2.tsx)
