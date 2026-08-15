---
name: pill-chip-slot-cycle-handled
summary: In the white-background sentence "Your `chip` Handled", the word inside the dark capsule cycles on a vertical wheel; capsule width smoothly stretches by interpolating pre-measured text widths, the words on either side are naturally pushed apart and pulled back together, and 13%-opacity gray ghost items peek above and below the capsule
use: Sentence-style value props like "we'll handle ___ for you"; one-line closers for SaaS feature lists; a hero beat in light-background brand films
duration: ~5.0s (150f@30fps: stillness → 3 switches (0.25/0.47/0.69) → tail stillness)
energy: Medium (three steady beats; the width stretch is the only continuous motion)
---

## Intent
Slot cycling has two schools: make the sentence dodge the change (a fixed-width wheel),
or make the sentence **absorb** the change (capsule widens, flanking words get pushed
apart). This card is the latter — the cost is getting the width math right, the payoff
is a sentence that reads alive: "Your" and "Handled" get shoved around, and the viewer
feels the word in the capsule has weight. The gray ghost items peeking top and bottom
are the second marker: they signal "this is a scrollable list," setting the expectation
that another word is coming.

## Core Motion
- Width pre-measurement: during setup, hidden `<span>`s measure each word's
  `offsetWidth`, each +74px padding, stored as `widths[]` (with an `o.w.length·13`
  fallback in case setup ran before mount)
- Position value `pos` accumulates over 3 segment windows: switch points
  `[0.25, 0.47, 0.69]`, each window 0.12 (≈18f), easing `E.inOutCubic` —
  **eased at both ends**, matching "wheel starting up and stopping solid"
- Inner column `colIn` translates vertically `-pos·48`px (line height 48 = capsule
  height); capsule width takes `lerp(frac, widths[ci], widths[ci+1])`,
  **interpolated per frame** so the stretch is continuous, and the `flex:none`
  flanking text is naturally pushed apart by the flex layout
- Ghost items sit outside the capsule (inside chipWrap) at -38px above / 58px below,
  taking `near = round(pos)`'s adjacent neighbors, drifting slightly with the scroll
  `(pos-near)·48·0.5` (**half-speed parallax** — half the speed of the in-capsule word,
  so they read as "the outer ring")
- Ghost opacity `0.13 · (0.4 + settle·0.6)`, `settle = 1 - min(1, |pos-near|·3)`
  — fainter mid-scroll, clearest when settled
- Each row is a two-part emoji + word structure (emoji 18px, word 700 22px white),
  capsule `#1a1c24` background + `0 8px 24px rgba(20,22,40,.22)` shadow +
  `overflow:hidden`

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Word list | 4 words + emoji (Sales/Workflow/Admin/Reports), 3 switches | Word-length variance sets the pushed-apart feel: demo shortest 5 letters, longest 8; variance >2x makes the capsule jump violently and the sentence's center of gravity swing side to side |
| Switch points | `[0.25, 0.47, 0.69]`, window 0.12 (≈18f) | ~0.10 (≈15f) stillness between segments to read the word; the stillness before the 0.25 start lets the viewer first recognize the sentence pattern |
| Easing | `E.inOutCubic` | Eased at both ends reads like a wheel starting and stopping; outCubic (ease out only) reads as flung up, and the capsule width snaps along with it |
| Capsule | height 48px, radius 99, `#1a1c24`, width = text width + 74 | +74 is left/right padding + emoji slot; <50 the word hugs the edge, >100 the capsule bloats into a button |
| Ghost items | -38 above / 58px below, base opacity 0.13 | 0.13 is the "visible but not stealing" sweet spot; >0.25 reads as three lines of parallel text, not ghosts; removing them kills the list cue |
| Ghost parallax | `(pos-near)·48·0.5` (half speed) | Half speed is the "outer ring is farther" depth source; same speed makes the three lines slide as one block and ghosts lose meaning |
| Sentence font size | flanks 30px/800, in-capsule 22px/700 | In-capsule smaller than the sentence is the correct hierarchy (badge attached to sentence); equal or larger reads as two titles fighting |
| Palette | background `#fbfbfd`, sentence `#15171d`, capsule white text | Light background + one dark block is this card's ID; on a dark background the capsule disappears — full rework needed |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting
  point, not a finalized production value; first production use must be re-validated
  against real footage
- **Width relies on setup-phase `offsetWidth` measurement**: if the font hasn't finished
  loading, you measure the fallback font's width and the capsule comes out narrow or
  wide — when porting, ensure the webfont is ready before measuring, or switch to
  offscreen-canvas `measureText`; the `length·13` fallback only guarantees no crash,
  not accuracy
- Keep word-length variance within 2x: adaptive width is this card's selling point and
  its risk — the `Sales`→`Workflow` jump is already the acceptable ceiling; larger
  variance makes the sentence's flanks swing dizzyingly
- Flank text must be `flex:none`: otherwise flex compresses them instead of moving them,
  and "pushed apart" becomes "squashed letters"
- Ghost text takes `round(pos)`'s neighbor, so exactly mid-switch (pos=x.5) the text
  **jumps once** — happening when `settle` has dimmed it to minimum, practically
  invisible; but if opacity is raised to 0.25+, the jump shows
- Emoji glyph widths vary across platforms (especially `⚙️` with variation selectors),
  drifting measured widths by a few pixels — production should use the project's own
  monochrome icons instead of relying on system emoji
- Division of labor with vertical-word-roll-blur-cycle: that card is fixed-width, bare
  words, drum-blur (words are sentence constituents); this card is adaptive-width, dark
  capsule, ghost items (word is a badge) — keep only one per film; on sound, the three
  landings are three rhythm points — pair with light switch/capsule-fit sounds,
  alternating dual samples, layering discipline per sound-design.md

## Reference Implementation
demos/typography/pill-chip-slot-cycle-handled/
(PillChipSlotCycleHandled.tsx)
