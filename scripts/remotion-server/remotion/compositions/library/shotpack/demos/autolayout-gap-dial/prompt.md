---
name: autolayout-gap-dial
summary: A gap dial drives the layout — a row of link blocks with a marquee selection outline and gap annotations, badge numbers ticking up step by step while blocks get pushed apart in real time by the parameter and spring back into place; visualizing "parameter-driven layout"
use: "Change one number, the UI follows" selling-point shots for design tools/low-code products; category language that wraps things in design-tool semantics
duration: ~4s (120f: marquee entry + widening 38f + hold + spring bounce-back)
energy: Medium (tool-rational style; the payoff is the locked sync between number and displacement)
---

## Intent
"Parameter changed, UI changed" is the core promise of design tools, but it's usually shot as a before/after of "click panel → cut to
result", with the causality cut away. This card shoots the causality as one continuous shot: the gap badge number ticks up step by step, the link blocks get pushed apart **on the same frame**, and the measurement line stretches in real time — the number is the reins,
the layout is the horse. The marquee outline + 8 handles + gap annotations are all native design-tool language, so the viewer instantly
recognizes "this is tuning a parameter inside a tool". The return path deliberately uses an underdamped spring overshoot (squeezing tighter
than the start before settling back) to make "returning home" a springy finish. Division of labor with type-and-filter:
that card is the retrieval causality of "type content → list converges", this card is the parameter causality of "dial a value → geometry
rearranges".

## Core Motion
- **One gap parameter rules everything**: block positions are recomputed from gap (the whole row stays centered), the measurement
  line width = gap, and the badge is pinned to the gap's center — every element derives from the same value, and that locked sync
  is the entire persuasion of this card
- Parameter curve: forward 12→110 over 38f Easing.inOut(cubic); hold 14f;
  return spring(damping 9, stiffness 80, mass 1.1), deliberately overshooting below the start before settling back
- Badge number displays in steps of 2 (Math.round(gap/2)*2), with a scale pulse
  1+0.10·|sin| on each tick; the big GAP readout block at top syncs with it
- Marquee outline springs in, 8 handles (four corners + four edge midpoints); gap annotation = vertical
  extension line ×2 + horizontal measurement line + trailing badge, fading in over 8–16f

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| gap range | 12→110px (original film 20→24, demo amplified per ruling) | At the original film's range it's nearly imperceptible — perceptibility precedent: if you can't see it, exaggerate into an extreme version; real projects need at least 4–5× the travel |
| Forward duration | 38f inOut cubic | Too fast reads as twitching; past 60f the binding between number ticks and displacement loosens |
| Return spring | damping 9 → overshoots below the start, then settles | The overshoot is the "let go and bounce back" feel; damping ≥13 lands flat, a waste |
| Number step | step 2 + scale pulse 0.10 on ticks | Stepping by 1 is too fine, reads like a stopwatch; stepping is the "dial click" grain |
| Annotation geometry | extension line 62px, measurement line pinned to block bottom +56px, badge at the gap center | Annotations must recompute in real time with gap — any one spot lagging reads as broken |
| Block widths | unequal (230/190/265/210/245) | Equal widths read as a diagram; unequal widths look like real navigation |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec,
  so first real use must re-verify with real assets
- Number and displacement must share the same source and frame: the badge display value and block coordinates both derive from the same gap; animating them separately, even 1f apart, shatters the trust in "parameter-driven"
- The big GAP readout block at the top of the demo is a grayscale explainer caption; in production, if the frame already has a real tool panel, delete it — don't double-count the value
- Same-family extension: gap is just one dimension; radius/padding/rotation can be swapped in with the same grammar — but one shot dials only one parameter; two or more reads as random fiddling
- The marquee outline + handles borrow "design-tool semantics" (the native language of figma/framer); be cautious with films for non-design-tool audiences — if they can't read the marquee, all that's left is blocks shifting
- Sound: one very light tick per badge step (dial click), one pop when the bounce-back settles; tick density follows the step size

## Reference Implementation
demos/interaction/autolayout-gap-dial/
(AutolayoutGapDial.tsx)
Source film: framer-ai 4.5–5.5s
