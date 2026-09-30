---
name: onboarding-stepper
summary: A step-by-step phone onboarding flow: the top stepper dots/connectors light up and advance with each step, each step's content enters with blur-in + slide-up, the bottom Next/Finish button presses through transitions, and a checkmark pops out when done
use: App promo showing an onboarding flow; emphasizes step-by-step progress and per-page content reveal
duration: ~7s (210f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (step-by-step progression, one small peak per step)
tags: screen
---

## Intent
Shoot the app's first-run onboarding as a "step forward" shot: the top stepper dots and connectors light up cell by cell as steps advance, page content enters with blur-in + slide-up (not a simple crossfade), the bottom Next/Finish button presses through transitions, and Finish pops out a completion-state checkmark at the end. The core is strict sync between the stepper advancing and the page switching, so the viewer clearly reads "which step + what this step is about".

## Core Motion
- Single hero (phone onboarding page) full action arc: f4 phone fades in + moves up 60px to settle (16f)
- Top stepper: 3 dots (1/2/3) + connectors between them; advances to step 2 at f64, step 3 at f104 (each transition 20f: dots change from white-background outlined to black-background white text, connectors from light gray to black), triggering on the same frame as the page switch
- Each step's content blur-in: f20/f64/f104 each enter, filter blur 28→0 + opacity 0→1 + translateY 16→0 (20f, ease-out); the previous step fades out in sync with the stepper switch (opacity set to 0)
- Step contents: step 1 email input (jane@acme.com); step 2 Free/Pro/Team radio options (Pro selected state: black outline + solid black dot); step 3 Email digests / Weekly reports toggles (first one on: black background, white thumb slid right)
- Bottom button: label flips to Finish on step 3 (Next for the first two); f158 press (scale 1→0.96→1 across 8f, with an inset shadow while pressed), then the completion-state green checkmark pops out (from f158, 12f, opacity 0→1 + scale 0→1 ease-out)
- After settling, from f176 a 48f (1.6s) micro-breathing cycle (scale 1.00→1.008→1.00), holding until f210

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phone entrance | f4 fade in + translateY 60→0 (16f, ease-out) | Moving up too much reads as "bouncy", too little gives no entrance feel |
| Stepper advance | f64/f104 once each; dots/connectors 20f lighting transition | Lighting and page switch must be on the same frame, otherwise the "progress feel" breaks |
| Content entrance | blur 28→0 + opacity 0→1 + translateY 16→0 (20f, ease-out) | The blur must be obvious (≥24px start), otherwise it looks like a crossfade |
| Radio/toggles | Pro selected by default; first toggle on by default | Selected states use a black outline + solid dot, distinct from unselected |
| Button | Next for the first two steps, Finish on step 3; f158 press 8f (scale 0.96 + inset shadow) | The press must be short (≤8f); the label flip only happens on the last step |
| Completion state | From f158 the checkmark pops in over 12f (opacity 0→1 + scale 0→1 ease-out) | Pop with ease-out; a mechanical linear looks stiff |
| Breathing | After settling, every 48f scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |
| Palette | Light theme: #f6f6f4 screen background, #18181b primary, stepper inactive #d8d8dc, checkmark #0f7e5a | Inactive gray must be light (#d8d8dc); active black needs weight |

## Known Pitfalls
- The stepper lighting must be on the same frame as the page switch: f64/f104 are both the moment the dots/connectors fill and the content fades in/out; offset frames read as "progress and pages detached"
- Content must blur-in (starting blur ≥24px), not just an opacity crossfade — this card's core feel is "emerging from blur"
- The bottom button label only flips to Finish on the last step; the flip is driven by step state, not hard-coded by time
- Each step's content must be self-drawn vector mockups, no screenshot textures (bitmap edges blur after blur-in)
- The completion-state checkmark only appears after f158, popping in above the button (inset 0 centered), never pushing the button out

## Reference Implementation
demos/mobile/onboarding-stepper/
(OnboardingStepper.tsx)
