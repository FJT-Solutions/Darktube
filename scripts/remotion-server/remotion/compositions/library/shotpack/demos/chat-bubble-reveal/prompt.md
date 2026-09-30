---
name: chat-bubble-reveal
summary: Messages in an iMessage-style chat UI reveal one by one: the user side types character by character then sends (blue bubble pops in), the other side reveals a gray bubble character by character after a typing indicator, a reaction pops in with a delay, and finally the whole device breathes to settle
use: App promo showing the message-flow rhythm of a chat/IM product; emphasizes the "input → other side → feedback" conversational feel
duration: ~7s (210f @ 30fps, including ≥30f of stillness after settling)
energy: Medium (messages advance one by one; the typing indicator drives the rhythm)
tags: interaction
---

## Intent
Shoot a chat message flow as iMessage-style one-by-one reveals: every message has an explicit "prelude" (user typing / other side typing indicator) before it lands (bubble pops in / reveals character by character), and the reaction pops in late as tail-end feedback. The core is conversational rhythm — messages don't all appear at once, but grow one by one at a realistic chat speed.

## Core Motion
- Single hero (phone chat UI) full action arc: f4 phone fades in + moves up 60px
- Message 1 (user): f22 types character by character in the input field (26 characters), f58 sends — blue bubble on the right pops in over 10f; at the send moment the input field clears and the send button rotates -90°
- Message 2 (other side): f70 typing indicator (three dots looping on an 18f cycle) → f100 gray bubble reveals character by character (40 characters, ~0.7f/character) + caret → f136 reaction (👍) pops in with a delay (scale 0→1)
- Message 3 (user): f148 pops in directly (10f, ease-out), no typing (wrapping up the conversation)
- After settling, a whole-device 1.6s (48f) breathing cycle (scale 1.00→1.008→1.00), holding until f210
- iMessage palette: #0a7cff user bubble / #e9e9eb other-side bubble / #8e8e93 secondary

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Message 1 | f22 typing over 36f (26 characters) → f58 sends, pops in over 10f; send button rotates -90° | Typing speed matches a real chat feel; the input field clears immediately after sending |
| Typing indicator | Three dots looping on an 18f cycle, 0.4↔1 staggered 4f per dot; fades in at f70 | The longer the indicator runs, the stronger the suspense; don't let it overlap the message |
| Message 2 | f100 gray bubble character by character (40 characters over 28f) + caret; reaction pops at f136 | Revealing too fast loses the "being generated" feel; the reaction pops in 8f later |
| Message 3 | f148 pops in directly (10f ease-out), no typing | The wrap-up message appears directly to avoid dragging the rhythm |
| Bubble style | User #0a7cff with white text / other side #e9e9eb with black text, corner radius 18 + 4px corner fold on one side | The two sides must be clearly distinct; text ≤14px for readability |
| Breathing | After settling, every 48f (1.6s) scale 1.00→1.008→1.00 | Only whole-device breathing, no local loops |

## Known Pitfalls
- Screen content must be self-drawn vector mockups (iMessage light theme), no screenshot textures
- Every message must have its "prelude" (typing / typing indicator) before landing; don't let it appear directly
- The typing indicator disappearing and the message bubble appearing must join on the same frame (offset reads as "disconnected")
- At the send moment the input field clears + the send button state changes; the reaction pops in with a delay below the bubble
- Chat copy uses fictional demo data, not pointing at a real product

## Reference Implementation
demos/mobile/chat-bubble-reveal/
(ChatBubbleReveal.tsx)
