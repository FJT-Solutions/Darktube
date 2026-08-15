---
name: wipe-transitions
summary: Geometric wipe transitions, two variants — clock-wipe (a radar pointer sweeps 360° to change pages) and blinds-slice (12 vertical strips staggered-flip into a wave)
use: Generic transitions where both old and new pages stay still and a geometric boundary sweeps across to complete the handoff; usable anywhere since it doesn't depend on suitable elements in the composition
duration: Per variant, prior state ≥20f + wipe 32–60f + ending ≥40f, ~5s (150f)
energy: Medium
---

## Intent
The transition library already has three families: travel (dive in), hidden-cut (cover the cut), solid-block (the page is a physical object). This card is the fourth family, **geometric wipes** — both old and new pages stay still, one geometric boundary sweeps across to complete the handoff, and the shape being wiped is the meaning: A's circle sweep is "the dashboard refreshed a screen of data", B's strip sweep is "blinds turning leaf by leaf to change pages". The difference from shot-transitions F's element-mask wipe: F uses a real in-page element as the mask (depends on composition), this card is pure geometry — versatility is its positioning. Choose by meaning: data refresh uses A, lateral page-turn advancement uses B.

## Two-Variant Selection
| Variant | Approach | Use Case |
|----|------|------|
| A clock-wipe | Page B rides on a top-layer fan-shaped clip-path polygon; a pointer sweeps 360° clockwise at constant speed from the 12 o'clock position at the screen center, revealing B as it passes; the leading edge carries layered bright lines | Data/status-refresh semantics; dashboard-type pages |
| B blinds-slice | 12 vertical 160px strips overflow hidden + inner full-page negative-margin alignment; inside each strip A scaleX(1-p) shrinks from the left edge, B scaleX(p) expands from the right edge, stagger delays into a wave, a bright line on the seam sweeping with the wave | Page-turn/advancement semantics; horizontally-read motion-line pages |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A fan | Center at screen center (960,540), radius 1400 covering all four corners, fixed 73 vertices (SEGS=72) | Vertex count constant and dense enough (40+) to prevent anti-aliased popping — the linchpin |
| A sweep speed | 30–90f pointer 0→360° purely linear, clamped both ways | A radar must be constant-speed; adding easing turns the radar into a pendulum |
| A bright line | Four SVG lines: 26px white 0.35 soft glow + 13px white 0.60 + 9px black 0.55 dark stroke + 4px white core | White-ground ruling: pure brightening is invisible, a dark stroke is mandatory; the first render's 3px white line was too weak, and a 1.5× bump passed |
| B wave | 20–52f: delay = column×2f, each strip 10f Easing.in(cubic) | The handoff point is always x+160(1-p), mathematically no exposed gap |
| B seam bright line | Three SVG layers: 16px white 0.45 soft glow + 6px black 0.55 dark stroke + 3px white core, 2f fade in/out on each end | Same white-ground ruling as A |
| Mask removal | From A 96f / B 52f, conditionally unmount all wipe structure, page B full-frame directly | opacity 0 doesn't count as removal; leftover clip-path destroys true stillness |
| Ending | A true stillness at 54f / B at 98f (≥40f) | R1 |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- The wipe boundary must carry bright lines/highlights — a wipeless wipe reads as a PPT transition; the linchpin. Bright lines rely on the dark stroke in light areas and the white core in dark areas; both sides must stay readable
- Difference between A and circle-match-iris: iris is a circle bursting from an anchor (the radius grows), clock is an angle sweeping (radius constant) — don't conflate them just because both are circles
- Geometric wipes ≤2 per film, and don't use A/B consecutively in one film (two "boundary sweeps" read as a template feel)
- The bright line's fade-out and the mask removal must land on the same frame (A fades out 90–96f, unmounts at 96f); one frame off is a leftover-line illusion break

## Reference Implementation
demos/transition/wipe-transitions/
(BlindsSlice.tsx / ClockWipe.tsx)
