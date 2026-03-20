import { YoutubeTranscript } from 'youtube-transcript';
import { VideoCaptureService } from './video-capture';
import { GeminiVisionService } from './gemini-vision';

export interface AIAnalysisResult {
    feasibility: 'Alta' | 'Média' | 'Baixa';
    style: string;
    visualStyle: 'Cinematográfico' | 'Dinâmico' | 'Estoque/IA' | 'Vlog/Real';
    pacing: 'Lento' | 'Equilibrado' | 'Frenético';
    productionMethod: 'IA Gerativa' | 'Banco de Estoque' | 'Edição Manual' | 'Misto';
    confidence: number;
    justification?: string;
    tools: string[];
    summary: string;
    remodelingTip: string;
}

/**
 * Service to fetch transcripts and analyze videos for AI remodeling potential.
 */
export const VideoAnalysisService = {
    /**
     * Orchestrates a deep visual analysis using frame extraction and Gemini Vision.
     */
    async performVisionAnalysis(videoId: string, customApiKey?: string): Promise<any | null> {
        try {
            const framePaths = await VideoCaptureService.extractFrames(videoId);
            const visionResult = await GeminiVisionService.analyzeFrames(framePaths, customApiKey);
            await VideoCaptureService.cleanup(videoId);
            return visionResult;
        } catch (error) {
            console.error('Vision analysis failed, falling back to heuristics:', error);
            return null;
        }
    },

    /**
     * Fetches the transcript for a YouTube video.
     */
    async getTranscript(videoId: string): Promise<string> {
        try {
            const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
            return transcriptItems.map(item => item.text).join(' ');
        } catch (error) {
            console.error(`Error fetching transcript for ${videoId}:`, error);
            throw new Error('Não foi possível obter a transcrição do vídeo. O vídeo pode não possuir legendas disponíveis.');
        }
    },

    /**
     * Analyzes video content to determine AI remodeling feasibility.
     * Based on keywords, narrative structure, and dark niche patterns.
     */
    analyzeContent(transcript: string, duration: string): AIAnalysisResult {
        const text = transcript.toLowerCase();

        // Helper to convert "MM:SS" or "HH:MM:SS" to seconds
        const getSeconds = (dur: string) => {
            const parts = dur.split(':').map(Number);
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            return parts[0] || 0;
        };

        const totalSeconds = getSeconds(duration);
        const wordCount = transcript.split(/\s+/).length;
        const wordsPerMinute = totalSeconds > 0 ? (wordCount / totalSeconds) * 60 : 0;

        const result: AIAnalysisResult = {
            feasibility: 'Média',
            style: 'Informativo',
            visualStyle: 'Estoque/IA',
            pacing: 'Equilibrado',
            productionMethod: 'Misto',
            confidence: 0.7,
            tools: ['ElevenLabs (Voz)', 'Midjourney (Imagens)'],
            summary: '',
            remodelingTip: ''
        };

        // 1. Pacing Detection
        if (wordsPerMinute > 165) result.pacing = 'Frenético';
        else if (wordsPerMinute < 110) result.pacing = 'Lento';

        // 2. Detection of high feasibility (Storytelling, Facts, Historical, etc.)
        const highFeasibilityKeywords = ['era uma vez', 'no vídeo de hoje', 'você sabia', 'história', 'curiosidade', 'fato', 'mentira', 'verdade', 'mistério', 'universo', 'espaço'];
        const lowFeasibilityKeywords = ['vlog', 'desafio', 'challenge', 'mostrando meu', 'viajei', 'fui para', 'festa', 'comigo', 'arrume-se'];

        const highScore = highFeasibilityKeywords.filter(k => text.includes(k)).length;
        const lowScore = lowFeasibilityKeywords.filter(k => text.includes(k)).length;

        // 3. Production Method Detection (Heuristics)
        const aiGenKeywords = ['animação ia', 'runway', 'pika', 'sora', 'gerado com', 'estilo ia', 'morphing'];
        const stockKeywords = ['banco de imagem', 'storyblocks', 'envato', 'pexels', 'pixel perfeit', 'cenas de arquivo'];
        const manualKeywords = ['motion graphics', 'after effects', 'transição', 'complexo', 'overlay', 'efeitos visuais'];

        const aiGenScore = aiGenKeywords.filter(k => text.includes(k)).length;
        const stockScore = stockKeywords.filter(k => text.includes(k)).length;
        const manualScore = manualKeywords.filter(k => text.includes(k)).length;

        if (aiGenScore > 0) {
            result.productionMethod = 'IA Gerativa';
            result.confidence = 0.85;
        } else if (stockScore > manualScore) {
            result.productionMethod = 'Banco de Estoque';
            result.confidence = 0.8;
        } else if (manualScore > 1) {
            result.productionMethod = 'Edição Manual';
            result.confidence = 0.75;
        }

        if (highScore > lowScore + 2) {
            result.feasibility = 'Alta';
            result.style = 'Dark Storytelling / Documentário';
            result.visualStyle = 'Cinematográfico';
            result.tools.push('Canva/CapCut (Edição)', 'Pika/Runway (Vídeo IA)');
            result.remodelingTip = 'Este vídeo segue uma estrutura narrativa perfeita para ser recriada com imagens estáticas de alta qualidade e narração profunda.';
        } else if (lowScore > 0) {
            result.feasibility = 'Baixa';
            result.style = 'Vlog / Pessoal';
            result.visualStyle = 'Vlog/Real';
            result.productionMethod = 'Edição Manual';
            result.remodelingTip = 'Este conteúdo depende muito da presença física e carisma pessoal, sendo mais difícil de replicar puramente com IA.';
        } else {
            result.feasibility = 'Média';
            result.style = 'Informativo Genérico';
            result.visualStyle = 'Estoque/IA';
            result.remodelingTip = 'Pode ser remodelado, mas requer uma boa curadoria de bancos de imagem para manter o interesse visual.';
        }

        // Adjust visual style for high pacing
        if (result.pacing === 'Frenético' && result.visualStyle !== 'Vlog/Real') {
            result.visualStyle = 'Dinâmico';
        }

        // Summary generation (simplified logic)
        const sentences = transcript.split('.').filter(s => s.length > 20);
        result.summary = sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '...' : '');

        return result;
    }
};
;
