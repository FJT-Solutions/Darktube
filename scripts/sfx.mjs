#!/usr/bin/env node
/**
 * Darktube Procedural SFX Synthesizer (Movez 12-Step Course Pattern)
 * Sintetiza efeitos sonoros diretamente em código (WAV 16-bit 48kHz mono)
 * sem necessidade de DAW, samples externos ou licenças pagas.
 * 
 * Uso:
 *   node sfx.mjs cues.json out/sfx.wav
 * 
 * Formato do cues.json:
 *   [
 *     { "t": 0.5, "type": "click" },
 *     { "t": 1.2, "type": "whoosh" },
 *     { "t": 2.0, "type": "thump" },
 *     { "t": 3.4, "type": "pop" }
 *   ]
 */

import { readFileSync, writeFileSync } from 'node:fs';

const SR = 48000;

if (process.argv.length < 4) {
  console.log('Uso: node sfx.mjs <cues.json> <output.wav>');
  process.exit(1);
}

const cuesPath = process.argv[2];
const outputPath = process.argv[3];

const cues = JSON.parse(readFileSync(cuesPath, 'utf8'));

if (!Array.isArray(cues) || cues.length === 0) {
  console.error('Nenhum cue fornecido.');
  process.exit(1);
}

const maxTime = Math.max(...cues.map((c) => c.t)) + 1.5;
const totalSamples = Math.ceil(maxTime * SR);
const buffer = new Float32Array(totalSamples);

let seed = 42;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};

// Sintetizadores matemáticos de cada tipo de som
const VOICES = {
  click: [
    0.05,
    (t) => Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 90) * 0.5,
  ],
  pop: [
    0.15,
    (t) => Math.sin(2 * Math.PI * (600 + 900 * t) * t) * Math.exp(-t * 30) * 0.4,
  ],
  thump: [
    0.50,
    (t) => Math.sin(2 * Math.PI * (90 - 60 * t) * t) * Math.exp(-t * 9) * 0.9,
  ],
  whoosh: [
    0.35,
    (t) => noise() * Math.sin(Math.PI * Math.min(1, t / 0.35)) * 0.25,
  ],
};

// Aplicar cues no buffer
for (const cue of cues) {
  const voice = VOICES[cue.type] || VOICES.click;
  const [duration, synthFn] = voice;
  const startSample = Math.floor(cue.t * SR);
  const sampleCount = Math.floor(duration * SR);

  for (let i = 0; i < sampleCount && startSample + i < buffer.length; i++) {
    buffer[startSample + i] += synthFn(i / SR);
  }
}

// Criação do cabeçalho WAV 16-bit PCM
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

// Normalização e clipping suave
for (let i = 0; i < n; i++) {
  const clamped = Math.max(-1, Math.min(1, buffer[i]));
  wavBuffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
}

writeFileSync(outputPath, wavBuffer);
console.log(`SFX sintetizado com sucesso: ${outputPath} (${(n / SR).toFixed(2)}s)`);
