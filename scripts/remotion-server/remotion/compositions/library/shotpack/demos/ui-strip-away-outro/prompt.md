---
name: ui-strip-away-outro
summary: A subtractive ending — after clicking Publish, the entire editor UI evaporates in staggered layers from the periphery toward the center; on the black field only that button remains, sliding to screen center and scaling up, then the button fades out to hand off to the wordmark final
use: "Publish/done" semantics outro; product endings that want to say "after one click, all complexity disappears"
duration: ~4.3s (130f: cursor settles 34f → evaporation ~40f → button alone → wordmark takeover)
energy: Medium (quiet operation up front, sustained exit in the middle, no instantaneous impact)
---

## Intent
Every ending in the library is "additive": outro-group-photo-launch flies elements in for a group photo, logo sting settles then hits an easter egg. This card is the only "subtractive" route — a click detonates the whole UI's exit, leaving only the semantic focus (the clicked button) on the black field, translating "publish = complexity zeroed" into a motion narrative. Two linchpins: **evaporation must have order** — from periphery to center, one layer every 4f, each layer with directional displacement (each scattering off-frame its own way); random order or same-frame all-gone reads as a power-outage glitch. **The button is the only survivor and it must migrate** — during the evaporation it slides from the toolbar corner to screen center at 1.5× with a white halo strengthening as the black field grows, completing its promotion from "UI control" to "ritual protagonist", then fades out to hand the black field to the wordmark.

## Core Motion
- 6 evaporation layers: sidebar → property panel → canvas card → toolbar ends → canvas bottom → toolbar mid; starting +4f after the click, one layer every 4f; each layer STRIP_DUR 14f, Easing.in(quad) accelerating exit, fade + directional displacement (sidebar −140,0 / panel −90,20 / toolbar ends ∓80,−60 / canvas bottom 0,40 / toolbar mid 0,−50)
- The 4 cards inside the canvas additionally stagger 3f each, alternating left/right (±70px) — a large block vanishing as a whole reads as a deleted layer; breaking apart is what "evaporation" is
- Background pressing dark: as the canvas-bottom layer evaporates (+20f for 20f), the gray base → #111110
- Button: click spring(damping 12, stiffness 220) compression pulse; during evaporation, position/size interpolate sliding to screen center (18f, inOut cubic), scale ×1.5, white halo 30→70px strengthening with the black field; fades out over 12f starting +52f
- Wordmark takeover: +62f spring(damping 14, stiffness 90) fade-in + 86%→100% scale, settling on the black field
- Cursor fades out within 10f of the click — the protagonist changes hands; the cursor must exit

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Layer stagger | 4f × 6 layers | Same-frame all-gone reads as power loss; >8f drags into a slow demolition and the ritual scatters |
| Single-layer duration | 14f, ease-in accelerating | ease-out exit reads as "drifting away", not "evaporating"; >20f feels sticky |
| Evaporation order | Periphery → center, the button's layer last | The center emptying first reads as a glitch; the button layer leaving first collapses the whole card |
| Displacement range | 50–140px, each direction off-frame on its own | Displacement-free pure fade reads as adjusting opacity; same-direction reads as a full-page pan |
| Button migration | 18f slide to screen center + scale ×1.5 + halo strengthening | Without migrating, a small corner button alone on the black field reads as forgotten-to-delete; the migrate-then-fade order can't be reversed |
| Wordmark takeover | Enters ~10f after the button fades, spring settle | Sharing the screen with the button fights for attention; a >20f empty gap on the black field looks like the film is over |

## Known Pitfalls
- The demo was tuned against grayscale/placeholder assets — parameters are a tuning starting point, not a production lock; first real use must be re-validated on real assets
- Division with outro-group-photo-launch: the family photo is the "additive" peak final shot (the multi-feature product's full curtain call); this card is the "subtractive" ending (single-action semantics, growing quieter) — pick one per product temperament; never two endings in one film
- Chaining with edit-hook-moves B (logo-sting-button): a sting easter egg can follow this card's wordmark settle, but the sting's "sudden insert" breaks the subtractive quiet — whether to chain depends on the film's temperament
- Each evaporating layer must be a **semantically complete UI region** (sidebar/panel/toolbar); slicing layers by pixel area exposes structurally nonsensical partial states during the stagger
- The button keeps top zIndex throughout its migration — any evaporation layer drifting in front of the button breaks the illusion
- The trigger must be "terminal" in semantics (Publish/Ship/Done); a Save or ordinary confirm detonating the whole UI is semantics too small for the spectacle
- In production the button uses a brand highlight color (the source is Framer blue); the demo's white button is just a grayscale placeholder — on the black field the button-vs-halo contrast is the protagonist's aura; weak color fails the promotion

## Reference Implementation
demos/outro/ui-strip-away-outro/
(UiStripAwayOutro.tsx)
Source film: framer-ai 33–36.5s
