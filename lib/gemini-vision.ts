import { GoogleGenerativeAI } from "@google/generative-ai";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";


export interface RemodelingTemplate {
    feasibility: 'Alta' | 'Média' | 'Baixa';
    style: string;
    visualStyle: 'Cinematográfico' | 'Dinâmico' | 'Estoque/IA' | 'Vlog/Real' | 'Misto';
    pacing: 'Lento' | 'Equilibrado' | 'Frenético';
    productionMethod: 'IA Gerativa' | 'Banco de Estoque' | 'Edição Manual' | 'Misto';
    confidence: number;
    justification: string;
    tools: string[];
    summary: string;
    remodelingTip: string;
    remodeling_template: {
        script_base: string[];
        visual_directives: string;
        composition_rules: string;
        thumbnail_prompt: string;
        music_style: string;
        video_style: string;
        ai_stack: {
            image: string;
            video: string;
            voice: string;
            music: string;
        };
        target_audience_psychology: string;
    };
}

export const GeminiVisionService = {
    /**
     * FREE TIER OPTIMIZED: Sends only inline frames (base64) + transcript text.
     * Never uploads video/audio to the File API to avoid 429 quota errors.
     * pytubefix handles the download; frames are extracted locally by ffmpeg.
     */
    async analyzeVideo(
        params: { videoPath?: string; audioPath?: string; framePaths?: string[]; transcript?: string },
        customApiKey?: string
    ): Promise<RemodelingTemplate> {
        const apiKey = customApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

        // Use v1 (stable) endpoint — same as n8n uses.
        // v1beta has stricter free_tier_input_token_count quotas causing 429.
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = "gemini-2.5-flash";

        console.log(`[GeminiVisionService] Analyzing with ${modelName} (v1 endpoint, Free Tier safe)...`);

        const model = genAI.getGenerativeModel(
            { model: modelName },
            { apiVersion: "v1" }
        );



        const contentParts: any[] = [];

        // 1. Transcript text — nearly zero token cost
        if (params.transcript && params.transcript.trim().length > 0) {
            contentParts.push({ text: `[TRANSCRIÇÃO DO VÍDEO]:\n${params.transcript.slice(0, 8000)}` });
        }

        // 2. Frames inline (base64) — resized to 320x180 to minimize token cost
        const frames = (params.framePaths ?? []).filter(f => fs.existsSync(f)).slice(0, 3);
        for (const f of frames) {
            const tmpFrame = path.join(os.tmpdir(), `gframe_${Date.now()}_${path.basename(f)}`);
            try {
                // Resize to 320x180 (very low token cost) before base64 encoding
                execSync(`ffmpeg -i "${f}" -vf "scale=320:180" -q:v 5 "${tmpFrame}" -y`, { stdio: 'pipe' });
                const imageData = fs.existsSync(tmpFrame) ? tmpFrame : f;
                contentParts.push({
                    inlineData: {
                        data: fs.readFileSync(imageData).toString("base64"),
                        mimeType: "image/jpeg"
                    }
                });
            } catch {
                // Fallback: use original frame if resize fails
                contentParts.push({
                    inlineData: {
                        data: fs.readFileSync(f).toString("base64"),
                        mimeType: "image/jpeg"
                    }
                });
            } finally {
                if (fs.existsSync(tmpFrame)) fs.unlinkSync(tmpFrame);
            }
        }

        if (contentParts.length === 0) {
            throw new Error("Nenhuma mídia disponível para análise (sem frames nem transcrição).");
        }

        contentParts.push({ text: this.getPrompt() });

        try {
            const result = await model.generateContent(contentParts);
            const raw = result.response.text();
            const jsonStr = raw.includes("```json")
                ? raw.split("```json")[1].split("```")[0].trim()
                : raw.trim();
            return JSON.parse(jsonStr) as RemodelingTemplate;
        } catch (error: any) {
            if (error?.message?.includes("429")) {
                console.warn("[GeminiVisionService] 429 received, retrying in 62s...");
                await new Promise(r => setTimeout(r, 62000));
                const retry = await model.generateContent(contentParts);
                const raw2 = retry.response.text();
                const json2 = raw2.includes("```json") ? raw2.split("```json")[1].split("```")[0].trim() : raw2.trim();
                return JSON.parse(json2) as RemodelingTemplate;
            }
            throw error;
        }
    },

    getPrompt() {
        return `Você é um engenheiro de remodelagem de conteúdo de vídeo de elite.
Sua missão: analisar este vídeo QUADRO A QUADRO e criar um MOLDE DE REMODELAGEM IDÊNTICO em estrutura.

REGRAS ABSOLUTAS:
1. O molde deve ESPELHAR a estrutura exata do vídeo original — mesma ordem de cenas, mesmos tempos, mesmas transições.
2. Cada cena deve ter TIMESTAMP correspondente ao original (ex: 0:00-0:05, 0:05-0:15, etc.)
3. O script_base NÃO é genérico. É uma lista DETALHADA de cenas com tempo, visual e narração moldados no original.
4. Se o vídeo tem 10 cenas, seu molde tem 10 cenas. Se tem 25 cenas, seu molde tem 25 cenas.
5. A thumbnail_prompt deve descrever EXATAMENTE a composição visual que funcionaria como thumbnail, baseada no que torna este vídeo atrativo.

ANÁLISE OBRIGATÓRIA:
- Observe cada frame fornecido como representante de um trecho do vídeo
- Identifique a narrativa: como o vídeo ABRE (gancho), DESENVOLVE (meio) e FECHA (CTA/encerramento)
- Note transições, cortes, efeitos visuais, texto na tela, zooms
- Analise o ritmo: cortes rápidos? Planos longos? Alternância?
- Identifique a psicologia: que emoção cada parte está tentando gerar?

RESPONDA APENAS COM O JSON ABAIXO (sem comentários, sem markdown):
{
  "feasibility": "Alta | Média | Baixa",
  "style": "descrição detalhada do estilo/nicho do vídeo",
  "visualStyle": "Cinematográfico | Dinâmico | Estoque/IA | Vlog/Real | Misto",
  "pacing": "Lento | Equilibrado | Frenético",
  "productionMethod": "IA Gerativa | Banco de Estoque | Edição Manual | Misto",
  "confidence": 0.85,
  "justification": "análise técnica detalhada do vídeo e por que é remodelável",
  "tools": ["ferramentas necessárias para remodelar"],
  "summary": "resumo em 2 frases do vídeo original",
  "remodelingTip": "dica prática e específica para remodelar este vídeo com sucesso",
  "remodeling_template": {
    "script_base": [
      "**0:00-0:05 | GANCHO:** [Descreva EXATAMENTE o que acontece visual e narrativamente neste trecho. Ex: 'Plano aéreo de drone mostrando terreno vazio. Texto na tela: ANTES. Música tensa crescendo. Narração: Ninguém acreditava que isso era possível.']",
      "**0:05-0:15 | APRESENTAÇÃO DO PROBLEMA:** [Descreva a cena com o mesmo nível de detalhe - visual, texto, narração, música, emoção]",
      "**0:15-0:30 | DESENVOLVIMENTO 1:** [Continue cena a cena, espelhando cada trecho do vídeo original]",
      "**0:30-0:45 | DESENVOLVIMENTO 2:** [Cada entrada deve ter timestamp + visual + narração + emoção alvo]",
      "... continue para CADA trecho do vídeo, sem pular nenhum momento ...",
      "**ÚLTIMO TRECHO | CTA/ENCERRAMENTO:** [Como o vídeo fecha - visual final, narração final, call to action]"
    ],
    "visual_directives": "diretrizes visuais completas: paleta de cores, tipo de footage, estilo de edição, efeitos usados, transições entre cenas",
    "composition_rules": "regras de composição: enquadramento, texto overlay, motion graphics, razão de aspecto, ritmo de cortes (ex: corte a cada X segundos)",
    "thumbnail_prompt": "Prompt DETALHADO para gerar a thumbnail: descreva composição, cores dominantes, elementos visuais, texto overlay se houver, contraste, expressão facial se aplicável. Deve causar o mesmo impacto do original.",
    "music_style": "estilo musical exato: gênero, BPM aproximado, instrumentos, mood. Ex: 'Música cinematográfica épica, 120 BPM, orquestra com percussão pesada, mood inspiracional crescendo'",
    "video_style": "estilo de vídeo detalhado: tipo de footage, movimento de câmera, color grading, velocidade, estilo de transição",
    "ai_stack": {
      "image": "ferramenta recomendada para imagens (flux/midjourney/dalle)",
      "video": "ferramenta recomendada para vídeo (kling/runway/pika)",
      "voice": "ferramenta recomendada para voz (elevenlabs/murf/speechify)",
      "music": "ferramenta recomendada para música (suno/udio/musicfy)"
    },
    "target_audience_psychology": "análise psicológica do público-alvo: que emoção o vídeo explora, que gatilho mental usa, por que as pessoas clicam e assistem até o final"
  }
}

IMPORTANTE: O script_base deve ter PELO MENOS 6 entradas com timestamps. Quanto mais detalhado, melhor. Cada entrada deve ser um parágrafo completo descrevendo visual + narração + emoção daquele trecho específico.`;
    }
};
