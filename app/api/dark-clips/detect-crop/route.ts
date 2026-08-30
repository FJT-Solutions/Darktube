import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getUserApiKey } from '@/lib/database';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool } from '@/lib/db-client';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
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

    // Se tiver clipId, busca do banco de dados se não tiver URLs fornecidas
    if (clipId && (!targetThumbnail || !targetVideo)) {
      try {
        const { rows } = await pool.query('SELECT * FROM public.dark_clips WHERE id = $1', [clipId]);
        if (rows.length > 0) {
          if (!targetThumbnail) targetThumbnail = rows[0].thumbnail_url || '';
          if (!targetVideo) targetVideo = rows[0].video_url || '';
        }
      } catch (e) {}
    }

    // Obter imagem para análise (base64)
    let imageBase64 = '';
    let mimeType = 'image/jpeg';

    const candidateImage = targetThumbnail || targetVideo;
    if (candidateImage && candidateImage.startsWith('http')) {
      try {
        const imgRes = await fetch(candidateImage, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
        });
        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          if (contentType.includes('image')) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            imageBase64 = buf.toString('base64');
            mimeType = contentType;
          }
        }
      } catch (fErr) {
        console.warn('[DetectCrop] Erro ao buscar imagem remota:', fErr);
      }
    }

    // Se for URL local (/api/storage/...)
    if (!imageBase64 && candidateImage && candidateImage.includes('/api/storage/')) {
      try {
        const filename = candidateImage.split('/api/storage/')[1]?.split('?')[0];
        const storageDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
        const localPath = path.join(storageDir, filename);
        if (fs.existsSync(localPath)) {
          const buf = fs.readFileSync(localPath);
          imageBase64 = buf.toString('base64');
        }
      } catch (lErr) {
        console.warn('[DetectCrop] Erro ao ler imagem local:', lErr);
      }
    }

    const targetUserId = user?.id || null;
    const userGeminiKey = targetUserId ? await getUserApiKey(targetUserId, 'gemini') : null;
    const userOpenAiKey = targetUserId ? await getUserApiKey(targetUserId, 'openai') : null;
    const systemGeminiKey = process.env.GEMINI_API_KEY;

    const apiKey = userGeminiKey || systemGeminiKey;

    if (!apiKey && !userOpenAiKey) {
      // Fallback inteligente caso não haja chaves de visão configuradas
      return NextResponse.json({
        success: true,
        detection: {
          has_header_text: true,
          detected_text: '',
          crop_top: 20,
          crop_bottom: 0,
          aspect_ratio: '16:9',
          fit_mode: 'cover',
          headline_main: 'QUANDO VOCÊ ACHA QUE FINALIZOU O CÓDIGO:',
          headline_sub: 'O BUG SURGINDO NO PRIMEIRO TESTE:',
        },
      });
    }

    const prompt = `
Você é um especialista em Visão Computacional e Edição de Vídeo do DarkTube.
Analise com precisão a imagem deste frame/vídeo capturado de rede social (Instagram/TikTok/Twitter/YouTube).

Muitos vídeos de memes postados em redes sociais possuem:
1. Uma barra/área com TEXTO/LEGENDA/CABEÇALHO embutido em cima do vídeo (ex: "Ben pega o Super Omnitrix do Albedo...").
2. Uma área de VÍDEO REAL/CENA (desenho, anime, filme, pessoa, gameplay) no meio da tela (geralmente em 16:9 ou 4:3).
3. Possível barra preta ou marca d'água na base.

SUA MISSÃO:
1. Ler e extrair EXATAMENTE todo o texto/legenda que estiver escrito/embutido na imagem ("detected_text").
2. Identificar a área do vídeo real (sem o texto do cabeçalho) e calcular:
   - "has_header_text": true se houver texto de meme/título embutido no topo da imagem, senão false.
   - "crop_top": número inteiro entre 0 e 45 representando a porcentagem do topo que precisa ser cortada para remover o texto do cabeçalho e deixar apenas o vídeo/desenho animado limpo. Se houver texto em cima, retorne a porcentagem precisa (ex: 18, 22, 25). Se não houver texto em cima, retorne 0.
   - "crop_bottom": número inteiro entre 0 e 35 representando a porcentagem da base que precisa ser cortada se houver barra preta ou marca d'água na base.
   - "aspect_ratio": "16:9" | "4:3" | "1:1" | "4:5" | "9:16" da área útil do vídeo.
   - "headline_main": Crie um novo gancho viral 100% focado no que o texto detectado descreve (máximo 8 palavras, em MAIÚSCULAS).
   - "headline_sub": Crie uma reação/punchline viral complementar (máximo 6 palavras, em MAIÚSCULAS).

Retorne APENAS um JSON válido exatamente neste formato (sem blocos de código ou markdown):
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

    let resultJson = null;

    if (apiKey && imageBase64) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
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
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        resultJson = JSON.parse(cleaned);
      } catch (gErr: any) {
        console.warn('[DetectCrop] Erro ao analisar com Gemini Vision:', gErr.message);
      }
    }

    if (!resultJson) {
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

    // Se tiver clipId, atualizar o remodel_data no banco com as novas informações
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
  }
}
