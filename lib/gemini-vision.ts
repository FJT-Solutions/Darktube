import { GoogleGenerativeAI } from "@google/generative-ai";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";


export interface ScriptSegment {
    timestamp: string;
    segment_type: string;
    voiceover: {
        text: string;
        style: string;
    };
    visual_content: {
        image_prompt: string;
        animation_instructions: string;
    };
    emotion: string;
}

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
    detected_audio_type: 'voice' | 'music_only' | 'none';
    has_text_on_screen: boolean;
    original_audio_description: string;
    remodeling_template: {
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
        params: { videoPath?: string; audioPath?: string; framePaths?: string[]; transcript?: string; duration?: number },
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

        contentParts.push({ text: this.getPrompt(params.duration) });

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

    getPrompt(duration?: number) {
        const durationText = duration ? `O vídeo original tem EXATAMENTE ${Math.round(duration)} segundos.` : 'A duração do vídeo original é curta.';
        return `Você é um analista de conteúdo de vídeo de elite.
Sua missão: analisar os FRAMES deste vídeo e criar uma FICHA TÉCNICA de análise visual.

VOCÊ NÃO GERA ROTEIRO. Você APENAS analisa o que VÊ e OUVE nos frames.

${durationText}

ANÁLISE DE ÁUDIO OBRIGATÓRIA:
Olhe e ouça os frames com extrema atenção:
- Se há uma VOZ HUMANA narrando/falando → detected_audio_type = "voice"
- Se há APENAS música de fundo sem fala humana → detected_audio_type = "music_only"
- Se NÃO há som algum (silêncio total) → detected_audio_type = "none"
Descreva o áudio original em "original_audio_description" (ex: "Música orquestral épica sem narração", "Narrador masculino grave com música de suspense", "Silêncio total").

CATÁLOGO DE FERRAMENTAS (Use no ai_stack):
- Imagem: "Black Forest Labs flux-2 pro", "ideogram v3", "seedream 5.0 Lite".
- Vídeo: "Kling 3.0", "Open AI sora 2", "wan 2.5", "Runway Gen-3".
- Voz: "Elevenlabs V3", "Elevenlabs Text to Speech (multilingual v2)".
- Música: "Suno v3.5".

RESPONDA APENAS COM O JSON:
{
  "feasibility": "Alta | Média | Baixa",
  "style": "descrição do nicho/tipo do conteúdo",
  "visualStyle": "Cinematográfico | Dinâmico | Estoque/IA | Vlog/Real | Misto",
  "pacing": "Lento | Equilibrado | Frenético",
  "productionMethod": "IA Gerativa | Banco de Estoque | Edição Manual | Misto",
  "confidence": 0.85,
  "justification": "análise técnica do que foi observado nos frames",
  "tools": ["ferramentas recomendadas"],
  "summary": "resumo do conteúdo visual observado",
  "remodelingTip": "dica estratégica para remodelar este conteúdo",
  "detected_audio_type": "voice | music_only | none",
  "has_text_on_screen": true,
  "original_audio_description": "descrição exata do áudio original",
  "remodeling_template": {
    "visual_directives": "diretrizes visuais baseadas no que foi observado",
    "composition_rules": "regras de composição",
    "thumbnail_prompt": "prompt detalhado para thumbnail com alto CTR",
    "music_style": "estilo de música que COMBINA com o áudio original",
    "video_style": "estilo de vídeo observado",
    "ai_stack": { "image": "...", "video": "...", "voice": "...", "music": "..." },
    "target_audience_psychology": "perfil do público-alvo"
  }
}

IMPORTANTE: Seja 100% fiel ao que OBSERVA. Não invente narração se não há voz. Não invente música se há silêncio.`;
    }
};
