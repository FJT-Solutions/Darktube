---
name: chat-typing-reply
summary: In a phone chat UI, the user types character by character in the input field (caret blinking), a bubble pops in after sending, the AI thinks with three looping dots, the reply reveals character by character (with its own cursor), and finally the whole device breathes to settle
use: App promo showing the "typing → thinking → reply" rhythm of a chat/assistant product; emphasizes layered input feedback and AI reply
duration: ~7s (210f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (segmented progression: typing → sending → thinking → reply, no single impact peak)
tags: interaction
---

## Intent
Shoot one AI chat Q&A as a three-beat "typing → thinking → reply" rhythm: the user side types character by character so the viewer feels like the operator, the sent bubble popping in marks the action complete, the AI's looping three dots create the suspense of "processing", and the reply revealing character by character delivers the result. The core is the rhythm difference between the three stages — typing dense, thinking still, reply steady.

## Core Motion
- Single hero (phone chat UI) full action arc: f4 phone fades in + moves up 60px to settle; 2 history messages stagger in (f8–24, 7f apart)
- User typing: f34–76 input field character by character (28 characters, ~1.5f/character), 2px-wide caret blinking on ≈10f cycle; f84 sends — user bubble pops in spring-style + 8f blue glow
- AI thinking: f96–138 three dots looping on an 18f cycle (0.35↔1 staggered 4f), bubble corner radius 18 + 3px primary-color border on the left side
- AI reply: f144–186 reveals character by character (38 characters, ~1.1f/character) + cyan caret; the reply bubble grows in place of the thinking bubble, which fades out at f140
- After settling, a whole-device 1.6s (48f) breathing cycle (scale 1.00→1.008→1.00), holding until f210

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Phone entrance | f4 fade in + translateY 60→0 (16f, ease-out) | Moving up too much reads as "bouncy", too little gives no entrance feel |
| Typing speed | 1.5f/character (28 characters across 42f); caret blinks on ≈10f cycle | Typing too fast reads as "pasted"; the caret only shows during the typing window |
| Send feedback | User bubble pops in over 10f (ease-out) + 8f blue glow (0→0.5→0) | Too strong a glow steals focus from the reply; the input field clears immediately after sending |
| Thinking indicator | Three dots looping on an 18f cycle, 0.35↔1 staggered 4f per dot | A cycle <12f reads as anxious; no character-by-character typing here |
| Reply reveal | 1.1f/character (38 characters across 42f) + cyan caret; bubble grows in place | Replying too fast loses the "being generated" feel; the caret stops once typing finishes |
| Breathing | After settling, every 48f (1.6s) scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |
| Palette | Dark theme: #0a0a15 background, #1c1c28 bubbles, #00d9ff primary, #1c6fe0 user bubble | Contrast keeps text readable; the primary color is only for "in-progress" elements |

## Known Pitfalls
- Screen content must be self-drawn vector mockups (dark chat theme), no screenshot textures
- Typing must appear character by character (with a caret), not as a whole string popping in instantly
- The three thinking dots need a looping rhythm with an obvious still interval; the reply must start only after thinking finishes
- At the send moment the input field must clear and the user bubble must pop (don't leave text in the input field)
- The caret stays during the reply's character-by-character reveal and stops when typing is done
- Chat copy uses fictional demo data, not pointing at a real product

## Reference Implementation
demos/mobile/chat-typing-reply/
(ChatTypingReply.tsx)
