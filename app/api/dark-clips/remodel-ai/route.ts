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
    style = 'meme-ironic',
    userOpenAiKey,
    userGeminiKey,
    systemGeminiKey = process.env.GEMINI_API_KEY,
  } = params;

  const promptInstructions = `
Você é o Diretor Criativo e Especialista Máximo em Copywriting Viral, Retenção e Memes do DarkTube.
Sua missão é analisar os DADOS REAIS DESTE VÍDEO CAPTURADO e criar uma HEADLINE (Setup + Reação/Punchline) 100% INÉDITA E TOTALMENTE PERSONALIZADA para o acontecimento/história real deste clipe.

DADOS REAIS DO VÍDEO CAPTURADO:
- Transcrição / Legenda / Contexto Original do Vídeo: "${originalCaption || 'Vídeo de situação inusitada / meme viral'}"
- Criador do Vídeo: "${authorName || ''} (${authorHandle || ''})"
- Plataforma de Origem: "${platform || 'instagram'}"
- Direcionamento / Tema Desejado pelo Usuário: "${theme || 'Identificação e humor viral brasileiro'}"
- Estilo: "${style}"

DIRETRIZES FUNDAMENTAIS DE CRIAÇÃO (LEIA COM MÁXIMA ATENÇÃO):
1. PROIBIÇÃO ABSOLUTA DE TEMPLATES GENÉRICOS:
   - É ESTRITAMENTE PROIBIDO reutilizar frases prontas de exemplos ou templates (como "comprei um mic novo", "o desgraçado entrando na call", "quando eu digo que vou só em um lugar", etc.), a menos que o vídeo capturado trate literalmente disso.
2. CONTEXTUALIZAÇÃO TOTAL AO VÍDEO:
   - Identifique e extraia o tema e a ação CENTRAL descrita na legenda/contexto do vídeo (ex: se fala do Dinossauro do Google Chrome e internet caindo, crie ganchos sobre internet/desespero/jogo offline; se fala de trabalho, sobre CLT/chefe; se fala de finanças, sobre boletos/banco; se fala de academia, sobre treino/dor; se fala de games, sobre jogos; se fala de pets, sobre animais).
3. ESTRUTURA DO MEME (1080x1920):
   - "headline_main": Frase de abertura/setup curta, provocativa e impactante em MAIÚSCULAS (ex: "POV: ...", "QUANDO VOCÊ...", "O MOMENTO EXATO EM QUE...", "MEU CÉREBRO ÀS 3 DA MANHÃ:").
   - "headline_sub": Frase de reação / punchline / contexto que complementa com humor afiado o que acontece na cena.
   - "cta_text": Chamada para ação sutil e moderna (ex: "Siga ${authorHandle} para mais", "Marca quem faz isso").
   - "post_caption": Legenda magnética para o feed do Instagram/TikTok/Shorts, contextualizando a história e terminando com uma pergunta envolvente que force comentários.
   - "hashtags": Array com 8 a 12 hashtags específicas do nicho do vídeo e tendências no Brasil.

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
              content: 'Você é um assistente criativo e especialista em memes virais que analisa contextos reais de vídeos e responde apenas com objetos JSON estritos, sem repetir templates.'
            },
            { role: 'user', content: promptInstructions }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.85
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
        console.log('[Remodel AI] Usando Gemini AI para remodelagem...');
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
    const contextWords = (originalCaption || '').replace(/[^\w\s]/gi, '').split(/\s+/).filter((w: string) => w.length > 4);
    const keyword = contextWords[0] ? contextWords[0].toUpperCase() : 'ISSO';

    responseJson = {
      headline_main: `QUANDO VOCÊ MENOS ESPERA E ACONTECE ${keyword}:`,
      headline_sub: "A REAÇÃO DE QUEM NÃO TEM MAIS NADA A PERDER:",
      cta_text: `Siga ${authorHandle} para mais vídeos!`,
      post_caption: originalCaption ? `${originalCaption.slice(0, 120)}... O que você faria nessa situação? 😂👇` : "Marca aquele amigo que precisa ver isso 😂👇",
      hashtags: ["#memesbrasil", "#humor", "#engraçado", "#viral", "#reels", "#fyp", "#shorts"]
    };
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
