---
name: transition-hidden-cut
summary: Hidden-cut transitions, three variants — foreground-occlusion invisible cut, versus-slam opening, and warm light-leak burn; the hard cut is hidden inside 1–3 frames of occlusion/impact/light peak, and the viewer never sees the scissors
use: When a two-shot joint needs a "seamless scene change" or a "ritualistic opening" (technique card, selected at the same layer as the six shot-transitions variants)
duration: n/a (technique card; frames per variant are in the parameter table, drawn from the adjacent shots' budgets)
energy: n/a (technique card, doesn't occupy an energy slot)
---

## Intent
Same family as shot-transitions A variant flash-cut: flash-cut covers the hard cut with a white flash; these three variants swap in three other "blinders" — a foreground card sweeping across (A), a collision-impact frame (B), and a light leak climbing to its peak (C). The shared principle is magic misdirection: the hard cut happens in the 1–3 frames where the viewer's eye is drawn away by a big motion/bright light, and by the time they recover, the scene has already changed — "never seeing the scissors" throughout. flash-cut is the most plain; choose A for direction, B for ritual, C for warmth.

## Three-Variant Selection
| Variant | Approach | Applicable Seam |
|----|------|----------|
| A invisible-cut foreground occlusion | A card larger than the frame, with heavy motion blur, sweeps face-on across; inside the fully-blurred occlusion frame, background A→B hard-cuts, the card flies out, and viewers think it's still the same take | Page→page where you want the scene change completely seamless; the workhorse of the fake "single take" |
| B versus-slam | Left and right screen halves with diagonal cut edges accelerate toward each other from off-frame and slam together; the impact frame carries a white flash + screen shake + VS stamp; the cut point is the impact itself | Contrast/versus semantics openings or chapter heads (old vs new plan, two products, before/after) |
| C light-leak-burn | Three blobs of warm soft light sweep diagonally; at the light-peak frame, when about 70% of the old page is swallowed, hard-cut to the new page; the new page is already in place as the light recedes | Chapter transitions wanting a warm/film feel; softer than a white flash, with direction and temperature |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A sweep | Card 1600x1000 then scale(1.6), x from −2200→2600 over 14f, bezier(0.3,0,0.7,1); the cut point is the full-occlusion frame at the sweep midpoint (f47 in the demo) | The midpoint must cover −280..2280 to blur-fill the 1920 frame; both ends fully off-frame |
| A blur feel | Whole-scene `<CameraMotionBlur shutterAngle={300} samples={12}>` + the card's own blur(8px)/skewX(−v·0.018°) + 4 hand-added ghost layers (opacity 0.35→0.07, blur 14px, 0.55f apart) | Three blur layers stack into "roaring past your face"; CameraMotionBlur alone can't blur-fill the occlusion window |
| A wind push | Background ±40px: before the cut, A is dragged toward the sweep direction (ease-in); after the cut, B settles back over 13f from the opposite side (ease-out) | Sells the illusion of "the same take nudged by wind" — half of the seamless feel |
| B slash geometry | clip-path polygon diagonal edge ~78° (seam top x=1075→seam bottom x=845); the two halves drive in from ±1200px with ease-in(cubic) 10f | Ease-in acceleration gives the "smash"; a vertical seam reads as a PPT split screen |
| B impact trio | Fired on the impact frame together: white flash 0.9→0 over 3f + whole-camera shake 12px·e^(−t/1.6) drying out over ~5f + VS text block scale 1.6→1 back(2.6) overshoot 6f pressing out | All three must start on the same frame; one frame off and they scatter; shake amplitude must cross the visible threshold (perceptibility ruling) |
| C light layer | 3 radial-gradient blobs (#f6c878/#e8a44a/#d98a2b, diameters 1500/1950/2400px, blur 90px, mixBlendMode screen) sweeping top-right→bottom-left over ~70f | The blobs trail along the sweep direction, avoiding the perfectly-concentric "flashlight feel" |
| C intensity envelope | ease-in climb 27f (charging) → peak frame hides the cut → ease-out converge 43f (afterglow); peak overlays an 8% full-screen warm veil + a near-white hot core (opacity=intensity²) | Slow climb + fast converge reads as a fault flash; the hot core only burns near the peak |
| C washout | At peak, page filter: contrast −45%, brightness +35% | This is the source of the "burn-through" feel — light that only overlays without washing out reads as a sticker |

## Known Pitfalls
- Demo tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a production-final spec; first real use must be re-validated with actual assets
- C variant is the first in-library light-effect technique since the Q4 light-effect ruling was lifted — strictly honor the Q4 three constraints: single-point use (one place per film, no group bursts), passes only if normal-speed playback self-checks well, and the light serves the cut point rather than decoration; mixing it with flash-cut in one film counts as two light-effect hidden cuts
- A's occluder must truly cover everything: the demo's 1600x1000 card needs scale(1.6) to cover the 1920 frame — after changing asset dimensions, check frame-by-frame that no background edge shows at the cut frame; a single gap and the whole magic breaks
- B's VS text block semantics only fit "contrast/versus" content — when there's no two-party opposition, don't use it as a generic transition; removing VS and keeping only the slam degrades it into a diagonal-slit wipe, with the semantic requirement lowering accordingly
- Transitions don't stack (same rule as shot-transitions): one variant per seam; these three sit at the same selection layer as the six variants, so don't use both flash-cut and C variant for the same kind of seam in one film
- Annotate per seam already at the storyboard-table stage (write it into the "key motion" column), frames budgeted from the adjacent shots (R3)

## Reference Implementation
demos/transition/transition-hidden-cut/
(InvisibleCut.tsx / LightLeakBurn.tsx / VersusSlam.tsx)
