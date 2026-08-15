---
name: checkout-flow
summary: A phone checkout flow: the amount card + form fields stagger in, the confirmation card springs up after tapping Pay (overlay + order summary), and after confirming, a full-screen success state with a checkmark + receipt copy
use: App promo showing a purchase/checkout flow; emphasizes form progression and result feedback
duration: ~7s (210f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (form progression → confirmation popup → success)
tags: interaction
---

## Intent
Shoot an app checkout as a complete "form progression → confirmation → result" interaction arc: the amount card and form fields don't appear at once but stagger in so the viewer reads in order "how much to pay, what to fill in"; tapping Pay pops up a confirmation card with an overlay (order summary), and pressing confirm cuts the whole screen into a green success state (checkmark + receipt copy). The core is "every step has a clear entrance and result feedback", making the payment flow believable with a sense of completion.

## Core Motion
- Phone entrance: f4 fade in + translateY 60→0 (16f, ease-out)
- Form sections stagger in: from f18 each section staggered 5f (section 0 amount card / section 1 input rows / section 2 Pay button), 14f each, opacity 0→1 + amount card translateY 12→0 (ease-out)
- Pay button press: f96 tap, press 0→1→0 across 8f (0–3 press down, 5–8 spring back), button scale 1→0.96→1 + inset shadow while pressed
- Confirmation card springs out: f104, damping 14 / stiffness 160 (with overshoot) + full-screen overlay 0.32 black (8f fade in), card contains two order-summary rows (Card •••• 4242 / Email)
- Confirm button press: f150, press 0→1→0 across 8f, button inside the confirmation card scales 0.96
- Success state: from f158 full-screen #0f7e5a green (12f fade in + checkmark scale 0→1), checkmark disc + "Payment successful" + receipt copy
- After settling, from f176 a 48f (1.6s) micro-breathing cycle (scale 1.00→1.008→1.00), holding until f210

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phone entrance | f4 fade in + translateY 60→0 (16f, ease-out) | Moving up too much reads as "bouncy", too little gives no entrance feel |
| Form section stagger | From f18 each section staggered 5f, 14f each (opacity 0→1 + amount card 12px rise) | The stagger is mandatory, otherwise it looks like one whole-screen reveal; the Pay button enters last |
| Pay press | f96; press 0→1→0 across 8f (0–3 press down, 5–8 spring back), scale 0.96 + inset shadow | Leave ≥4f between the press and the confirmation card popup — "press first, then pop" |
| Confirmation card spring | f104, damping 14 / stiffness 160 (overshoot), overlay 0.32 black fading in over 8f | Must be a spring with overshoot; a linear popup looks stiff |
| Confirm press | f150; press 0→1→0 across 8f, scale 0.96 | Confirming must switch to the success state, not just spring the button back |
| Success state | From f158 full-screen green 12f fade in + checkmark scale 0→1 | The success checkmark must not hard-cut; give it ~12f of fade-in growth |
| Breathing | After settling, every 48f (1.6s) scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |
| Palette | Light theme: #e8e6e1 background, amount card #26262b, primary button #18181b, success green #0f7e5a | The contrast between success and form states must be strong; green is the film's only "complete" signal |

## Known Pitfalls
- The confirmation card must have a full-screen overlay covering the form (can't float over the form without one); overlay 0.32 black fading in over 8f
- The success state can only appear after the confirm button is pressed (f150 press ends → f158 success state); don't switch screens early
- The success checkmark needs 12f of fade-in growth (scale 0→1), no hard cut — a hard cut looks like a frame skip rather than "payment complete"
- Form sections must stagger in (5f apart), not all surface at once; the Pay button must appear last
- Page content must be self-drawn vector mockups, no screenshot textures
- Copy uses fictional demo data (jane@acme.com / Acme Cloud), not pointing at a real product

## Reference Implementation
demos/mobile/checkout-flow/
(CheckoutFlow.tsx)
