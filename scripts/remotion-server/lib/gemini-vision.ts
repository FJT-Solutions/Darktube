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

import { getSystemPromptContent } from './database';

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
        const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_CLIENT_SECRET;
        if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = "gemini-2.5-flash";

        console.log(`[GeminiVisionService] 💎 Analyzing with ${modelName}...`);

        const model = genAI.getGenerativeModel({ model: modelName });

        const contentParts: any[] = [];

        // 1. Transcript text — nearly zero token cost
        if (params.transcript && params.transcript.trim().length > 0) {
            contentParts.push({ text: `[TRANSCRIÇÃO DO VÍDEO]:\n${params.transcript.slice(0, 8000)}` });
        }

        // 2. Frames inline (base64) — HD (720p) for professional analysis
        const frames = (params.framePaths ?? []).filter(f => fs.existsSync(f)).slice(0, 15);
        for (const f of frames) {
            const tmpFrame = path.join(os.tmpdir(), `gframe_${Date.now()}_${path.basename(f)}`);
            try {
                // Resize to 1280x720 (HD) — allows reading text and fine details
                execSync(`ffmpeg -i "${f}" -vf "scale=1280:720" -q:v 3 "${tmpFrame}" -y`, { stdio: 'pipe' });
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

        if (params.transcript) {
            contentParts.push({ text: `TRANSCRIÇÃO DO ÁUDIO ORIGINAL DO VÍDEO:\n"${params.transcript.slice(0, 3000)}"` });
        }

        contentParts.push({ text: await this.getPrompt(params.duration) });

        try {
            const result = await model.generateContent(contentParts);
            const raw = result.response.text();
            const jsonStr = raw.includes("```json")
                ? raw.split("```json")[1].split("```")[0].trim()
                : raw.trim();
            return JSON.parse(jsonStr) as RemodelingTemplate;
        } catch (error: any) {
            if (error?.message?.includes("429")) {
                console.warn("[GeminiVisionService] Rate limit hit, retrying in 5s...");
                await new Promise(r => setTimeout(r, 5000));
                const retry = await model.generateContent(contentParts);
                const raw2 = retry.response.text();
                const json2 = raw2.includes("```json") ? raw2.split("```json")[1].split("```")[0].trim() : raw2.trim();
                return JSON.parse(json2) as RemodelingTemplate;
            }
            throw error;
        }
    },

    async getPrompt(duration?: number) {
        const durationText = duration ? `O vídeo original tem EXATAMENTE ${Math.round(duration)} segundos.` : 'Esta é uma análise de estrutura visual completa.';
        const rawTemplate = await getSystemPromptContent('gemini_vision');
        return rawTemplate.replace('{durationText}', durationText);
    }
};
