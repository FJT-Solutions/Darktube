---
name: skeleton-reveal
summary: A three-tier fidelity reveal — draft → skeleton → content: hand-drawn doodle placeholders (boiling jitter) are replaced in one beat by gray-bar skeleton windows; after the skeleton list rolls in, the lens pushes closer and the gray bars develop row by row into avatars + word-by-word text, with the last word landing half a beat late
use: "from nothing to something" entrance narrative for product UIs; the paragraph that first reveals the product interface after the opening
duration: ~5.7s (172f: doodle 1s + swap-to-real 0.3s + skeleton roll-in 1.2s + push-in develop 3s)
energy: Medium (narrative entrance; the point is the two "becomes real" transitions)
---

## Intent
The UI entrance library is all "whole page in one shot" (fly-in / settle / wipe). This card splits the entrance into **three fidelity transitions**: hand-drawn doodle (idea) → gray-bar skeleton (structure) → real content (product); each transition is a "becomes real" payoff beat, and the viewer follows the full "sketch to product" narrative arc. The skeleton→content developing borrows loading-state grammar — users see skeleton screens every day; the moment they see gray bars they know "content is coming", the expectation is free. Division of labor with document-typewriter-reveal: that's **one document** being written block by block (content is the protagonist, you read the words); this card is **one interface** becoming real level by level (structure is the protagonist, text is the last-tier texture). Division of labor with ai-stream-response: that's evidence rows "streaming in" one by one (a list growing); this card is already-placed placeholders "developing" (layout decided early, fidelity upgrading).

## Core Motion
- Doodle = seeded jitter polylines/blob paths (mulberry32), SVG round-cap thick strokes (11–14px); **new seed every 5f for "boiling"** — a still hand-drawing reads as a texture
- Swap-to-real beat: the doodle layer retreats in 8f Easing.in acceleration (scale -14%) + fades out, while skeleton windows spring in (damping 16, stiffness 160) on the same frame — overlapping, no empty gap
- Skeleton rows translateY 520→0 rolling in staggered 6f per row (ease-out cubic)
- Developing = skeleton/content two-layer opacity crossfade + avatars scale 0.7→1 growing in, with the lens pushing 1→1.34 inOut (76f) alongside — the push gives the developing a "lean in to see clearly" viewing motivation
- Text enters word by word at 2.5f steps, floating up 14px; the last row's last word gets +14f, half a beat late (a "pink?"-style ending pause point)

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Boil period | new seed every 5f, jitter amplitude ±6–10px | <3f jitters into noise; >8f reads as lag rather than hand-drawn aliveness |
| Swap-to-real beat | doodle 8f accelerating retreat, skeleton spring-in on the same frame | this beat must be fast and decisive — stretched into a crossfade and the "transition" disappears |
| Skeleton roll-in | 6f stagger per row, 22f each ease-out | the skeleton phase needs a brief dwell (viewer registers "structure") before developing; glued-together can't read the three tiers |
| Develop rhythm | 13f stagger per row, 12f within row; lens push starts in the same segment | rows become real with rhythm; all-screen same-frame developing reads as image swapping |
| Word-by-word entrance | 2.5f/word, floating up 14px + fade-in | word-level entrance is the last-tier texture; a whole-row fade-in at one tier lower also works |
| Half-beat late | last row's last word +14f | the ending pause gives "loading complete" a period; all landing flat is bland |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec; first real use must re-verify with real assets
- The three tiers must be strictly isomorphic: the doodle's window/sidebar/message-row positions must match the skeleton's, and the skeleton's must match the real content's — misaligned, and "developing" becomes "the page changed", breaking the narrative
- When production real content layers real product screenshots/layouts, the skeleton gray bars' row heights and slots must follow the screenshot metrics (same family of lesson as document-typewriter-reveal's "baked-in texture alignment")
- Doodle linework should not draw details: thick round blobs + wavy lines suffice; drawn too UI-like, tier one and tier two become indistinguishable
- Mock copy compliance: no real customer/member names (Q1 general rule)
- Sound: a pop/whoosh pinned on the swap-to-real beat, one extremely light tick per row developing, a light chime closing at the last word's half-beat-late point

## Reference Implementation
demos/ui-entrance/skeleton-reveal/
(SkeletonReveal.tsx)
Source footage: slack-promo 4–4.5s + 10–15s
