import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getUserApiKey } from '@/lib/database';
import {
  cleanCaptionText,
  ffmpegBin,
  probe,
  readStored,
  tightenWords,
  transcribeWhisper,
  type TimedWord,
} from '@/lib/flow-assemble';

const run = promisify(execFile);

export type VoiceProviderChoice = 'auto' | 'external' | 'elevenlabs' | 'openai' | 'edge';
export type VoiceGender = 'male' | 'female';

export interface VoiceWord {
  palavra: string;
  inicio: number;
  fim: number;
}

export interface ResolveVoiceInput {
  userId: string;
  scriptText: string;
  outputDir: string;
  audioPathOrUrl?: string;
  voiceProvider?: VoiceProviderChoice;
  voiceGender?: VoiceGender;
  voiceId?: string;
  language?: string;
  speed?: number;
}

export interface ResolveVoiceResult {
  audioPath: string;
  durationSec: number;
  providerUsed: 'external' | 'elevenlabs' | 'openai' | 'edge';
  voiceUsed: string;
  words: VoiceWord[];
}

const EDGE_VOICE_MAP: Record<string, Record<VoiceGender, string>> = {
  pt: { male: 'pt-BR-AntonioNeural', female: 'pt-BR-FranciscaNeural' },
  en: { male: 'en-US-AndrewNeural', female: 'en-US-AvaNeural' },
  es: { male: 'es-ES-AlvaroNeural', female: 'es-ES-ElviraNeural' },
};

const ELEVENLABS_DEFAULT_VOICES: Record<VoiceGender, string> = {
  male: 'pNInz6obpgDQGcFmaJgB', // Adam
  female: 'EXAVITQu4vr4xnSDxMaL', // Sarah
};

const OPENAI_DEFAULT_VOICES: Record<VoiceGender, string> = {
  male: 'onyx',
  female: 'nova',
};

function sanitizeSpokenText(raw: string): string {
  return cleanCaptionText(
    String(raw || '')
      .replace(/R\$\s*(\d+)/gi, '$1 reais')
      .replace(/US\$\s*(\d+)/gi, '$1 dólares')
      .replace(/(\d+)\s*%/g, '$1 por cento')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function proportionalWords(text: string, durationSec: number): VoiceWord[] {
  const tokens = sanitizeSpokenText(text).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const usable = Math.max(0.5, durationSec - 0.12);
  const totalWeight = tokens.reduce((s, t) => s + Math.max(2, t.length), 0);
  let cursor = 0.08;
  return tokens.map((tok) => {
    const share = (Math.max(2, tok.length) / totalWeight) * usable;
    const inicio = +cursor.toFixed(3);
    cursor += share;
    const fim = +Math.min(durationSec, cursor).toFixed(3);
    return { palavra: tok, inicio, fim: Math.max(inicio + 0.06, fim) };
  });
}

function toVoiceWords(words: TimedWord[]): VoiceWord[] {
  return tightenWords(words)
    .map((w) => ({
      palavra: cleanCaptionText(w.word),
      inicio: +Number(w.start).toFixed(3),
      fim: +Number(w.end).toFixed(3),
    }))
    .filter((w) => w.palavra.length > 0 && w.fim > w.inicio);
}

function alignmentToWords(
  text: string,
  alignment: { characters?: string[]; character_start_times_seconds?: number[]; character_end_times_seconds?: number[] }
): VoiceWord[] {
  const chars = alignment.characters || [];
  const starts = alignment.character_start_times_seconds || [];
  const ends = alignment.character_end_times_seconds || [];
  if (!chars.length || chars.length !== starts.length) return [];

  const out: VoiceWord[] = [];
  let buf = '';
  let wStart = -1;
  let wEnd = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/\s/.test(ch)) {
      if (buf) {
        out.push({ palavra: cleanCaptionText(buf), inicio: +wStart.toFixed(3), fim: +Math.max(wStart + 0.05, wEnd).toFixed(3) });
        buf = '';
        wStart = -1;
      }
      continue;
    }
    if (wStart < 0) wStart = Number(starts[i] || 0);
    wEnd = Number(ends[i] || wStart + 0.05);
    buf += ch;
  }
  if (buf) {
    out.push({ palavra: cleanCaptionText(buf), inicio: +wStart.toFixed(3), fim: +Math.max(wStart + 0.05, wEnd).toFixed(3) });
  }

  const cleanOrig = sanitizeSpokenText(text).split(/\s+/).filter(Boolean);
  if (cleanOrig.length === out.length) {
    for (let i = 0; i < out.length; i++) out[i].palavra = cleanOrig[i];
  }
  return out.filter((w) => w.palavra.length > 0);
}

async function resolveExternalAudio(
  audioInput: string,
  scriptText: string,
  outputDir: string,
  openaiKey: string,
  language: string
): Promise<ResolveVoiceResult> {
  const rawPath = path.join(outputDir, 'external_raw');
  const outMp3 = path.join(outputDir, 'narracao.mp3');

  if (audioInput.startsWith('/api/storage/')) {
    fs.writeFileSync(rawPath, await readStored(audioInput));
  } else if (/^https?:\/\//i.test(audioInput)) {
    const res = await fetch(audioInput, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`Falha ao baixar áudio externo (${res.status})`);
    fs.writeFileSync(rawPath, Buffer.from(await res.arrayBuffer()));
  } else {
    if (!fs.existsSync(audioInput)) throw new Error(`Áudio externo não encontrado: ${audioInput}`);
    fs.copyFileSync(audioInput, rawPath);
  }

  // Corta silêncio inicial para alinhar imediatamente aos 0.1s como no DarkTube replace_audio
  await run(
    ffmpegBin(),
    [
      '-y',
      '-i',
      rawPath,
      '-af',
      'silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,loudnorm=I=-16:TP=-1.5:LRA=11',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      outMp3,
    ],
    { timeout: 120_000, windowsHide: true }
  );
  try {
    fs.unlinkSync(rawPath);
  } catch {}

  const info = await probe(outMp3);
  const durationSec = Math.max(1, +(info.duration || 0).toFixed(3));

  let words: VoiceWord[] = [];
  if (openaiKey) {
    const rawWords = await transcribeWhisper(outMp3, language.split('-')[0], openaiKey, scriptText);
    if (rawWords?.length) words = toVoiceWords(rawWords);
  }
  if (!words.length) {
    words = proportionalWords(scriptText, durationSec);
  }

  return {
    audioPath: outMp3,
    durationSec,
    providerUsed: 'external',
    voiceUsed: path.basename(audioInput),
    words,
  };
}

async function synthesizeElevenLabs(
  text: string,
  apiKey: string,
  voiceId: string,
  speed: number,
  outMp3: string
): Promise<{ durationSec: number; words: VoiceWord[] }> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.48,
        similarity_boost: 0.78,
        speed: Math.max(0.7, Math.min(1.2, speed)),
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ElevenLabs falhou (${res.status}): ${errText.slice(0, 180)}`);
  }
  const data = await res.json();
  if (!data?.audio_base64) throw new Error('ElevenLabs não retornou áudio base64.');
  fs.writeFileSync(outMp3, Buffer.from(data.audio_base64, 'base64'));
  const info = await probe(outMp3);
  const durationSec = Math.max(1, +(info.duration || 0).toFixed(3));
  const aligned = data.alignment ? alignmentToWords(text, data.alignment) : [];
  return { durationSec, words: aligned.length ? aligned : proportionalWords(text, durationSec) };
}

async function synthesizeOpenAiTts(
  text: string,
  apiKey: string,
  voice: string,
  speed: number,
  language: string,
  outMp3: string
): Promise<{ durationSec: number; words: VoiceWord[] }> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'tts-1-hd',
      voice,
      input: text,
      speed: Math.max(0.75, Math.min(1.3, speed)),
      response_format: 'mp3',
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI TTS falhou (${res.status}): ${errText.slice(0, 180)}`);
  }
  fs.writeFileSync(outMp3, Buffer.from(await res.arrayBuffer()));
  const info = await probe(outMp3);
  const durationSec = Math.max(1, +(info.duration || 0).toFixed(3));
  const rawWords = await transcribeWhisper(outMp3, language.split('-')[0], apiKey, text);
  const words = rawWords?.length ? toVoiceWords(rawWords) : proportionalWords(text, durationSec);
  return { durationSec, words };
}

async function synthesizeEdgeTts(
  text: string,
  voiceName: string,
  speed: number,
  outputDir: string,
  outMp3: string
): Promise<{ durationSec: number; words: VoiceWord[] }> {
  const txtPath = path.join(outputDir, 'edge_input.txt');
  const wordsJsonPath = path.join(outputDir, 'edge_words.json');
  fs.writeFileSync(txtPath, text, 'utf8');

  const ratePct = Math.round((speed - 1) * 100);
  const rateStr = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;

  const pyScript = `
import asyncio, json, sys, edge_tts
txt_p, mp3_p, out_p, voice, rate = sys.argv[1:6]
text = open(txt_p, 'r', encoding='utf-8').read().strip()
async def main():
    comm = edge_tts.Communicate(text, voice=voice, rate=rate, boundary='WordBoundary')
    words = []
    with open(mp3_p, 'wb') as f:
        async for ch in comm.stream():
            if ch.get('type') == 'audio':
                f.write(ch['data'])
            elif ch.get('type') == 'WordBoundary':
                s = round(ch['offset'] / 10_000_000, 3)
                d = round(ch['duration'] / 10_000_000, 3)
                words.append({'palavra': ch['text'], 'inicio': s, 'fim': round(s + max(0.05, d), 3)})
    with open(out_p, 'w', encoding='utf-8') as wf:
        json.dump(words, wf, ensure_ascii=False)
asyncio.run(main())
`.trim();

  let lastErr: unknown = null;
  for (const pyBin of [process.env.PYTHON_BIN, 'python3', 'python'].filter(Boolean) as string[]) {
    try {
      await run(pyBin, ['-c', pyScript, txtPath, outMp3, wordsJsonPath, voiceName, rateStr], {
        timeout: 120_000,
        windowsHide: true,
      });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) {
    throw new Error(`Edge TTS indisponível no host: ${(lastErr as Error)?.message || String(lastErr)}`);
  }

  const info = await probe(outMp3);
  const durationSec = Math.max(1, +(info.duration || 0).toFixed(3));
  let words: VoiceWord[] = [];
  try {
    words = JSON.parse(fs.readFileSync(wordsJsonPath, 'utf8'));
    const orig = text.split(/\s+/).filter(Boolean);
    if (words.length === orig.length) {
      for (let i = 0; i < words.length; i++) words[i].palavra = orig[i];
    }
  } catch {}
  try {
    fs.unlinkSync(txtPath);
    fs.unlinkSync(wordsJsonPath);
  } catch {}
  return { durationSec, words: words.length ? words : proportionalWords(text, durationSec) };
}

/**
 * Resolve voz seguindo a hierarquia combinada:
 * 1) Audio externo (se enviado) -> 2) ElevenLabs (se usuario tiver chave) -> 3) OpenAI TTS -> 4) Edge TTS ($0 fallback).
 */
export async function resolveVoiceWithTimestamps(input: ResolveVoiceInput): Promise<ResolveVoiceResult> {
  fs.mkdirSync(input.outputDir, { recursive: true });
  const text = sanitizeSpokenText(input.scriptText);
  const gender: VoiceGender = input.voiceGender === 'female' ? 'female' : 'male';
  const lang = input.language || 'pt-BR';
  const langShort = lang.toLowerCase().slice(0, 2);
  const speed = Number(input.speed || 1.02);
  const outMp3 = path.join(input.outputDir, 'narracao.mp3');

  const [elevenKey, openaiKey] = await Promise.all([
    getUserApiKey(input.userId, 'elevenlabs').catch(() => ''),
    getUserApiKey(input.userId, 'openai').catch(() => ''),
  ]);

  if (input.audioPathOrUrl && (input.voiceProvider === 'external' || !input.voiceProvider || input.voiceProvider === 'auto')) {
    return await resolveExternalAudio(input.audioPathOrUrl, text, input.outputDir, openaiKey, lang);
  }

  const preferred = input.voiceProvider || 'auto';

  if (preferred === 'elevenlabs' || (preferred === 'auto' && elevenKey)) {
    if (!elevenKey) {
      if (preferred === 'elevenlabs') {
        throw new Error('Chave da ElevenLabs não encontrada nas Credenciais do usuário.');
      }
    } else {
      try {
        const chosenVoice = input.voiceId || ELEVENLABS_DEFAULT_VOICES[gender];
        const res = await synthesizeElevenLabs(text, elevenKey, chosenVoice, speed, outMp3);
        return { audioPath: outMp3, durationSec: res.durationSec, providerUsed: 'elevenlabs', voiceUsed: chosenVoice, words: res.words };
      } catch (err) {
        if (preferred === 'elevenlabs') throw err;
        console.warn('[VoiceResolver] ElevenLabs falhou, tentando próximo fallback:', (err as Error)?.message);
      }
    }
  }

  if (preferred === 'openai' || (preferred === 'auto' && openaiKey)) {
    if (!openaiKey) {
      if (preferred === 'openai') throw new Error('Chave da OpenAI não encontrada nas Credenciais do usuário.');
    } else {
      try {
        const chosenVoice = input.voiceId || OPENAI_DEFAULT_VOICES[gender];
        const res = await synthesizeOpenAiTts(text, openaiKey, chosenVoice, speed, lang, outMp3);
        return { audioPath: outMp3, durationSec: res.durationSec, providerUsed: 'openai', voiceUsed: chosenVoice, words: res.words };
      } catch (err) {
        if (preferred === 'openai') throw err;
        console.warn('[VoiceResolver] OpenAI TTS falhou, caindo para Edge TTS:', (err as Error)?.message);
      }
    }
  }

  const edgeVoice =
    input.voiceId ||
    (EDGE_VOICE_MAP[langShort] || EDGE_VOICE_MAP.pt)[gender];
  const edgeRes = await synthesizeEdgeTts(text, edgeVoice, speed, input.outputDir, outMp3);
  return {
    audioPath: outMp3,
    durationSec: edgeRes.durationSec,
    providerUsed: 'edge',
    voiceUsed: edgeVoice,
    words: edgeRes.words,
  };
}
