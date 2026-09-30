---
name: timeline-travel
summary: Horizontal timeline travel — the camera accelerates along the horizontal tick axis past version ticks; as it passes each tick a card springs upright in a brief pause, and the final tick ends in a hard stop that pushes in close
use: Changelog / milestone / history segments (another way to shoot "we keep shipping"); division of labor with scroll-brake-moves: that card hard-brakes a vertical list, this one is horizontal time travel
duration: 4–5s
energy: Medium-high (an acceleration → hard-stop rhythm shot)
tags: camera
---

## Intent
Shooting the product's version history as a journey along the timeline (the Counter-Strike: Kingdom opening precedent): the camera moves horizontally in three speed phases — easy start → sprint → hard brake — as the v1.0/v2.0/v3.0 ticks sweep past one by one; with each tick passed, its card springs upright off the tick line — history flashes by outside the window, and the hard stop lands on "today" with a push-in. The speed itself says "development is fast"; the hard stop says "now matters most".

## Action Phases
| Phase | Frame Reference | Content |
|------|------|------|
| 1 Stillness | f0–12 | Empty axis + the first tick holds |
| 2 Accelerating sweep | ~f12–100 | World layer translateX eases in segments: easy start → sprint → final 12% hard brake |
| 3 Card pop | During the sweep | Cards start popping 6f before the camera passes their tick (spring damping ~11, clearly overshooting), standing up on scaleY with the bottom edge as the axis |
| 4 Hard stop + push-in | 10f from the hard-stop frame | scale 1→1.28 pushes in on the final tick (out cubic), then stillness ≥30f |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Velocity curve | Input breakpoints [0,0.15,0.88,1]→output [0,0.055,0.9,1] | If the middle isn't fast enough there's no "travel" feel; uniform speed throughout is a cheap PPT |
| Pop timing | Pops start 6f before the camera reaches the tick, back-derived from camXAt | Popping on arrival means the viewer already missed it; too early reads as a preview |
| Tick density | 3–5 major ticks + several minor tick dots | The minor ticks are the reference markers for the sense of speed; delete them and the speed stops being felt |
| Hard-stop push-in | 1→1.28 / 10f | Without the push-in the hard stop is just "stopped"; the push-in is what makes it "arrived" |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- If the mid-sprint is fast enough to blur the cards, layer CameraMotionBlur (wrap only the fast segment, round #8 precedent)
- Budget the post-stop stillness upfront: the demo's first version had only 25f of stillness, not enough; only moving the hard-stop frame earlier fixed it — when laying out the timeline, reserve ≥30f for the ending first, then back-derive the travel
- Each popping card is an information slot: in production use a real version-highlight screenshot or one-liner; the sweep speed must guarantee at least the last two cards are readable (same origin as Q6)
- Sound: a light hit per card pop, one impact on the hard stop (same origin as S2)

## Reference Implementation
demos/data/timeline-travel/
(TimelineTravel.tsx)
