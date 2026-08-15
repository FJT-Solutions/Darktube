---
name: ai-stream-response
summary: An AI response panel lands a readable summary line first, then evidence rows with status icons stream in one by one, and finally everything settles into a completed state
use: Result-generation shots for AI assistants/agent/search/copilot; emphasizes "conclusion first, evidence follows, task done"
duration: ~4–5s (120–150f, including ≥15f of completed-state stillness)
energy: Medium-high (information keeps accruing, but readability outranks speed showboating)
---

## Intent
Shoot "AI at work" as a readable causal chain rather than a log feed: the viewer first grasps the answer summary,
then sees evidence/subtasks fill in one by one, and finally a completed state confirms the round of work is done.

## Core Motion
- Use a real response-panel screenshot of the target product as the backplate; hide the dynamic area before the cut and overlay it back into the true slots by layout coordinates (Q1/Q9)
- After the panel enters, the summary line settles in with a short wipe/fade in, then at least 12f pass before the first evidence row starts
- 6–8 evidence rows stream in one by one from 14–24px below with slight blur; gaps tighten gradually but keep a countable beat
- The row body lands first, the status icon switches from pending to running/done 2–4f later, creating a lead-and-drag hierarchy
  (the pattern is baked into assets/lib/helpers/motion.ts lagged)
- After the last row completes, do a single panel-level completion pulse, then the whole frame rests ≥15f; no per-row glint

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Summary | cue 18, 10–14f reveal; hold ≥12f after the summary settles, first row cue ≥42 | If the summary and the first row stick together you lose the "conclusion first" narrative; at normal speed it must read a complete conclusion before anything else |
| Row beat | `cue[i]=42+[0,11,21,30,38,45,51,56][i]`, 10–14f per row | Gaps tighten 11→5f to read as work accelerating; don't let rows pack so tight they all blur into one blob (R2) |
| Row entry | y 18px→0, blur 6px→0, opacity 0→1, bezier(0.2,0.75,0.25,1) | The displacement must clear the normal-speed visual threshold; large horizontal swings read as a notification list, not evidence being filed |
| Status icon | 3f later than the row body's cue; pending ring → running gap ring → done solid check, 6–8f | Icons are status receipts and must not upstage the row text; flipping every icon on the same frame reads as fake loading |
| Completion settle | 6f after the last icon turns done, panel border/summary backdrop opacity 0.25→0.55→0.25 over 10f | Only one panel-level pulse, no per-row glow (Q4); leave ≥15f of true stillness after the completion pulse (R1) |
| Camera | Dense info defaults to head-on view, zoom 1.04→1.0 slight pull-back; dark angled shots only as an emotional variant | The angled shot in the Linear reference is not a universal instruction; snap back to head-on the moment text is hard to read (Q6) |

## Sound
Pair the summary settling with one `transition-soft`; use short `pop` for the first 3–4 rows, tapering softly
0.32→0.20, then merge the accelerating dense tail into a single low-volume `whoosh-fast` to avoid a per-row machine-gun feel;
cap the completed state with a light version of `click-camera` (about vol 0.3). Pin the sound frames after the picture locks.

## Known Pitfalls
- Character-by-character streaming typing traps the eye at the character level; in promo durations, reveal the summary in "semantic chunks" instead,
  and use `type-and-filter` when you genuinely need to show input operations
- If the row body and the status icon settle on the same frame, it reads as a static list switching wholesale; keep a 2–4f lead-and-drag hierarchy
- Row endpoints must be real list slots in the screenshot, not floating above the panel; dynamic content must also use fictional data
- This card borrows from the Linear Agent launch film at t≈13–17s (evolution round #3 breakdown #6), not a user precedent;
  parameters haven't been validated by real projects in this library, so on first use you must review at normal speed per P1 rather than relying on frame-by-frame diffing

## Reference Implementation
demos/interaction/ai-stream-response/
(StreamResponse.tsx)
