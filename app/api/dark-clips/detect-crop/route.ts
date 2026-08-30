import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getUserApiKey } from '@/lib/database';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool } from '@/lib/db-client';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

/**
 * Extrai um frame HD (JPEG) do vídeo usando FFmpeg para análise multimodal da LLM
 */
async function extractFrameFromVideo(videoSource: string): Promise<string | null> {
  const tmpFrame = path.join(os.tmpdir(), `detect_frame_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
  
  try {
    console.log(`[DetectCrop FFmpeg] 🎞️ Extraindo frame de análise de: ${videoSource.slice(0, 80)}...`);
    await execFilePromise(
      'ffmpeg',
      [
        '-ss', '00:00:01.000',
        '-i', videoSource,
        '-frames:v', '1',
        '-q:v', '2',
        '-vf', 'scale=1280:-1',
        tmpFrame,
        '-y',
      ],
      { timeout: 30000 }
    );

    if (fs.existsSync(tmpFrame) && fs.statSync(tmpFrame).size > 1000) {
      console.log(`[DetectCrop FFmpeg] ✅ Frame extraído com sucesso (${fs.statSync(tmpFrame).size} bytes)`);
      return tmpFrame;
    }
  } catch (err: any) {
    console.warn('[DetectCrop FFmpeg] Aviso ao extrair a 1s, tentando frame 0:', err?.message);
    try {
      await execFilePromise(
        'ffmpeg',
        [
          '-i', videoSource,
          '-frames:v', '1',
          '-q:v', '2',
          tmpFrame,
          '-y',
        ],
        { timeout: 30000 }
      );
      if (fs.existsSync(tmpFrame) && fs.statSync(tmpFrame).size > 1000) {
        return tmpFrame;
      }
    } catch (e2: any) {
      console.error('[DetectCrop FFmpeg] Falha crítica ao extrair frame:', e2?.message);
    }
  }
  return null;
}

export async function POST(req: Request) {
  let tmpFrameToCleanup: string | null = null;
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      clipId,
      thumbnailUrl,
      videoUrl,
    } = body;

    let targetThumbnail = thumbnailUrl || '';
    let targetVideo = videoUrl || '';

    // Se tiver clipId, busca no banco
    if (clipId && (!targetThumbnail || !targetVideo)) {
      try {
        const { rows } = await pool.query('SELECT * FROM public.dark_clips WHERE id = $1', [clipId]);
        if (rows.length > 0) {
          if (!targetThumbnail) targetThumbnail = rows[0].thumbnail_url || '';
          if (!targetVideo) targetVideo = rows[0].video_url || '';
        }
      } catch (e) {}
    }

    let imageBase64 = '';
    let mimeType = 'image/jpeg';

    // ── 1. Localizar arquivo local ou remoto ──
    const candidateMedia = targetThumbnail || targetVideo || '';
    let resolvedLocalPath = '';

    if (candidateMedia.includes('/api/storage/')) {
      const filename = candidateMedia.split('/api/storage/')[1]?.split('?')[0];
      const storageDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
      const testPath = path.join(storageDir, filename);
      if (fs.existsSync(testPath)) {
        resolvedLocalPath = testPath;
      }
    }

    // ── 2. Se for vídeo ou URL sem imagem estática direta, extrai frame real com FFmpeg ──
    const isVideoFile =
      resolvedLocalPath.endsWith('.mp4') ||
      resolvedLocalPath.endsWith('.webm') ||
      candidateMedia.endsWith('.mp4') ||
      candidateMedia.includes('/api/storage/clip_') ||
      candidateMedia.includes('video');

    if (isVideoFile) {
      const sourceForFfmpeg = resolvedLocalPath || candidateMedia;
      const extractedPath = await extractFrameFromVideo(sourceForFfmpeg);
      if (extractedPath) {
        tmpFrameToCleanup = extractedPath;
        const buf = fs.readFileSync(extractedPath);
        imageBase64 = buf.toString('base64');
        mimeType = 'image/jpeg';
      }
    } else if (resolvedLocalPath && fs.existsSync(resolvedLocalPath)) {
      // É uma imagem estática local
      const buf = fs.readFileSync(resolvedLocalPath);
      imageBase64 = buf.toString('base64');
      mimeType = resolvedLocalPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    } else if (candidateMedia.startsWith('http')) {
      // Tenta baixar imagem remota
      try {
        const imgRes = await fetch(candidateMedia, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') || '';
          if (contentType.includes('image')) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            imageBase64 = buf.toString('base64');
            mimeType = contentType;
          } else if (contentType.includes('video')) {
            // É stream de vídeo remoto -> extrair frame
            const extractedPath = await extractFrameFromVideo(candidateMedia);
            if (extractedPath) {
              tmpFrameToCleanup = extractedPath;
              const buf = fs.readFileSync(extractedPath);
              imageBase64 = buf.toString('base64');
              mimeType = 'image/jpeg';
            }
          }
        }
      } catch (fErr) {
        console.warn('[DetectCrop] Erro ao buscar mídia remota:', fErr);
      }
    }

    const targetUserId = user?.id || null;
    const userGeminiKey = targetUserId ? await getUserApiKey(targetUserId, 'gemini') : null;
    const userOpenAiKey = targetUserId ? await getUserApiKey(targetUserId, 'openai') : null;
    const systemGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const systemOpenAiKey = process.env.OPENAI_API_KEY;

    const geminiKey = userGeminiKey || systemGeminiKey;
    const openAiKey = userOpenAiKey || systemOpenAiKey;

    const prompt = `
Você é um especialista em Visão Computacional e Edição de Vídeo do DarkTube.
Analise a imagem deste FRAME REAL capturado de um vídeo de rede social (Instagram/TikTok/YouTube/X).

Muitos vídeos de memes postados em redes sociais possuem:
1. Uma barra ou área com TEXTO/LEGENDA/CABEÇALHO embutido em cima do vídeo (ex: "Ben pega o Super Omnitrix do Albedo...").
2. Uma área de VÍDEO REAL/CENA (desenho, anime, filme, pessoa, gameplay) no meio da tela (geralmente em 16:9 ou 4:3).
3. Possível barra preta ou marca d'água na base.

SUA MISSÃO OBRIGATÓRIA:
1. LER E EXTRAIR ("detected_text"): Transcreva com precisão TODO o texto/legenda que estiver escrito/embutido na imagem do frame.
2. Identificar a área do vídeo real (sem o texto do cabeçalho) e calcular:
   - "has_header_text": true se houver texto de meme/título embutido no topo da imagem, senão false.
   - "crop_top": número inteiro entre 0 e 45 representando a porcentagem EXATA do topo da imagem que é ocupada pelo texto/barra superior e precisa ser cortada para deixar apenas a animação/vídeo limpo. Se houver texto em cima, retorne a porcentagem precisa (ex: 18, 22, 25). Se não houver texto no topo, retorne 0.
   - "crop_bottom": número inteiro entre 0 e 35 representando a porcentagem da base que precisa ser cortada se houver barra preta ou marca d'água na base.
   - "aspect_ratio": "16:9" | "4:3" | "1:1" | "4:5" | "9:16" da área útil do vídeo.
   - "headline_main": Crie um novo gancho viral para o DarkTube 100% focado no que o texto detectado descreve (máximo 8 palavras, em MAIÚSCULAS).
   - "headline_sub": Crie uma reação/punchline viral complementar (máximo 6 palavras, em MAIÚSCULAS).

Retorne EXCLUSIVAMENTE um JSON válido no formato abaixo (sem blocos de código markdown ou texto extra):
{
  "has_header_text": boolean,
  "detected_text": string,
  "crop_top": number,
  "crop_bottom": number,
  "aspect_ratio": string,
  "headline_main": string,
  "headline_sub": string
}
`.trim();

    let resultJson: any = null;

    // ── 3. Chamada Real para Gemini 2.5 Flash Vision ──
    if (geminiKey && imageBase64) {
      try {
        console.log('[DetectCrop LLM Vision] 🧠 Enviando frame real para Gemini 2.5 Flash Vision...');
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const resp = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType,
            },
          },
        ]);

        const rawText = resp.response.text();
        console.log('[DetectCrop LLM Vision] 📥 Resposta bruta do Gemini:', rawText);
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        resultJson = JSON.parse(cleaned);
        console.log('[DetectCrop LLM Vision] ✅ JSON estruturado pelo Gemini:', resultJson);
      } catch (gErr: any) {
        console.warn('[DetectCrop] Erro ao analisar com Gemini Vision:', gErr.message);
      }
    }

    // ── 4. Fallback para OpenAI GPT-4o Vision se Gemini falhar ou se usuário preferir OpenAI ──
    if (!resultJson && openAiKey && imageBase64) {
      try {
        console.log('[DetectCrop LLM Vision] 🧠 Enviando frame real para OpenAI GPT-4o Vision...');
        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${imageBase64}`,
                    },
                  },
                ],
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (gptRes.ok) {
          const gptData = await gptRes.json();
          const content = gptData.choices?.[0]?.message?.content;
          if (content) {
            resultJson = JSON.parse(content);
            console.log('[DetectCrop LLM Vision] ✅ JSON estruturado pelo GPT-4o:', resultJson);
          }
        }
      } catch (oErr: any) {
        console.warn('[DetectCrop] Erro com OpenAI Vision:', oErr.message);
      }
    }

    if (!resultJson) {
      console.warn('[DetectCrop LLM Vision] Nenhuma LLM Vision respondeu, usando fallback.');
      resultJson = {
        has_header_text: true,
        detected_text: '',
        crop_top: 20,
        crop_bottom: 0,
        aspect_ratio: '16:9',
        headline_main: 'MOMENTO ÉPICO QUE NINGUÉM ESPERAVA!',
        headline_sub: 'A VIRADA FOI SURPREENDENTE!',
      };
    }

    // Se tiver clipId, atualiza o banco
    if (clipId && resultJson.headline_main) {
      try {
        await pool.query(
          `UPDATE public.dark_clips SET 
            remodel_data = jsonb_set(
              COALESCE(remodel_data::jsonb, '{}'::jsonb),
              '{detected_crop}',
              $1::jsonb
            )
           WHERE id = $2`,
          [JSON.stringify(resultJson), clipId]
        );
      } catch (dbErr) {}
    }

    return NextResponse.json({
      success: true,
      detection: resultJson,
    });
  } catch (err: any) {
    console.error('[DetectCrop] Erro geral na rota:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (tmpFrameToCleanup && fs.existsSync(tmpFrameToCleanup)) {
      try {
        fs.unlinkSync(tmpFrameToCleanup);
      } catch {}
    }
  }
}
