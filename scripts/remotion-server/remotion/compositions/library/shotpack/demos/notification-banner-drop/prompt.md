---
name: notification-banner-drop
summary: A white notification banner springs in from the top of the phone (with overshoot), content rows then reveal, a finger taps the banner, the banner scales up and fades out, a conversation page slides in from the top, and message bubbles float up in a stagger
use: App promo showing push notifications / new message alerts; emphasizes the complete "notification → open conversation" interaction arc
duration: ~7s (210f @ 30fps, including ≥30f of stillness after settling)
energy: Medium-low (the banner drop is one small peak; the rest is sliding in and staggered reveals)
tags: interaction
---

## Intent
Shoot "receiving a push notification and tapping it open" as one shot: the inbox list is already on stage, a white banner drops in from the top with spring overshoot, the content rows then reveal (the notification can be read), the finger taps the banner and it scales up and fades out, a conversation page slides in from the top and message bubbles float up in a stagger — fully showing "where the notification came from and where tapping takes you". The core is the banner's drop feel (spring overshoot) and the "same physical space continuing" after tapping (banner → conversation page).

## Core Motion
- Phone f4 fade in (opacity 0→1) + translateY 60→0 (16f ease-out); inbox rows stagger in from f16, 4f each
- Banner drops in (from f40 spring damping 13 / stiffness 150): translateY -140→0, with one overshoot; content rows (icon + title + summary + red dot) reveal with ease-out at f50–62
- Finger f92–102 moves toward the banner center, f104–108 presses (scale 0.7), f110–116 disappears
- Expand (f104): banner scales up from transform-origin at the top, scale 1→5.2 (44f ease-out) and fades out; conversation page springs in from f112 (damping 16 / stiffness 110) translateY -46%→0
- Conversation messages float up in a stagger from f128 (7f per bubble, opacity + translateY 14→0, 14f ease-out)
- Inbox dims linearly at f104–118 (opacity 1→0), giving way to the conversation page; after settling, a 1.6s (48f) whole-device micro-breathing holds until f210

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Banner drop | From f40 spring (damping 13 / stiffness 150), translateY -140→0 | More damping = more "thud"; too-low stiffness drags |
| Content reveal | f50–62 ease-out (opacity + translateY 8→0) | Content must not appear on the same frame as the banner — "banner first, content after" |
| Tap expand | f104: banner scale 1→5.2 (44f) + conversation page spring slide-in | The banner's scaling and fade-out must overlap; don't disappear first and then pop the page |
| Conversation page | From f112 spring translateY -46%→0 (damping 16 / stiffness 110) | Completes within the same segment as the banner scaling, reading as "the same thing expanding" |
| Message stagger | From f128, 7f per bubble (14f ease-out) | Bubbles alternate left/right; the stagger lets the conversation be "read" completely |
| Breathing | After settling, every 48f scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |

## Known Pitfalls
- The banner must spring in (with overshoot); a linear drop has no "notification arrived" alert feel
- Banner content reveals only after the banner lands, otherwise the content jitters along with the overshoot
- The expand must do both "banner scaling up + fading out" and "conversation page sliding in"; doing only one reads as no "tap-to-expand"
- The conversation page slides in from the top, consistent with where the banner came from; sliding in from the bottom breaks the spatial relationship
- Screen content must be self-drawn vector mockups, no screenshot textures; messages are fictional demo data (Lena/Team Sync)

## Reference Implementation
demos/mobile/notification-banner-drop/
(NotificationBannerDrop.tsx)
