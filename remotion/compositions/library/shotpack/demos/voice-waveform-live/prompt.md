---
name: voice-waveform-live
summary: A recording pill's live voiceprint — 64 thin vertical bars rise and fall with "speech", towering in the middle while speaking and collapsing to a dotted line on pauses, with the waveform scrolling right to left; a full performance of speak → pause → speak → submit-collapse
use: Feature shots for voice input / AI assistants "listening to you speak"; segments with no UI content to show but that need sustained aliveness to hold the frame
duration: ~5s (150f: entry 12f + speak 1.4s + pause 0.8s + speak 1.4s + submit-collapse 0.8s)
energy: Medium (functional aliveness, not showboating)
---

## Intent
The library's only other waveform is spectrum-morph-ui — a **decorative** music visualization where a title underline splits into spectrum bars. This card is a **functional** voiceprint: the real-time receipt of "I'm listening to you". The difference is causality: spectrum dances to the BGM and is packaging; this card dances to "the user speaking" and is the product feature itself. When speaking the waveform towers, on pauses it collapses into a row of dotted lines, and history scrolls out to the left — the viewer reads "it really is listening" from the waveform's undulation, and a 6s+ segment is carried entirely by that aliveness, needing nothing else. Division of labor with gauge-readout-moves: a gauge is the mechanical ritual of "reporting one value"; this card is the vital sign of "continuous monitoring", with no final value.

## Core Motion
- **Frame-deterministic pseudo-randomness is the linchpin**: mulberry32 sampled at integer sample points + smoothstep
  interpolation between neighbors (value noise), no Math.random — reproducible rendering and frame-to-frame continuity
- Scrolling feel: the i-th bar's sample time = f - (N-1-i)·1.6, the rightmost bar is "now",
  history flows leftward; the bars don't translate, each one reads the signal at a different moment
- Bar height = speech envelope (trapezoidal seg with speak/pause two levels + syllable noise 0.55+0.45·noise)
  × mid-space weight sin^0.8 × per-bar jitter (0.35+0.65·noise);
  silence clamped to a 5px dotted line
- Submit: button compresses 3f scale 1→0.82→1 bounce-back, waveform collapses 12f Easing.in
  to 0.06, mic glow dims with the envelope

## Parameter Table
| Parameter | Typical Value | Tuning Feel |
|------|--------|----------|
| Bar count/gap | 64 bars, gap 6px (1320px-wide pill) | Below 40 bars reads as an equalizer; denser than 90 and individual bars can't be read as undulating |
| Scroll rate | 1.6 frames/sample point | Too fast and history refreshes like a glitch; too slow and the "scrolling" feel disappears into in-place jitter |
| Speak/pause envelope | seg trapezoid rise 5f / fall 7f; demo speaks 15–57f, pauses 80–124f | The pause segment must genuinely collapse to a dotted line — without the "pause" contrast, "speak" doesn't hold |
| Syllable noise | 0.55+0.45·noiseAt(t/4.5) | Without the syllable layer the waveform is a smooth hill and the "cadence of a sentence" is unreadable |
| Mid weight | sin^0.8 spatial envelope | No weight and the full width is even height like an equalizer; exponent >1.5 makes the center dominate like a single jumping bar |
| Silence clamp | max 5px dotted line | Clamped to 0 the waveform disappears, reading as a disconnected line; the dotted line is "listening, but you're not speaking" |
| Submit-collapse | 12f Easing.in to 0.06 + 3f button compression bounce-back | The collapse is "this utterance was collected"; a fade-out can't read the submit semantics |

## Known Pitfalls
- The demo was tuned on grayscale/placeholder assets — parameters are a tuning starting point, not a final production spec,
  so first real use must re-verify with real assets
- **With an audio track, the waveform must follow the voice**: if the film has real narration/voiceover, the envelope's speak/pause segments must align with the track's speak/pause; a one-second misalignment breaks the illusion; a purely synthetic envelope is only acceptable for voiceover-less scored films
- Can coexist with spectrum-morph-ui in one film (one is functional, one decorative), but don't use the same bar visuals — height/color/radius must differ by at least one step, or the viewer reads it as the same thing intruding
- The demo's glassmorphic pill (backdropFilter blur 24px) is raycast dark-stage style; light-theme films can swap it for a solid pill, the voiceprint parameters stay the same
- The emoji + grayscale filter for the mic is a placeholder — swap in an SVG icon for production
- Sound: this card's picture is literally "the shape of sound", so it pairs most naturally with a real voice; the submit button gets one light pop + a short descending tone with the collapse

## Reference Implementation
demos/interaction/voice-waveform-live/
(VoiceWaveformLive.tsx)
Source film: raycast-teams 19.5–26.0s
