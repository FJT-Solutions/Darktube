---
name: letterspace-materialize
summary: A wide-letter-spaced wordmark crystallizes as every character draws its stroke in continuous parallel — all letters start on the same frame, strokes grow like handwriting, and all finish into the word on the same frame; a brand wordmark develops on an atmospheric backdrop
use: Film-end / film-open brand wordmark entrances (SUPERHUMAN-style wide-spaced all-caps); chapter titles; closing frames that need a serene/high-end feel
duration: Settle ~15f + draw ~50f + final settle ≥30f; 3–4s total
energy: Low (a serene ritual, done in one breath)
tags: typography, outro
---

## Intent
The wordmark neither fades in nor types in — it "crystallizes": all letters' strokes begin growing continuously at the same time, as if an invisible hand were writing every letter at once, all finishing into the word at the same instant. Two linchpins: **continuity** (strokes must be a continuously drawn process — no masked segmentation; drawing one half then the other gets seen through; every intermediate frame should look "half-written"); **synchrony** (all letters start and complete on the same frame — per-letter staggering is typewriter semantics; here it's the ritual of the whole word coming together as one).

## Core Motion
- Each character uses a skeleton-stroke SVG path (single-line glyph), pathLength normalized + strokeDashoffset drawn continuously from 1→0
- All characters share the same progress p: same-frame start, and pathLength normalization guarantees letters with different stroke lengths finish on the same frame (no per-char delay/jitter)
- Glyph proportions: square-ish, slightly wide (em-box aspect ratio ≈1.07; rendered precedent: tall glyphs were rejected as "too tall"); thin strokes + wide letter-spacing (letterSpacing ≈0.6em)
- Draw curve: overall ease-in-out, slightly faster mid-stroke, gentler at both ends (the feel of starting and finishing a stroke)
- Backdrop: atmospheric gradient / live-action plate (twilight mountain-scene type); the wordmark is the frame's only motion

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Draw duration | ~50f (f16 start, f68 finish @30fps) | Under 30f the "drawing" process doesn't register; over 80f drags |
| Synchrony | All characters start and finish on the same frame, zero stagger | Precedent: the per-letter staggered version was rejected with "all letters should finish writing at the same time" |
| Continuity | pathLength grows continuously, no segmented jumps | Precedent: the masked-segmentation version was rejected with "should be drawn as continuous strokes" |
| Glyph | Skeleton single-line, em-box aspect ratio ~1.07, thin strokes | Tall (ratio <0.8) was rejected; thick strokes lose the crystallization feel |
| Letter-spacing | ~0.6em | Wide letter-spacing is this card's identity; <0.3em, switch to a plain draw card |
| Final settle | ≥30f | After crystallization, the viewer must get one read of the whole word |

## Known Pitfalls
- The demo was tuned against grayscale/placeholder assets — parameters are a tuning starting point, not a production lock; first real use must be re-validated on real assets
- Division with draw-svg-trace: that one is general-purpose drawing (icons/illustrations/single elements); this card's linchpin is the **all-characters-synchronized** whole-word crystallization ritual, and it's limited to brand wordmark contexts
- Division with type-assembly-moves: that one assembles character blocks (translating to join); here strokes grow from nothing and the characters never move
- Skeleton glyphs need hand-drawn paths (stock font outlines are double-line strokes with a different drawn look); ~9 glyphs ≈1h of work — in production, reuse the demo's glyph library first
- The source (superhuman-promo) backdrop is live-action twilight mountain scenery + water reflection; the demo approximates it with a gradient — in production, use a live/AI-generated plate

## Reference Implementation
demos/opening/letterspace-materialize/
(LetterspaceMaterialize.tsx)
Source film: superhuman-promo.mp4 ≈4.5–6.5s
