---
name: shot-transitions
summary: Camera handoff, six variants — push-to-whiteout flash-cut, straight cruise through dark, focus relay, black-frame text card, whip-pan, and mask-wipe through a window (incl. a depth variant), selected by energy drop
use: Any two-shot joint (technique card; after storyboarding the shots, pick one variant per seam)
duration: n/a (technique card; frames per variant are in the parameter table, drawn from the adjacent shots' budgets)
energy: n/a (technique card, doesn't occupy an energy slot)
---

## Intent
Each shot card in the library handles only its own entrance and ending; there has been no vocabulary for "how shots connect" — raw-cut seams leak away the cinematic feel built up shot by shot. Well-regarded release films (Linear Releases/Agent, reverse-engineered by frame extraction on 2026-07-11) never once use a raw cut: scene changes rely on deep travel, focus relay, or black-frame text cards to build tension.

## Six-Variant Selection

| Variant | Approach | Applicable Seam |
|----|------|----------|
| A push-to-whiteout flash-cut | The prior shot's camera pushes in, and the cut point rides on a white flash covering the page switch | Interactive penetration, similar-energy page→page (already in the library, being absorbed) |
| B straight cruise through dark | The camera pushes the foreground out along the motion direction → glides through pure dark for a few frames → the background swells in head-on from depth of field, one take with no cut | High-energy→high-energy scene jumps; the dark-toned film's workhorse transition |
| C focus relay | The foreground slides out of the focal plane (blur deepening) while the background gathers focus in the opposite direction; focus is the edit point | Block→block within the same page; segmenting document/long-page tours |
| D black-frame text card | The prior shot fades to black, a text card appears typewriter/embossed, then hands off to the next shot | Chapter-level segmentation + breathing slot in one (paper-title-card's dark-field variant) |
| E whip-pan | One beat whips the camera position to the next scene; the mid-swing motion blur blurs past recognition, and the blur frames are used to change scenes | Fast-paced feature sequences back-to-back (a lighter high-energy→high-energy option than B, saving frames and adding speed) |
| F mask-wipe through a window | A real element in the page (a card) scales up into a full-screen window and the new scene grows out from inside to take over | Semantic seams: feature overview→that feature's detail ("opening this card enters its world") |

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| A flash-cut | `assets/lib/FlashCut.tsx`, from = cut point − 5, 5f on each side | Usage details in the type-and-filter card; the white flash only covers the hard cut, not as a decorative light effect (Q4) |
| B dark glide | Prior shot pushes out 8–12f → dark 4–8f → background scales in 10–14f; background starts from scale ~0.6 + blur and gathers focus | The dark segment can't be a dead all-black — keep a faint background gradient/dust so "still moving" is perceptible; gliding too long reads as a cutaway, >10f must have elements moving; the fast push-out/meet-in camera moves can be wrapped in `<CameraMotionBlur>` (params in the deck-deal-flyin motion-blur row) |
| B motion direction | Out and in share a direction (prior shot pushes right→background arrives from the right), the speed curve continuous with no swing-back | Disconnected directions read as two films spliced together; the secret of Releases' single take is directional continuity |
| C focus exchange | Foreground blur 0→8px while background 8px→0, crossover window 10–16f; the two scenes start 2–4f apart | Same-frame starts read as the whole screen blurring; shallow depth of field should run through the section, not pop in suddenly (the DoF language must be established before use) |
| D black-frame text card | Prior shot fades out 6–10f → text-card segment (params follow paper-title-card, background swapped to dark) → fade in next shot 6–10f | Text color on a dark card uses the page's background color (light)/monospace so it doesn't look like an error dialog; ≤2 uses per 30s film, more fragments the rhythm |
| E basic whip | Hold ≥20f at each end → swing 8f across ~1.5 screens (steep ease-in-out curve) → settle directly; `<CameraMotionBlur shutterAngle={200} samples={8}>` wraps only the swing | Span is set by "peak speed ≥300px/f"; below that the blur doesn't fully hide the scene change; the two scenes splice on the same horizontal line (same page-space y), stopping right after the swing |
| E hard-brake whip | First 70% of the distance in 30% of the time (blurred segment) → last 30% ease-out long tail ~48f gliding into the landing | For shots whose landing point is "content to be read" — the long tail gives the viewer's eye a slope to catch up; a long tail >60f steals the next shot's entrance, err short rather than long |
| F through-window | The element scales to full screen in 45f (single-segment bezier), the new scene inside compensates from ~0.42 scale back to 1, the element's face half fades out early (opacity 1−t·2.2) | Window geometry and the scene inside must be driven in sync (the same t); async reads as an illusion break; the scaled element uses high-res texture (Q2, fully close-up the whole time) |
| F depth variant portal-wipe | Window scales in 40f with bezier(0.7,0,0.3,1) slow-then-fast; the inside holds **only 2 parallax layers** (far: whole-page thumbnail factor 0.08 + near: 2 cards 0.3, no blur), then after the window completes, an 8f ease-stop → stillness ≥30f to read the new scene | Layer count/scatter is the readability linchpin — the 3-layer + 0.85 scatter + blur version was cut; converging passed. It must truly stop after the window; drifting parallax that never stops steals the next shot's reading |

## Known Pitfalls
- Annotate the transition variant per seam already at the storyboard-table stage (write it into the "key motion" column); doing it only at the per-shot stage means moving frames across the whole line — transition frames are drawn from the adjacent shots' budgets, same rule as hold budgets (R3)
- Variants B/C borrow from reverse-engineered frames of the Linear release film (2026-07-11, evolution round #3); not user rulings — they're default suggestions, not commands, and actual rulings take precedence when they conflict
- Variant B demands a lot of the source asset: a background swelling head-on means the texture gets magnified; low-res screenshots must first pass aesthetic criterion Q2's high-resolution rasterization technique
- Transitions don't stack: one variant per seam; adding a flash white inside B's dark field reads as an illusion break
- E/F parameters were tuned on placeholder assets then confirmed on real assets, not user rulings — single-instance rulings; actual rulings take precedence when they conflict. E's basic/hard-brake are chosen by the next shot's nature (next shot has its own entrance motion → basic; next shot relies on content → hard-brake); mixing both in one film counts as two variants, one use each
- F's new scene inside the window should semantically be the clicked element's "detail world" (in production, connect the real detail page screenshot) — unrelated scenes inside the window break the meaning and reduce it to a flashy wipe
- F depth-variant parameters are a grayscale-placeholder tuning starting point, not validated on real assets; reference implementation demos/transition/shot-transitions/PortalWipeV2.tsx

## Reference Implementation
A variant: template/src/aifl/Main.tsx flash-cut layer;
E variant (whip): demos/transition/shot-transitions/WhipPanReal.tsx / WhipBrakeReal.tsx;
F variant (mask wipe): demos/transition/shot-transitions/MaskWipeReal.tsx (depth variant PortalWipeV2.tsx in the same directory);
B/C/D variants have no in-library implementation yet; implement per the parameter table.
