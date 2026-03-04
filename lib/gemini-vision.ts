import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

export const GeminiVisionService = {
    /**
     * Analyzes video frames using Gemini 1.5 Pro Vision.
     */
    async analyzeFrames(framePaths: string[], customApiKey?: string): Promise<{
        productionMethod: 'IA Gerativa' | 'Banco de Estoque' | 'Edição Manual' | 'Misto';
        confidence: number;
        justification: string;
    }> {
        const apiKey = customApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY não configurada.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Você é um especialista em produção de vídeo e detecção de IA. 
            Analise estas imagens (frames) de um vídeo e determine como ele foi feito.
            
            Critérios de busca:
            1. **IA Gerativa**: Procure por distorções temporais, morphing, mãos/objetos incoerentes ou estética ultra-suave típica de Sora, Runway ou Pika.
            2. **Banco de Estoque**: Procure por alta qualidade de produção, iluminação de estúdio, marcas d'água sutis ou cenas genéricas típicas de Storyblocks/Envato.
            3. **Edição Manual/Real**: Procure por filmagens reais, vlogs, cenários naturais e imperfeições de câmera.
            
            Responda EXATAMENTE neste formato JSON:
            {
                "productionMethod": "IA Gerativa" | "Banco de Estoque" | "Edição Manual" | "Misto",
                "confidence": 0.0 a 1.0,
                "justification": "Breve explicação técnica do que você viu."
            }
        `;

        const imageParts = framePaths.map(path => ({
            inlineData: {
                data: fs.readFileSync(path).toString("base64"),
                mimeType: "image/jpeg"
            }
        }));

        try {
            const result = await model.generateContent([prompt, ...imageParts]);
            const response = result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\{.*\}/s);
            if (!jsonMatch) throw new Error("Resposta da IA inválida.");

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error("Error in GeminiVisionService:", error);
            throw new Error("Falha na análise visual da IA.");
        }
    }
};
