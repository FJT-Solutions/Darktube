---
name: chat-to-preview-morph
summary: Split screen inside a phone: the chat panel compresses from 55% to 25% height (content fades out in sync), the result preview grows from 45% to 75% (content fades in + moves up), an Apple-grade ease completes the shape transformation, and finally the whole device breathes to settle
use: App promo showing the AI assistant scenario of "conversation → result page"; emphasizes the shape transformation from chat to result
duration: ~6s (180f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (a single shape transformation, slow settling with Apple ease)
tags: transition
---

## Intent
Shoot the AI assistant's "finish chatting, get a result" as one shape transformation: the chat panel above gradually compresses while the result preview below gradually expands, both completing within the same screen (not a page switch). The core is the physical feel of "being dragged out" — on every frame the chat compresses, the preview expands in sync, using an Apple-grade ease so the transformation feels composed rather than mechanical.

## Core Motion
- Single hero (upper/lower split screen inside a phone) full action arc: f4 phone fades in; f20–108 shape transformation
- Transformation parameters: chat height 55%→25% (Apple ease bezier 0.16,1,0.3,1), preview height 45%→75%; chat content fades out in the latter half of the compression (from ratio <0.38, InQuad), preview content fades in + moves up 40px
- Divider: 3px primary color (#0a7cff) spanning across, moving with the split ratio
- Preview content: header label + big title "Summary ready" + skeleton rows + 2×2 data cards + bottom button (result-page visual hierarchy)
- After settling, a whole-device 1.6s (48f) breathing cycle (scale 1.00→1.008→1.00), holding until f180

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Split ratio | Chat 55%→25%, preview 45%→75% (88f transformation, Apple ease) | Slower transformation feels more "composed"; don't go under 50f (reads as rushed) |
| Easing | Easing.bezier(0.16, 1, 0.3, 1) (Apple signature ease) | A symmetric bezier looks mechanical; needs a slow-start dramatic settle |
| Chat fade-out | From ratio <0.38, InQuad fade-out (~60f) | Without fading out, the text smears into a blur while compressing |
| Preview fade-in | From transformation start +8f, fade in + translateY 40→0 | Starting in sync with the chat compression gives the "pulled out" feel |
| Anti-distortion | Chat bubbles/text fade out during compression instead of being compressed | Text squeezed by height blurs (lesson from previous case) |
| Breathing | After settling, every 48f (1.6s) scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |

## Known Pitfalls
- Screen content must be self-drawn vector mockups, no screenshot textures
- When split heights change, content scales/transforms without distortion; transition via fade-out/fade-in
- The preview fade-in must start on the same frame as the chat compression, otherwise it reads as "two separate actions"
- The divider must move with the ratio, not stay fixed
- Preview/chat copy uses fictional demo data, not pointing at a real product

## Reference Implementation
demos/mobile/chat-to-preview-morph/
(ChatToPreviewMorph.tsx)
