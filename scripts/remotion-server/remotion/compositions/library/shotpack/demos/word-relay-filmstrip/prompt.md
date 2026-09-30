---
name: word-relay-filmstrip
summary: A left column of equal-height black-and-white alternating page cards steps forward in scroll, while the right side has a serif large word relaying in place (noun constant + verb rotating) — the column scrolls exactly one step at the instant the word swaps, and the word block's vertical center precisely aligns with the current page card's midpoint
use: "One subject × multiple capabilities" enumeration segments (Computer researches/builds/codes…); portfolio/case-flow showcases; multi-scenario product tours
duration: ~1.5–2s per word period × 3–4 words; whole segment 5–7s
energy: Medium-low (editorial temperament; rhythm comes from the "click" of word swaps)
tags: ui-entrance
---

## Intent
The left is evidence (page-screenshot filmstrip), the right is the thesis (large word):
each time the verb swaps, the filmstrip steps one frame forward with new evidence —
text and image annotate each other. The linchpin is **stepping**: the left column is
completely still normally, scrolling exactly one step only at the swap instant (scroll
= the mechanical act of changing evidence); continuous scrolling demotes the left
column to background decoration and strips the "click" from the swap. The second
linchpin is **alignment**: the large word block's vertical center must align precisely
with the current page card's midpoint (pixel-level); off-center and the whole layout's
"editorial rigor" collapses.

## Core Motion
- Left column: equal-height page cards arranged vertically, black-and-white (dark/light)
  forced alternating to make the scroll step visible; within the swap window, an
  ease-in-out scroll of exactly one card height; zero translation at all other times
- Right side: serif (Didot-like) two lines — the subject noun constant, the verb
  relaying in place: old word grays and fades out (exit first), new word settles in
  (enter after); exit-before-enter, no ghosting overlap
  (case law: v2's "resebuilds" ghost was caught)
- Alignment: word block total-height vertical center = current card top + card height/2
  (measured y=540@1080p, accurate to single pixels)
- Scroll and swap in sync: scroll start = old word begins graying; scroll end = new
  word landed steady

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Page cards | equal height (530px@1080p), black-white alternating, ~half screen width | Unequal heights / same color family make the stepping unreadable; cards too narrow lose the "evidence" weight |
| Word period | ~45–60f/word | <40f the word can't be read and the filmstrip can't be seen; periods need not be uniform |
| Scroll window | ~12f ease-in-out, exactly one card height | Continuous scroll = linchpin violation; over/under-scrolling reads as a mechanical fault |
| Word relay | old word 4–6f gray-fade-out → new word 6–8f settle-in | Same-frame crossover always ghosts; gap >10f reads as a dropped frame |
| Vertical alignment | word block center = current card midpoint (pixel-level) | User's single-point feedback: "the text height must align with the middle page point"; >8px off is perceptible |
| Font | serif Didot-like, verb weight equal to or lighter than the noun | Sans-serif loses the "editorial" temperament |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- Division of labor with text-column-converge: that card is a left-right standoff
  converging into a reveal; this card is a vertical evidence flow + in-place relay,
  with no convergence and no reveal
- Division of labor with pill-slot-cycle: that card cycles UI elements in a capsule
  slot; this card is a layout-level text-image alignment system
- Production assets: page cards should use real screenshots (the demo uses gray bars as
  placeholders, a known residual gap); screenshot brightness must be manually binned to
  guarantee the alternating readability

## Reference Implementation
demos/typography/word-relay-filmstrip/
(WordRelayFilmstrip.tsx)
Source film: perplexity-promo.mp4 ≈76–90s
