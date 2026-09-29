#!/usr/bin/env node
/**
 * Darktube Procedural SFX Synthesizer (Movez 12-Step Course Pattern — Level 10)
 * Sintetiza efeitos sonoros diretamente em código (WAV 16-bit 48kHz mono)
 * sem necessidade de DAW, samples externos ou licenças pagas.
 * 
 * Uso via CLI:
 *   node sfx.mjs <cues.json> <output.wav>
 * 
 * Ou uso programático via import:
 *   import { generateSfxFile, generateSfxBuffer } from './sfx.mjs';
 */

import { readFileSync, writeFileSync } from 'node:fs';

export const SR = 48000;

export function createRng(initialSeed = 42) {
  let seed = initialSeed;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
}

// Arsenal Completo de Sintetizadores Matemáticos (14 Tipos de SFX)
export const VOICES = {
  click: [
    0.05,
    (t, rng) => Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 90) * 0.5,
  ],
  'camera-click': [
    0.12,
    (t, rng) => {
      // Duplo clique (obturador abrindo e fechando)
      const c1 = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 120);
      const c2 = t > 0.04 ? Math.sin(2 * Math.PI * 1400 * (t - 0.04)) * Math.exp(-(t - 0.04) * 80) : 0;
      return (c1 + c2 * 0.7) * 0.6;
    },
  ],
  pop: [
    0.15,
    (t, rng) => Math.sin(2 * Math.PI * (600 + 900 * t) * t) * Math.exp(-t * 30) * 0.4,
  ],
  'pop-clean': [
    0.12,
    (t, rng) => Math.sin(2 * Math.PI * (400 + 1200 * t) * t) * Math.exp(-t * 35) * 0.45,
  ],
  thump: [
    0.50,
    (t, rng) => Math.sin(2 * Math.PI * (90 - 60 * t) * t) * Math.exp(-t * 9) * 0.9,
  ],
  'sub-drop': [
    0.75,
    (t, rng) => Math.sin(2 * Math.PI * (130 - 95 * t) * t) * Math.exp(-t * 3.2) * 0.95,
  ],
  whoosh: [
    0.35,
    (t, rng) => rng() * Math.sin(Math.PI * Math.min(1, t / 0.35)) * 0.3,
  ],
  'whoosh-heavy': [
    0.55,
    (t, rng) => {
      const envelope = Math.sin(Math.PI * Math.min(1, t / 0.55));
      const sub = Math.sin(2 * Math.PI * 65 * t) * 0.4;
      return (rng() * 0.45 + sub) * envelope;
    },
  ],
  'impact-boom': [
    0.70,
    (t, rng) => {
      const sub = Math.sin(2 * Math.PI * (65 - 35 * t) * t) * Math.exp(-t * 5.5) * 0.9;
      const crack = rng() * Math.exp(-t * 40) * 0.4;
      return sub + crack;
    },
  ],
  whip: [
    0.22,
    (t, rng) => {
      const whooshPart = rng() * Math.sin(Math.PI * Math.min(1, t / 0.18)) * 0.35;
      const snap = t > 0.15 ? Math.sin(2 * Math.PI * 3000 * (t - 0.15)) * Math.exp(-(t - 0.15) * 150) * 0.6 : 0;
      return whooshPart + snap;
    },
  ],
  'counter-tick': [
    0.04,
    (t, rng) => Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 110) * 0.5,
  ],
  'cash-register': [
    0.50,
    (t, rng) => {
      const ring1 = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 7);
      const ring2 = Math.sin(2 * Math.PI * 3520 * t) * Math.exp(-t * 9);
      const mech = t < 0.05 ? rng() * 0.3 : 0;
      return (ring1 * 0.4 + ring2 * 0.3 + mech) * 0.7;
    },
  ],
  'ding-bell': [
    0.65,
    (t, rng) => {
      const fundamental = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 5.0);
      const harmonic = Math.sin(2 * Math.PI * 4800 * t) * Math.exp(-t * 8.0) * 0.35;
      return (fundamental + harmonic) * 0.5;
    },
  ],
  'keyboard-typing': [
    0.06,
    (t, rng) => {
      const transient = rng() * Math.exp(-t * 120) * 0.4;
      const thud = Math.sin(2 * Math.PI * 350 * t) * Math.exp(-t * 60) * 0.3;
      return transient + thud;
    },
  ],
  'glitch-burst': [
    0.20,
    (t, rng) => {
      // Aberração digital com chirp modulado
      const freq = 300 + Math.floor(rng() * 1200);
      const square = Math.sign(Math.sin(2 * Math.PI * freq * t));
      return (square * 0.3 + rng() * 0.25) * Math.exp(-t * 12);
    },
  ],
  'cinematic-riser': [
    1.20,
    (t, rng) => {
      const progress = Math.min(1, t / 1.20);
      const freq = 60 + Math.pow(progress, 2.5) * 450;
      const sine = Math.sin(2 * Math.PI * freq * t);
      const noisePart = rng() * Math.pow(progress, 2) * 0.3;
      return (sine * 0.4 + noisePart) * progress;
    },
  ],
};

// Aliases para máxima flexibilidade
VOICES['whoosh_heavy'] = VOICES['whoosh-heavy'];
VOICES['impact_boom'] = VOICES['impact-boom'];
VOICES['sub_drop'] = VOICES['sub-drop'];
VOICES['camera_click'] = VOICES['camera-click'];
VOICES['counter_tick'] = VOICES['counter-tick'];
VOICES['cash_register'] = VOICES['cash-register'];
VOICES['ding_bell'] = VOICES['ding-bell'];
VOICES['keyboard_typing'] = VOICES['keyboard-typing'];
VOICES['glitch_burst'] = VOICES['glitch-burst'];
VOICES['cinematic_riser'] = VOICES['cinematic-riser'];
VOICES['pop_clean'] = VOICES['pop-clean'];

/**
 * Gera um buffer WAV a partir de uma lista de cues de efeitos sonoros.
 * cues: [{ t: number (em segundos), type: string, volume?: number }]
 */
export function generateSfxBuffer(cues) {
  if (!Array.isArray(cues) || cues.length === 0) {
    return Buffer.alloc(44); // WAV vazio
  }

  const maxTime = Math.max(...cues.map((c) => c.t || c.timeInSeconds || 0)) + 2.0;
  const totalSamples = Math.ceil(maxTime * SR);
  const buffer = new Float32Array(totalSamples);
  const rng = createRng(42);

  for (const cue of cues) {
    const cueType = cue.type || 'whoosh';
    if (cueType === 'none') continue;
    const voice = VOICES[cueType] || VOICES.click;
    const [duration, synthFn] = voice;
    const tSeconds = cue.t !== undefined ? cue.t : (cue.timeInSeconds || 0);
    const startSample = Math.max(0, Math.floor(tSeconds * SR));
    const sampleCount = Math.floor(duration * SR);
    const volume = cue.volume !== undefined ? cue.volume : 0.8;

    for (let i = 0; i < sampleCount && startSample + i < buffer.length; i++) {
      buffer[startSample + i] += synthFn(i / SR, rng) * volume;
    }
  }

  // Criação do cabeçalho WAV 16-bit PCM Mono 48kHz
  const n = buffer.length;
  const wavBuffer = Buffer.alloc(44 + n * 2);

  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + n * 2, 4);
  wavBuffer.write('WAVEfmt ', 8);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20); // PCM
  wavBuffer.writeUInt16LE(1, 22); // Mono
  wavBuffer.writeUInt32LE(SR, 24); // Sample Rate
  wavBuffer.writeUInt32LE(SR * 2, 28); // Byte Rate
  wavBuffer.writeUInt16LE(2, 32); // Block Align
  wavBuffer.writeUInt16LE(16, 34); // Bits por sample
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(n * 2, 40);

  // Normalização e soft clipping
  for (let i = 0; i < n; i++) {
    const clamped = Math.max(-1, Math.min(1, buffer[i]));
    wavBuffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return wavBuffer;
}

export function generateSfxFile(cues, outputPath) {
  const buf = generateSfxBuffer(cues);
  writeFileSync(outputPath, buf);
  return outputPath;
}

// Execução CLI
if (process.argv[1] && process.argv[1].endsWith('sfx.mjs') && process.argv.length >= 4) {
  const cuesPath = process.argv[2];
  const outputPath = process.argv[3];
  const cuesData = JSON.parse(readFileSync(cuesPath, 'utf8'));
  generateSfxFile(cuesData, outputPath);
  console.log(`SFX WAV gerado com sucesso em: ${outputPath} (${cuesData.length} cues)`);
}
