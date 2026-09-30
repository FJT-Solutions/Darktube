---
name: document-typewriter-reveal
summary: A fully typeset real document "writes" itself in after the cursor, the sidebar follows, and history entries drop into the track one by one
use: Document/report/notes-style feature shots; the highest information-density beat
duration: ~3.7s (110f, including the history-list-stack tail)
energy: Low-mid (highest information density, steady rhythm so the viewer can read)
tags: ui-entrance
---

## Intent
The viewer will read every character on screen — this shot's persuasiveness rests entirely
on "the document is real." Typewriter-style writing turns a static page into "a document
being written," and the sidebar history entries dropping in add the time-depth of
"continuous output."

## Core Motion
- Content blocks write in two at a time on the beat: a background mask anchored right
  sweeps left→narrow, an accent-colored caret rides the reveal frontier
- Person-name @-mentions grow their accent background after the wipe completes
- Left/right two-column layout enters via background patches sweeping top→bottom,
  with thin accent inner-edge lines growing with the reveal then fading
- Tail (history-list-stack): 6 history entries drop into the sidebar track one by one,
  each landing with a pop
- Camera pulls from a title close-up to the full page (both columns must be in frame),
  then only micro-breathing

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Write beat | 20 blocks in pairs; block g's cue = 6 + g·3.5, each block wipes in 8f, last pair completes ~49f (before the 64f full-page settle) | Per-block writing blows the budget — "block count × beat must fit the budget first" is the card's core arithmetic; calculate before writing |
| Write technique | background mask width 100%→0, bezier(0.4,0,0.6,1); accent caret 2px follows only the newest block, fades 2f after writing | Multiple carets at once instantly break the illusion; there is always exactly one "pen tip" |
| li bullet dots | mask covers an extra 28px left (::marker sits ~22px left of text) | Without the extra cover the dot breaks the illusion early — every typographic detail baked into the screenshot texture must be checked this way |
| @-mention | 4f after wipe completes, accent background grows over 8f at opacity 0.7; skip non-person headers | Highlight arriving later than the write reads as "emphasis being marked"; same-frame arrival reads as a sticker |
| Two-column entrance | left column cue 46 / right column cue 54, background patch sweeps top→bottom in 10f + 1.5px accent inner line grows with reveal, fades over 24f | Two columns offset from body copy beats; simultaneous entrance fights for attention |
| History entry drop | 6 entries, cue = 58 + i·5 (after sidebar wipe completes at 56f), each drops in 8f; start −44px, bezier(0.2,1.15,0.3,1) light bounce, air-shadow `0 10·air px 20·air px` | Entry geometry hugs the bottom of the baked-in entries and aligns line-height — DOM-redrawn entries must strictly align with the live entries in the texture |
| Camera | title close-up zoom 1.25 → 64f full page zoom 0.997, 78/102f micro-breathing 1.003/0.995 | At full page both columns must be in frame — cutting the sidebar from a document shot cuts the "complete product" credibility (Q10) |

## Sound
During the writing section pin keyboard.mp3 trimmed to 44f to cover the writing
(foley and action exactly equal length, S4); the 6 history-entry pops fire every 5f
with a stepped volume ramp 0.40→0.25 for distance attenuation (S2).

## Known Pitfalls
- Mock content must be publication-grade: native product typography, text filling the
  space, sidebar fully in frame (Q10) — "screenshot + slogan" grade lazy documents
  force a full redo of the shot
- Data compliance: mock content must never contain real client/member names (Q1)
- When the asset page is a live data source (collaborative document type), a full
  re-capture wipes out settled textures — use an incremental script to refresh only
  one page, one key
- Accent examples (caret/@-mention/inner-edge line) are amber in the template film;
  when adapting to a new brand, uniformly swap to the target brand accent

## Reference Implementation
template/src/aifl/live/SceneWbr.tsx (typing sound per the SFX table in template/src/aifl/Main.tsx; in the template film this shot carries the weekly-report document scene)
