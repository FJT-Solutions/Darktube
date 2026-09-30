---
name: paper-title-card
summary: A one-sentence line presses word by word onto the paper, one word marked with accent italic, a short dash closes in
use: Chapter transitions/value-proposition cards; lead-in cards before important features appear; breathing-room spots in the film
duration: 1.7–1.8s (50–55f)
energy: Low (breathing spot, separates two high-energy shots)
tags: transition, rhythm
---

## Intent
Between two sections of product footage, give the viewer one sentence of breathing
room: state "what's next and what it's worth." The letterpress texture puts the card
into the same world as paper-and-ink product imagery.

## Core Motion
- Single-sentence copy enters word by word: scale pressing down from large to 1 +
  blur→0 + opacity (letterpress recipe)
- Exactly one emphasized word per sentence: italic + accent color (amber in the template film)
- Accent short underline scaleX 0→1 closes in
- Tail fades the whole card out to hand off; may carry a mono small secondary line +
  DigitRoll numbers

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Word-by-word entrance | word i delay = 4 + i·4, 9f, bezier(0.2,0.75,0.3,1); scale 1.28→1 + blur 7px→0 + opacity | Scale start 1.28 is the "press stamp" reading sweet spot — compare with the dark-field TitleCard's 40px rise + blur 10; same recipe, light and dark versions |
| Emphasis word | italic + accent oklch(52% 0.115 65), exactly one accent per sentence | Two accents equals no accent; pick feature names/benefit words (C2) |
| Underline | 16→34f scaleX 0→1, 220×6px accent | The underline is the closing signal — its appearance announces the card is almost done |
| Duration | all 4 cards in the film 50–55f (≈1.8s) | Card duration is formulaic — the time to read one sentence; longer drags the rhythm, shorter can't be read |
| Layout | font 116/serif; paper background oklch(97.5% 0.008 82) + center warm radial; 8f fade-out at tail | Paper + warm light sharing the product imagery's palette keeps the card from feeling like a commercial break |
| Secondary line | mono small text + DigitRoll (e.g. "5 of 31 fetched today"); digit-roll params per the counter line in the list-stack-press card | Concrete numbers in the secondary line are the most convincing; the digit roll must settle before this card's fade-out (lesson) — schedule beats backward from the fade-out frame |

## Sound
Card entrances uniformly pin swoosh-quick (the template film pins all four cards at
f220/565/725/885 with the same sound) — same element same sound is glossary discipline
(S2); the card itself has no landing thump, energy is left to the surrounding shots.

## Known Pitfalls
- Copy must be concrete: include feature names + specific benefits; abstract metaphor
  words were edited out word-by-word by the user (C2 — "one board"→"one place to go",
  added "Paper Radar"); rewrite copy to the final shot after the frame is locked (C1)
- Important features need a lead-in card before they appear (C2 case: before a document
  shot, add a guide like "Every project, linked to your weekly report") — the card is
  not decoration, it's a chapter signpost

## Reference Implementation
template/src/aifl/PaperTitleCard.tsx
