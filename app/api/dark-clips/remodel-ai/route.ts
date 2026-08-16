import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getUserApiKey } from '@/lib/database';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      originalCaption = '',
      theme = '',
      authorHandle = '@darkclips',
      style = 'meme-ironic', // 'meme-ironic' | 'relatable' | 'absurd' | 'pov'
    } = body;

    const userOpenAiKey = user ? await getUserApiKey(user.id, 'openai') : null;
    const userGeminiKey = user ? await getUserApiKey(user.id, 'gemini') : null;
    const systemGeminiKey = process.env.GEMINI_API_KEY;

    const promptInstructions = `
Você é o Diretor Criativo e Especialista em Memes Virais do DarkTube.
Sua missão é remodelar um vídeo/clipe viral gerando uma HEADLINE DE ALTO IMPACTO (Setup + Punchline), um CTA de rodapé e uma legenda de postagem com hashtags.

DADOS DE ENTRADA:
- Legenda/Contexto Original: "${originalCaption || 'Vídeo engraçado / meme de situação cotidiana'}"
- Tema/Instrução Adicional do Usuário: "${theme || 'Humor de identificação moderno brasileiro'}"
- Arroba da Página do Usuário: "${authorHandle}"
- Estilo: "${style}"

REGRAS OBRIGATÓRIAS:
1. "headline_main": Frase de setup (ex: "MEU AMIGO: 'COMPREI UM MIC NOVO, MANO.'", "QUANDO EU DIGO QUE VOU SÓ EM UM LUGAR:", "POV: VOCÊ TENTANDO DISFARÇAR NO TRABALHO:"). Deve ser curta, chamativa e em MAIÚSCULAS.
2. "headline_sub": Frase de reação / punchline (ex: "O DESGRAÇADO ENTRANDO NA CALL:", "EU 10 MINUTOS DEPOIS:", "MINHA REAÇÃO:").
3. "cta_text": Chamada para ação sutil de rodapé (ex: "Sigam ${authorHandle} para mais memes!", "*qualquer semelhança é mera coincidência").
4. "post_caption": Legenda envolvente para o post no Instagram/TikTok/Shorts com gancho inicial que incentive comentários.
5. "hashtags": Array com 8 a 12 hashtags virais em alta no Brasil.

RETORNE EXCLUSIVAMENTE UM JSON VÁLIDO no seguinte formato (sem formatação markdown envolvente):
{
  "headline_main": "...",
  "headline_sub": "...",
  "cta_text": "...",
  "post_caption": "...",
  "hashtags": ["#meme", "#humor", "#viral"]
}
`.trim();

    let responseJson = null;

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
              { role: 'system', content: 'Você é um assistente criativo que responde apenas com objetos JSON estritos.' },
              { role: 'user', content: promptInstructions }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8
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
        console.log('[Remodel AI] Usando Gemini AI para remodelagem...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(promptInstructions);
        const text = result.response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        responseJson = JSON.parse(cleanJson);
      }
    }

    // ── 3. Hardcoded Fallback if all AI fails ──
    if (!responseJson) {
      responseJson = {
        headline_main: "MEU AMIGO: \"COMPREI UM MIC NOVO, MANO.\"",
        headline_sub: "O DESGRAÇADO ENTRANDO NA CALL:",
        cta_text: `Sigam ${authorHandle} para mais vídeos!`,
        post_caption: "Marca aquele amigo que faz exatamente isso 😂👇",
        hashtags: ["#memesbrasil", "#humor", "#engraçado", "#viral", "#reels", "#fyp", "#shorts"]
      };
    }

    return NextResponse.json({
      success: true,
      data: responseJson
    });
  } catch (err: any) {
    console.error('Error in remodel-ai:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
