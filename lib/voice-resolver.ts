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

export type VoiceProviderChoice = 'external' | 'elevenlabs' | 'edge' | 'openai';
export type VoiceGender = 'male' | 'female';

export interface VoiceWord {
  palavra: string;
  inicio: number;
  fim: number;
}

export interface EdgeVoiceOption {
  id: string;
  name: string;
  gender: VoiceGender;
  style: string;
}

export interface OpenAiVoiceOption {
  id: string;
  name: string;
  gender: VoiceGender;
  note: string;
}

export interface ElevenLabsVoiceItem {
  id: string;
  name: string;
  category: string;
  previewUrl?: string;
  labels?: Record<string, string>;
}

export const EDGE_PTBR_VOICES: EdgeVoiceOption[] = [
  { id: 'pt-BR-FranciscaNeural', name: 'Francisca Neural (PT-BR)', gender: 'female', style: 'Natural, clara e versátil' },
  { id: 'pt-BR-AntonioNeural', name: 'Antônio Neural (PT-BR)', gender: 'male', style: 'Firme, estilo documentário' },
  { id: 'pt-BR-ThalitaMultilingualNeural', name: 'Thalita Multilíngue (PT-BR)', gender: 'female', style: 'Jovial, ritmo dinâmico' },
  { id: 'pt-BR-FabioNeural', name: 'Fábio Neural (PT-BR)', gender: 'male', style: 'Conversacional suave' },
  { id: 'pt-BR-HumbertoNeural', name: 'Humberto Neural (PT-BR)', gender: 'male', style: 'Corporativa e pausada' },
  { id: 'pt-BR-BrendaNeural', name: 'Brenda Neural (PT-BR)', gender: 'female', style: 'Leve e didática' },
  { id: 'pt-BR-DonatoNeural', name: 'Donato Neural (PT-BR)', gender: 'male', style: 'Séria / investigativa' },
  { id: 'pt-BR-ValerioNeural', name: 'Valério Neural (PT-BR)', gender: 'male', style: 'Madura / narrativa' },
];

export const OPENAI_VOICES: OpenAiVoiceOption[] = [
  { id: 'onyx', name: 'Onyx (OpenAI tts-1-hd)', gender: 'male', note: 'Grave; sotaque internacional leve' },
  { id: 'nova', name: 'Nova (OpenAI tts-1-hd)', gender: 'female', note: 'Expressiva; sotaque internacional leve' },
  { id: 'alloy', name: 'Alloy (OpenAI tts-1-hd)', gender: 'male', note: 'Neutra' },
  { id: 'echo', name: 'Echo (OpenAI tts-1-hd)', gender: 'male', note: 'Limpa' },
  { id: 'shimmer', name: 'Shimmer (OpenAI tts-1-hd)', gender: 'female', note: 'Suave' },
];

export interface ResolveVoiceInput {
  userId: string;
  scriptText: string;
  outputDir: string;
  audioPathOrUrl?: string;
  voiceProvider: VoiceProviderChoice;
  voiceGender?: VoiceGender;
  voiceId?: string;
  voiceName?: string;
  language?: string;
  speed?: number;
  /** Edge TTS pitch shift, e.g. '-20Hz' (older/deeper character voices) */
  pitch?: string;
}

export interface ResolveVoiceResult {
  audioPath: string;
  durationSec: number;
  providerUsed: VoiceProviderChoice;
  voiceUsed: string;
  voiceLabel: string;
  words: VoiceWord[];
}

const EDGE_VOICE_MAP: Record<string, Record<VoiceGender, string>> = {
  pt: { male: 'pt-BR-AntonioNeural', female: 'pt-BR-FranciscaNeural' },
  en: { male: 'en-US-AndrewNeural', female: 'en-US-AvaNeural' },
  es: { male: 'es-ES-AlvaroNeural', female: 'es-ES-ElviraNeural' },
};

const OPENAI_DEFAULT_VOICES: Record<VoiceGender, string> = {
  male: 'onyx',
  female: 'nova',
};

/**
 * Garante seleção explícita da origem da voz (proibido usar cascata automática 'auto').
 */
export function validateVoiceSelection(input: {
  voiceProvider?: unknown;
  voiceId?: unknown;
  audioPathOrUrl?: unknown;
}): VoiceProviderChoice {
  const raw = String(input?.voiceProvider || '').trim().toLowerCase();
  if (!raw || raw === 'auto') {
    throw new Error(
      'Seleção explícita de voz obrigatória: informe voiceProvider ("external", "elevenlabs", "edge" ou "openai"). A cascata automática ("auto") foi desativada.'
    );
  }
  if (raw !== 'external' && raw !== 'elevenlabs' && raw !== 'edge' && raw !== 'openai') {
    throw new Error(
      `Provedor de voz inválido "${raw}". Escolha exatamente um entre: external, elevenlabs, edge ou openai.`
    );
  }
  if (raw === 'external' && !String(input?.audioPathOrUrl || '').trim()) {
    throw new Error(
      'Provedor "external" selecionado, mas nenhum áudio foi enviado. Envie o arquivo ou URL em audioPathOrUrl.'
    );
  }
  if (raw === 'elevenlabs' && !String(input?.voiceId || '').trim()) {
    throw new Error(
      'Provedor "elevenlabs" exige "voiceId" explícito. Selecione uma voz da sua conta ElevenLabs ou crie/clone uma nova voz antes de renderizar.'
    );
  }
  return raw;
}

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

async function resolveElevenLabsKey(userId: string): Promise<string> {
  const userKey = await getUserApiKey(userId, 'elevenlabs').catch(() => '');
  return (userKey || process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || '').trim();
}

async function resolveOpenAiKey(userId: string): Promise<string> {
  const userKey = await getUserApiKey(userId, 'openai').catch(() => '');
  return (userKey || process.env.OPENAI_API_KEY || '').trim();
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
    const candidate = fs.existsSync(audioInput) ? audioInput : path.resolve(process.cwd(), audioInput);
    if (!fs.existsSync(candidate)) throw new Error(`Áudio externo não encontrado: ${audioInput}`);
    fs.copyFileSync(candidate, rawPath);
  }

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

  const fileLabel = path.basename(audioInput.split('?')[0]);
  return {
    audioPath: outMp3,
    durationSec,
    providerUsed: 'external',
    voiceUsed: fileLabel,
    voiceLabel: `Áudio Externo (${fileLabel})`,
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
  outMp3: string,
  pitch?: string
): Promise<{ durationSec: number; words: VoiceWord[] }> {
  const txtPath = path.join(outputDir, 'edge_input.txt');
  const wordsJsonPath = path.join(outputDir, 'edge_words.json');
  fs.writeFileSync(txtPath, text, 'utf8');

  const ratePct = Math.round((speed - 1) * 100);
  const rateStr = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;

  const pyScript = `
import asyncio, json, sys, edge_tts
txt_p, mp3_p, out_p, voice, rate, pitch = sys.argv[1:7]
text = open(txt_p, 'r', encoding='utf-8').read().strip()
async def main():
    comm = edge_tts.Communicate(text, voice=voice, rate=rate, pitch=pitch, boundary='WordBoundary')
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
      await run(pyBin, ['-c', pyScript, txtPath, outMp3, wordsJsonPath, voiceName, rateStr, /^[+-]\d{1,3}Hz$/.test(String(pitch || '')) ? String(pitch) : '+0Hz'], {
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
 * Resolve as vozes disponíveis para o usuário escolher conscientemente (sem cascata automática).
 */
export async function listAvailableVoices(userId: string) {
  const [elevenKey, openaiKey] = await Promise.all([
    resolveElevenLabsKey(userId),
    resolveOpenAiKey(userId),
  ]);

  let elevenlabsVoices: ElevenLabsVoiceItem[] = [];
  let elevenlabsError: string | undefined;

  if (elevenKey) {
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': elevenKey },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        elevenlabsError = `ElevenLabs retornou HTTP ${res.status} ao listar vozes.`;
      } else {
        const json = await res.json();
        const raw = Array.isArray(json?.voices) ? json.voices : [];
        elevenlabsVoices = raw
          .map((v: any) => ({
            id: String(v.voice_id || ''),
            name: String(v.name || 'Sem nome'),
            category: String(v.category || 'premade'),
            previewUrl: v.preview_url ? String(v.preview_url) : undefined,
            labels: v.labels && typeof v.labels === 'object' ? v.labels : undefined,
          }))
          .filter((v: ElevenLabsVoiceItem) => Boolean(v.id))
          .sort((a: ElevenLabsVoiceItem, b: ElevenLabsVoiceItem) => {
            const rank = (c: string) => (c === 'cloned' ? 0 : c === 'generated' ? 1 : c === 'professional' ? 2 : 3);
            return rank(a.category) - rank(b.category) || a.name.localeCompare(b.name);
          });
      }
    } catch (err: any) {
      elevenlabsError = err?.message || 'Erro de rede ao consultar ElevenLabs.';
    }
  }

  return {
    elevenlabsConnected: Boolean(elevenKey),
    openaiConnected: Boolean(openaiKey),
    elevenlabsVoices,
    elevenlabsError,
    edgeVoices: EDGE_PTBR_VOICES,
    openaiVoices: OPENAI_VOICES,
  };
}

/**
 * Cria / clona uma voz na conta ElevenLabs do usuário a partir de um buffer de áudio.
 */
export async function cloneElevenLabsVoice(opts: {
  userId: string;
  name: string;
  description?: string;
  audioBuffer: Buffer;
  fileName?: string;
  mimeType?: string;
}): Promise<{ voiceId: string; name: string }> {
  const elevenKey = await resolveElevenLabsKey(opts.userId);
  if (!elevenKey) {
    throw new Error('Configure sua chave da ElevenLabs em /credentials antes de clonar uma voz.');
  }
  const cleanName = String(opts.name || '').trim().slice(0, 60);
  if (!cleanName) {
    throw new Error('Informe um nome para a nova voz ElevenLabs.');
  }
  if (!opts.audioBuffer?.length) {
    throw new Error('Envie um arquivo de áudio válido para clonar a voz na ElevenLabs.');
  }

  const form = new FormData();
  form.append('name', cleanName);
  form.append('description', String(opts.description || 'Voz clonada via Estúdio DarkTube').slice(0, 240));
  form.append(
    'files',
    new Blob([new Uint8Array(opts.audioBuffer)], { type: opts.mimeType || 'audio/mpeg' }),
    opts.fileName || 'amostra_voz.mp3'
  );

  const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: { 'xi-api-key': elevenKey },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Falha ao clonar voz na ElevenLabs (${res.status}): ${errText.slice(0, 220)}`);
  }
  const data = await res.json();
  if (!data?.voice_id) {
    throw new Error('ElevenLabs não retornou voice_id após a clonagem.');
  }
  return { voiceId: String(data.voice_id), name: cleanName };
}

/**
 * Executa exatamente o motor de voz explicitamente escolhido pelo usuário.
 * Sem cascata automática nem fallback silencioso entre provedores.
 */
export async function resolveVoiceWithTimestamps(input: ResolveVoiceInput): Promise<ResolveVoiceResult> {
  const chosenProvider = validateVoiceSelection({
    voiceProvider: input.voiceProvider,
    voiceId: input.voiceId,
    audioPathOrUrl: input.audioPathOrUrl,
  });

  fs.mkdirSync(input.outputDir, { recursive: true });
  const text = sanitizeSpokenText(input.scriptText);
  const gender: VoiceGender = input.voiceGender === 'female' ? 'female' : 'male';
  const lang = input.language || 'pt-BR';
  const langShort = lang.toLowerCase().slice(0, 2);
  const speed = Number(input.speed || 1.02);
  const outMp3 = path.join(input.outputDir, 'narracao.mp3');

  if (chosenProvider === 'external') {
    const openaiKey = await resolveOpenAiKey(input.userId);
    return await resolveExternalAudio(String(input.audioPathOrUrl), text, input.outputDir, openaiKey, lang);
  }

  if (chosenProvider === 'elevenlabs') {
    const elevenKey = await resolveElevenLabsKey(input.userId);
    if (!elevenKey) {
      throw new Error('Chave da ElevenLabs não configurada em /credentials. Não há fallback automático.');
    }
    const chosenVoice = String(input.voiceId || '').trim();
    const res = await synthesizeElevenLabs(text, elevenKey, chosenVoice, speed, outMp3);
    return {
      audioPath: outMp3,
      durationSec: res.durationSec,
      providerUsed: 'elevenlabs',
      voiceUsed: chosenVoice,
      voiceLabel: input.voiceName ? `ElevenLabs: ${input.voiceName}` : `ElevenLabs (${chosenVoice})`,
      words: res.words,
    };
  }

  if (chosenProvider === 'openai') {
    const openaiKey = await resolveOpenAiKey(input.userId);
    if (!openaiKey) {
      throw new Error('Chave da OpenAI não configurada em /credentials. Não há fallback automático.');
    }
    const chosenVoice = String(input.voiceId || OPENAI_DEFAULT_VOICES[gender]).trim();
    const res = await synthesizeOpenAiTts(text, openaiKey, chosenVoice, speed, lang, outMp3);
    return {
      audioPath: outMp3,
      durationSec: res.durationSec,
      providerUsed: 'openai',
      voiceUsed: chosenVoice,
      voiceLabel: `OpenAI (${chosenVoice})`,
      words: res.words,
    };
  }

  // Edge TTS explícito (PT-BR neural)
  const edgeVoice = String(input.voiceId || (EDGE_VOICE_MAP[langShort] || EDGE_VOICE_MAP.pt)[gender]).trim();
  const edgeOpt = EDGE_PTBR_VOICES.find((v) => v.id === edgeVoice);
  const edgeRes = await synthesizeEdgeTts(text, edgeVoice, speed, input.outputDir, outMp3, input.pitch);
  return {
    audioPath: outMp3,
    durationSec: edgeRes.durationSec,
    providerUsed: 'edge',
    voiceUsed: edgeVoice,
    voiceLabel: edgeOpt ? `Edge TTS: ${edgeOpt.name}` : `Edge TTS (${edgeVoice})`,
    words: edgeRes.words,
  };
}
