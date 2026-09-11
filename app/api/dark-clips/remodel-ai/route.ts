import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getUserApiKey } from '@/lib/database';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface RemodelAiParams {
  originalCaption?: string;
  authorName?: string;
  authorHandle?: string;
  platform?: string;
  theme?: string;
  style?: string;
  mainTextMode?: 'ai' | 'manual';
  mainTextFixed?: string;
  mainTextMaxWords?: number;
  subTextMode?: 'ai' | 'manual';
  subTextFixed?: string;
  subTextMaxWords?: number;
  ctaMode?: 'ai' | 'manual';
  fixedCta?: string;
  ctaMaxWords?: number;
  userOpenAiKey?: string | null;
  userGeminiKey?: string | null;
  systemGeminiKey?: string | null;
}

export interface RemodelAiResponse {
  headline_main: string;
  headline_sub: string;
  cta_text: string;
  post_caption: string;
  hashtags: string[];
}

export async function generateAiRemodelForClip(params: RemodelAiParams): Promise<RemodelAiResponse> {
  const {
    originalCaption = '',
    authorName = '',
    authorHandle = '@darkclips',
    platform = 'instagram',
    theme = '',
    style = 'viral-retention',
    mainTextMode = 'ai',
    mainTextFixed = '',
    mainTextMaxWords = 8,
    subTextMode = 'ai',
    subTextFixed = '',
    subTextMaxWords = 6,
    ctaMode = 'manual',
    fixedCta = '',
    ctaMaxWords = 6,
    userOpenAiKey,
    userGeminiKey,
    systemGeminiKey = process.env.GEMINI_API_KEY,
  } = params;

  const promptInstructions = `
Você é o Diretor Criativo e Especialista em Copywriting Viral do DarkTube, focado em transformar vídeos em clipes de altíssima retenção para Instagram Reels, TikTok e YouTube Shorts.

SUA MISSÃO FUNDAMENTAL É A FIDELIDADE TOTAL AO CONTEÚDO REAL DO VÍDEO E À SUA LEGENDA ORIGINAL:
Você DEVE ler com atenção a legenda e transcrição original do vídeo e entender exatamente do que ele se trata:
- Se for sobre celebridades, atrizes ou comparação de patrimônio/carreira (ex: Sadie Sink vs Zendaya): extraia as entidades reais e crie uma headline factual e magnética sobre a comparação e evolução das carreiras (Ex.: "SADIE SINK VS ZENDAYA", "A EVOLUÇÃO DAS DUAS MAIORES ESTRELAS JOVENS" ou "QUEM ACUMULOU A MAIOR FORTUNA?").
- Se for sobre dublagem de séries/animes (ex: Avatar A Lenda de Aang): crie ganchos diretos sobre a atuação e dublagem (Ex.: "DUBLAGEM BRASILEIRA VS AMERICANA", "A VERSÃO BRASILEIRA FICOU MUITO MELHOR?").
- Se for sobre animes/personagens e lutas (ex: Toph dobradora de terra): crie ganchos sobre a personagem e o feito (Ex.: "A MAIOR DOBRADORA DE TERRA", "ELA CONTINUA SENDO A MAIS PODEROSA").
- Se for finanças, curiosidades científicas, esportes, notícias, fatos ou humor: crie ganchos 100% fiéis ao tema específico tratado.
- PROIBIÇÃO ABSOLUTA: NUNCA invente frases genéricas desconexas como "Quando a vida te surpreende", "Quando eu vou em um lugar", "Comprei um mic novo", etc., a não ser que o vídeo trate literalmente disso!

DADOS REAIS DO VÍDEO CAPTURADO:
- Transcrição / Legenda / Contexto Original do Vídeo: "${originalCaption || 'Vídeo viral em formato vertical'}"
- Criador do Vídeo: "${authorName || ''} (${authorHandle || ''})"
- Plataforma de Origem: "${platform || 'instagram'}"
${theme ? `- Direcionamento Específico Solicitado: "${theme}"` : ''}

DIRETRIZES DE CRIAÇÃO E LIMITES DE PALAVRAS POR CAMPO:
1. "headline_main": ${mainTextMode === 'manual' && mainTextFixed ? `Copie exatamente o texto fixo fornecido: "${mainTextFixed}"` : `Frase de abertura/setup curta em MAIÚSCULAS resumindo o tema central com RIGOROSO limite de NO MÁXIMO ${mainTextMaxWords || 8} PALAVRAS.`}
2. "headline_sub": ${subTextMode === 'manual' && subTextFixed ? `Copie exatamente o texto fixo fornecido: "${subTextFixed}"` : `Frase de reação / pergunta / curiosidade complementar em MAIÚSCULAS com RIGOROSO limite de NO MÁXIMO ${subTextMaxWords || 6} PALAVRAS.`}
3. "cta_text": ${ctaMode === 'manual' && fixedCta ? `Copie exatamente o CTA fixo fornecido: "${fixedCta}"` : `Chamada para ação moderna de rodapé respeitando o limite de NO MÁXIMO ${ctaMaxWords || 6} PALAVRAS.`}
4. "post_caption": Legenda rica e contextualizada para o feed do Instagram/TikTok/Shorts, resumindo os acontecimentos ou fatos citados na legenda original e terminando com uma pergunta envolvente para comentários.
5. "hashtags": Array com 8 a 12 hashtags específicas do tema real e nicho do vídeo.

RETORNE EXCLUSIVAMENTE UM JSON VÁLIDO no seguinte formato (sem blocos markdown envolventes):
{
  "headline_main": "...",
  "headline_sub": "...",
  "cta_text": "...",
  "post_caption": "...",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}
`.trim();

  let responseJson: RemodelAiResponse | null = null;

  // ── 1. Try OpenAI if user has API key ──
  if (userOpenAiKey && userOpenAiKey.trim().length > 10) {
    try {
      console.log('[Remodel AI] Usando chave OpenAI (GPT-4o) do usuário...');
      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userOpenAiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente criativo e especialista em copywriting de vídeos virais que analisa contextos reais e responde apenas com objetos JSON estritos, fiel ao conteúdo e respeitando limites exatos de palavras por campo.'
            },
            { role: 'user', content: promptInstructions }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      });

      if (gptRes.ok) {
        const data = await gptRes.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          responseJson = JSON.parse(content);
        }
      } else {
        console.warn('[Remodel AI] OpenAI error:', await gptRes.text());
      }
    } catch (openAiErr) {
      console.warn('[Remodel AI] OpenAI execution failed, falling back to Gemini:', openAiErr);
    }
  }

  // ── 2. Fallback to Gemini ──
  if (!responseJson) {
    const apiKey = userGeminiKey || systemGeminiKey;
    if (apiKey) {
      try {
        console.log('[Remodel AI] Usando Gemini AI para remodelagem fiel ao contexto...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(promptInstructions);
        const text = result.response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        responseJson = JSON.parse(cleanJson);
      } catch (gemErr) {
        console.warn('[Remodel AI] Gemini error:', gemErr);
      }
    }
  }

  // ── 3. Dynamic Contextual Fallback if all AI fails ──
  if (!responseJson) {
    const cleaned = (originalCaption || '').replace(/[^\w\s]/gi, ' ').trim();
    const words = cleaned.split(/\s+/).filter((w: string) => w.length >= 3);
    const primaryTopic = words.slice(0, 5).join(' ').toUpperCase() || 'VEJA ESSE VÍDEO:';

    responseJson = {
      headline_main: mainTextMode === 'manual' && mainTextFixed ? mainTextFixed : primaryTopic,
      headline_sub: subTextMode === 'manual' && subTextFixed ? subTextFixed : "CONFIRA ESSA HISTÓRIA:",
      cta_text: (ctaMode === 'manual' || fixedCta) && fixedCta ? fixedCta.trim() : `Siga ${authorHandle} para mais vídeos!`,
      post_caption: originalCaption ? `${originalCaption.slice(0, 160)}... O que você achou disso? Comente abaixo! 👇` : "Deixe sua opinião nos comentários! 👇",
      hashtags: ["#viral", "#curiosidades", "#reels", "#fyp", "#shorts"]
    };
  }

  // Overrides manuais garantidos
  if (responseJson) {
    if (mainTextMode === 'manual' && mainTextFixed && mainTextFixed.trim().length > 0) {
      responseJson.headline_main = mainTextFixed.trim();
    }
    if (subTextMode === 'manual' && subTextFixed && subTextFixed.trim().length > 0) {
      responseJson.headline_sub = subTextFixed.trim();
    }
    if ((ctaMode === 'manual' || fixedCta) && fixedCta && fixedCta.trim().length > 0) {
      responseJson.cta_text = fixedCta.trim();
    }
  }

  return responseJson;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      originalCaption = '',
      authorName = '',
      authorHandle = '@darkclips',
      platform = 'instagram',
      theme = '',
      style = 'meme-ironic',
      mainTextMode = 'ai',
      mainTextFixed = '',
      mainTextMaxWords = 8,
      subTextMode = 'ai',
      subTextFixed = '',
      subTextMaxWords = 6,
      ctaMode = 'manual',
      fixedCta = '',
      ctaMaxWords = 6,
    } = body;

    const userOpenAiKey = user ? await getUserApiKey(user.id, 'openai') : null;
    const userGeminiKey = user ? await getUserApiKey(user.id, 'gemini') : null;

    const responseJson = await generateAiRemodelForClip({
      originalCaption,
      authorName,
      authorHandle,
      platform,
      theme,
      style,
      mainTextMode,
      mainTextFixed,
      mainTextMaxWords,
      subTextMode,
      subTextFixed,
      subTextMaxWords,
      ctaMode,
      fixedCta,
      ctaMaxWords,
      userOpenAiKey,
      userGeminiKey,
    });

    return NextResponse.json({
      success: true,
      data: responseJson
    });
  } catch (err: any) {
    console.error('Error in remodel-ai:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
