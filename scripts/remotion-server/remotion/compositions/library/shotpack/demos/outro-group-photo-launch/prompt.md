---
name: outro-group-photo-launch
summary: Representative elements of the whole film fly in from all directions to form a group photo around the wordmark; crane camera settle + stage light + golden dust make a launch-show close
use: Outro / brand closing; a "family photo" final shot for a multi-feature product
duration: ~4.8s (145f)
energy: Peak (the film's highest point)
---

## Intent
Take one representative element from every feature the viewer has seen and call them back for a group photo, with the wordmark arriving as the finale — the last thing the viewer remembers before leaving is "these things belong to one product". The spec must be launch-show grade: energy pushed to the film's highest point.

## Core Motion
- 9 page elements (nav/card/content bar/search box/stats bar/doc header) fly in from all directions with rotation, glowing in the accent color (amber in the template film) on landing
- Wordmark enters letterpress letter by letter while everyone "falls to the back row" for the protagonist; the rule grows out, extension lines shoot out
- Crane camera move: the group-photo layer rotates rotateX 4°→0 + scale settling down, then a slow push
- Launch-show atmosphere trio: an opening light band sweeping across, stage light behind the wordmark, golden dust drifting up
- The background page blurs into depth of field

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Element fly-in | 9 elements cued starting at 4, one every 3f, each flying 12f; start offsets ±360–500px; render order = cue order, later arrivals stack on top | Every feature already shown needs a representative element (Q8 self-check item); the viewer notices any missing one |
| Fly-in easing | bezier(0.34,1.4,0.44,1) | A lesson named in a code comment: the old bezier(0.25,0.9,0.3,1) "never crossed 1" — no true overshoot; to bounce on landing, y1 must be >1 |
| Flight pose | rot×2 during flight → settled rot (within ±5°), scale ×1.12→1; ghost trails lagging 8% with blur 8px; accent-color glow 6f on landing (0.35→0) multiply | Settle angles into ±5° — the group photo should be tidy but not stiff |
| Fall to the back row | During the wordmark's entrance, frames 42–50: everyone opacity −12%, saturate −8% | When the protagonist enters, the supporting cast must yield; without it the wordmark can't hold against 9 elements |
| Crane camera | `perspective(1400px) rotateX(4°→0) scale(1.06→1)` over the first 40f settling, then slow push +0.035 | Even this small a crane amplitude (4°) is enough to read as "settling the camera"; more would be dizzying (speculation) |
| Atmosphere trio | Light band 2–14f (600px-wide overlay, peak opacity 0.12); stage light 42→50→58f at 0→0.5→0.25; 20 golden dust specks 2–3px, opacity 0.15–0.35, all parameters deterministically derived from index | Particle/light parameters must be deterministically derived (hard rule: renders must be reproducible); past 30 golden specks it starts looking like snow (speculation) |
| Wordmark | Letters delay=42+i·1.8, 8f; rule grows 58→70f, 190px extension lines on both ends shoot out over 8f, fading 6f; letter-spacing breathes 62–66f; background page blurs 0→14 over 24f; sign-off hold 30f after settling | Wordmark settle holds a full 1s (R1 decided); the outro keeps no explanatory captions to stay clean (C1 exception item) |

## Sound
A fixed three-beat pattern: riser-cine beds into the assembly (pinned at f945 in the template film) → impact-deep-whoosh stamps the wordmark (f980, vol 0.55, the film's peak) → sparkle dots the rule (f1005). This is the only segment pattern never changed since the template film was finalized (S2; see sound-design 4.3).

## Known Pitfalls
- First-version endings are almost always too conservative (Q8: quiet signature → group photo → launch-show, three escalating tiers) — draft with the "like a product launch" spec from the start, giving crane/stage light/particles in full
- Structure before effects: build the "fly-in group photo" structure first, then add atmosphere; stacking effects directly has no skeleton
- Check the outro tagline against the copy under the wordmark for duplication (P4 dedupe precedent); the same sentence appears only once in a film

## Reference Implementation
template/src/aifl/live/SceneOutroLive.tsx (30f sign-off hold duration: see template/src/aifl/Main.tsx timeline)
