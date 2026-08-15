---
name: trailer-grammar-moves
summary: Three trailer-grammar variants — trailer-bumper pre-roll quick-cut hook, card-footage-cadence title cards interleaved in dialogue with footage, smash-cut hard cut into stillness
use: The trailer's three structural moments: how the opening hooks (A), how the middle converses (B), how the climax closes (C); using all three together is a trailer's skeleton
duration: A ~4.7s / B ~5s / C ~4.5s
energy: A High / B Medium / C High
tags: opening, transition
---

## Intent
The library's rhythm cards each govern a section: beat-cut governs cut-point layout, montage-rhythm governs section breathing, rhythm-interrupt governs interruptions. This card governs **the trailer's structural moments** — not how a single shot moves, but how the film's three joints connect: A is the opening hook — in the 0.9 seconds before the main film, three of the most eye-catching shots quick-cut + a blackout silent beat before the opening, the trailer's "trailer"; B is the middle dialogue — UI shots and black-background phrase cards alternately hard-cut catching each other's beats, both picture and text on beat points, three-act structure; C is the climax period — full-screen momentum roaring to the biggest climax, then a single frame hard-cuts to a neatly still full shot dead silence, chaos → dead silence. Using all three together is a trailer's skeleton.

## Three-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A trailer-bumper | Three shots, 9f each equal-length hard cuts (0/9/18), each shot with an internal scale 1→1.04 micro-push to stay alive; 27–33f pure black silence, from 33f the title fades in over 16f + 44px out-cubic micro-rise | The hook before the main film starts; cold open |
| B card-footage-cadence | Seven segments conditionally mounted (cut points 14/22/34/42/52/62): UI segments carry micro-motion (slow push / cropped horizontal pan), title-card segments black background white text 1.05→1 settling micro-shrink | Middle section where picture and text converse; a three-beat selling-point run |
| C smash-cut | Roaring segment all Easing.in(quad): background pushes in 1→1.55 + rotate 1.8°, 5 flying cards stagger-accelerating toward camera + velocity-gated blur; at 42f a single-frame hard cut to a fully static wide shot with no animated properties | The closing period of the film's biggest climax |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A quick cuts | Three equal-length 9f shots, zero transitions; shot 3 uses origin 58%/40% zoom 2.2x in-your-face close-up | Beat feel comes from equal lengths; the three shots' compositions must be clearly different |
| A micro-push | Each shot's internal scale 1→1.04 linear | Three static frames in a row reads as a slide deck — the linchpin |
| A blackout | 27–33f pure black #000 empty div, 6f | Anything in the blackout destroys the "silent beat" |
| B alternation | UI segments ~12f ↔ title cards ~8f hard cuts, conditional-mount segments = naturally zero transitions | Segment lengths are adjustable but must read as "catching the beat" |
| B title card | Black background white text centered, settling 1.05→1 out-cubic within 5f, everything else fully static | The title card's stillness ↔ the UI segment's motion; the texture contrast is the rhythm |
| C cut point | 42f single frame completes all the contrast; momentum still accelerating 3f before the cut | Never decelerate into the cut point — the linchpin |
| C blur | Flying-card blur = 1+4p (p∝instantaneous velocity), background constant 1.5px as foreground contrast | Velocity-gated: blur only when fast, not blur all the way |
| Closing | A static 91f / B 45f / C 93f (≥40f) | C's dead-silence segment directly returns with no animated subtree, frame-function-level true stillness |

## Known Pitfalls
- demo tuned on grayscale/placeholder footage — parameters are a tuning starting point, not a production-final spec; first real usage must re-validate with real footage
- A's blackout must be pure black with nothing in it (same family as the drop-blackout precedent) — the blackout is a breath, not another title card
- B's division of labor with cel-flash-stomp / beat-cut title-card segments: those are text performing (the text is the protagonist itself), this is text and picture conversing (mutually catching beats) — don't mix them
- C's dead-silence segment must be absolutely truly still and the music stops abruptly on the same frame — heavily sound-dependent, a silent smash cut is only half there (sound-design §4.5); A's triple cut hits a beat per cut, the blackout cuts all audio
- C's difference from drop-blackout-slam: that's blackout buildup then burst (still → burst), this is instantaneous stillness right after the burst (burst → still) — opposite directions, don't hook them up at the wrong spot

## Reference Implementation
demos/rhythm/trailer-grammar-moves/
(CardFootageCadence.tsx / SmashCut.tsx / TrailerBumper.tsx)
