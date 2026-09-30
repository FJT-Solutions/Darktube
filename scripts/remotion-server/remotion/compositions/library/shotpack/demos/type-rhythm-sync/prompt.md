---
name: type-rhythm-sync
summary: Text synced to sound, two variants — font-weight-pump (strokes thicken and snap back with the drum) and karaoke-fill-sync (words light up one by one with the voiceover)
use: Segments where title/slogan is tightly bound to a track; A binds to beat (drums), B binds to voice (word-by-word narration)
duration: single variant 4–5s; A 10f decay window per hit, B 15–35f per word by speech rate
energy: A high (party-vibe) / B medium (follow-along guidance)
tags: rhythm
---

## Intent
Up to now the text-motion library only covered "how to get in," with nothing managing
"how words already on screen come alive with sound." These two variants fill it:
A turns the title into a rhythm organ — strokes twitch thicker with the bass drum and
spring back, text at a rave, suited to a visual subwoofer for high-energy segments;
B turns the slogan into follow-along subtitles — whichever word the narration reaches
fills with color left-to-right and lights up, the eye led along, suited to voiceover/
slogan-emphasis segments. The common ground: **the text doesn't move, properties move** —
no translation, no entrances/exits, purely weight/color breathing on the sound's beat points.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A font-weight-pump weight pulse | on the hit frame the stroke instantly thickens (stroke + weight jump), ~10f decaying bounce-back; accent hits additionally stretch 8% width | Music-driven high-energy segments; title as subwoofer |
| B karaoke-fill-sync fill-as-read | each word fills bright dark left-to-right, progress following speech rate, holding after completion; active word carries a read-along underline below | Voiceover/narration-emphasis segments; eye-leading through multi-word slogans |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A pulse envelope | `env=(1−t/10)^0.8` (t = frames after hit, reaches exactly 0 at ≥10f); `-webkit-text-stroke: 10px·env` + fontWeight jumping 400↔900 within the env>0.15 window | Continuous stroke decay + discrete weight jump stacked read as "continuously thickening"; fontWeight alone has only two steps, stroke alone is too subtle |
| A beat | one hit per 20f; accent hits additionally `scaleX = 1+0.08·env` (transform scaling doesn't reflow layout) | Beat spacing must exceed the decay window (20>10); overlapping hits read as convulsing |
| A beat reference | a row of small beat dots below the frame; whichever dot's beat fires flashes dark and enlarges | In a silent environment (preview/still frames) without the dots, the "following the beat" is unreadable |
| B per-word timetable | per-word [start,end] frame ranges, linear fill within a word; 4–10f pauses between words (breathing) | Timestamps in production come from the narration's timing sheet; uniform distribution reads as robotic reading |
| B fill implementation | each word double-layer same text stacked: light gray bottom + dark top with `clipPath: inset(0 X% 0 0)`, X=(1−p)·100 | Per-word independent stacking avoids measuring word width shares; a single-line clip needs an exact pixel table and drifts easily |
| B read-along underline | 8px dark underline under the active word, width = p·100% | 4px light gray is invisible in 1080p thumbnails (pitfall from this batch's real renders); finished words leave no line |
| Ending | A after the last hit's decay returns to zero / B after the last word fills, true stillness ≥20f | R1 breathing case law |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- Both variants are **sound-critical**: A's hit frames must land on the same frame as
  the drums, B's fill ranges must follow the narration's word boundaries (pin frames per
  sound-design §4.5 relative-start approach) — running without a track makes A read as
  spasming and B as random recoloring; don't use in trackless segments
- A in production, for true variable-font continuous weight (per-frame wght axis
  interpolation), must first confirm font loading and renderer support; the demo's
  stroke + jump approach is a font-risk-free fallback with already-perceptible effect
- A ≤1 segment per film (P4) — a raving title is a scene-stealer; two segments in one
  film undercut each other
- B ≤6 words per screen: beyond that, the fill progress can't be followed — split lines
  or split shots

## Reference Implementation
demos/typography/type-rhythm-sync/
(FontWeightPump.tsx / KaraokeFillSync.tsx)
