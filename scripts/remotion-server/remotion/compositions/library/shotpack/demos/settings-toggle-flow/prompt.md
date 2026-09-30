---
name: settings-toggle-flow
summary: A phone settings page toggle flow: multiple switches flip on in a stagger (thumb springs with overshoot + track color transition), a slider drags its progress, and a "Settings saved" toast slides up, lingers, and fades out
use: App promo showing a settings/preferences page; emphasizes toggles and instant feedback
duration: ~7.4s (222f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (each switch flips in a stagger)
tags: screen
---

## Intent
Shoot the app settings page as "settings items landing one by one": after the page rows enter with blur-in stagger, the switches don't flip at once but one by one in a stagger (T1/T2/T3 each 30+f apart) into the on state — each thumb springs to the right with one overshoot while the track color transitions from light gray to black at the same time. Midway, a slider is dragged (progress from 30px to 130px), and finally a "Settings saved" toast pops out at the bottom: slides up in + briefly lingers + fades out. The whole device ends with a breathing hold. The core is the rhythm of "switches lighting up one by one", letting the viewer clearly count "how many settings were changed".

## Core Motion
- Phone entrance: f4 fade in + translateY 60→0 (16f, ease-out)
- Settings rows blur-in stagger: from f18 each row staggered 4f (rows 0/1/2/3), 14f each, blur 14→0 + opacity 0→1 + translateY 10→0 (ease-out)
- Switch flips: three switches flip in a stagger — T1=f40 (Notifications), T2=f74 (Dark mode), T3=f130 (Two-factor auth)
- thumb spring: damping 13 / stiffness 150, left 2→22px (slides right 20px, with overshoot)
- track background: within 8f of flipping, #e2e2e6 → #18181b
- slider drag: f100–124 progress 30→130px (out cubic), thumb follows
- Save toast: f152 slides up 24px in + lingers (until f182) → f182–192 fades out
- After settling, from f188 a 48f (1.6s) micro-breathing cycle (scale 1.00→1.008→1.00), holding until f222

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phone entrance | f4 fade in + translateY 60→0 (16f, ease-out) | Moving up too much reads as "bouncy", too little gives no entrance feel |
| Row blur-in | From f18 staggered 4f per row, 14f each (blur 14→0 + translateY 10→0) | The stagger is mandatory, otherwise it looks like one whole-screen reveal |
| Switch flips | T1=40 / T2=74 / T3=130, each thumb springing right 20px | The three switches must stagger (≥30f apart); flipping at once loses the "setting them one by one" narrative |
| thumb spring | damping 13 / stiffness 150 | Must have overshoot; a linear slide looks mechanical |
| Track background | Within 8f of flipping, #e2e2e6 → #18181b | The color switch triggers on the same frame as the thumb flip |
| Slider | f100–124 progress 30→130px (out cubic) | The drag sits between two switch flips to build rhythm |
| Toast | f152 slides up 24px in, lingers until f182, f182–192 fades out | Needs all three phases — in/linger/out; entering without exiting leaves a ghost |
| Breathing | After settling, every 48f scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |
| Palette | Light theme: #e8e6e1 background, #18181b primary, switch off #e2e2e6, toast checkmark #0f7e5a | The off-state gray must be light; the on-state black needs weight |

## Known Pitfalls
- The switches must flip in a stagger (T1/T2/T3 each 30+f apart), never at once — this card's core feel is the progressive "switches lighting up one by one"
- The thumb must flip with a spring including overshoot; pure linear displacement looks mechanical; the track color switch must start on the same frame as the thumb flip
- The toast needs all three phases — in (slide up)/linger/out (fade out) — with the in and out triggered on different frames; never only pop in without dismissing
- Page content must be self-drawn vector mockups, no screenshot textures (bitmap edges blur after blur-in)
- The slider drag sits between two switch flips as a rhythm transition; don't pile it at the end

## Reference Implementation
demos/mobile/settings-toggle-flow/
(SettingsToggleFlow.tsx)
