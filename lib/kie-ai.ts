/**
 * KIE.AI Service
 * Integração com o provedor KIE para geração de imagens, vídeos e música
 * Doc: https://kie.ai/docs
 */

export interface KieCreditStatus {
  total: number;
  used: number;
  remaining: number;
}

export interface KieGenerationResponse {
  success: boolean;
  jobId?: string;
  resultUrl?: string;
  error?: string;
}

export class KieAIService {
  private static apiKey = process.env.KIE_AI_API_KEY;
  private static baseUrl = "https://api.kie.ai/v1";

  /**
   * Verifica o status de créditos na KIE.AI
   */
  static async getCredits(): Promise<KieCreditStatus | null> {
    if (!this.apiKey) return null;
    try {
      const res = await fetch(`${this.baseUrl}/user/credits`, {
        headers: { "Authorization": `Bearer ${this.apiKey}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        total: data.total_credits,
        used: data.used_credits,
        remaining: data.total_credits - data.used_credits
      };
    } catch (error) {
      console.error("Error fetching KieAI credits:", error);
      return null;
    }
  }

  /**
   * Gera uma Thumbnail baseada no estilo visual do template
   * Modelos sugeridos: flux-1.1-pro, ideogram-2.0
   */
  static async generateThumbnail(prompt: string, model: string = "flux-1.1-pro"): Promise<KieGenerationResponse> {
    if (!this.apiKey) return { success: false, error: "API Key missing" };
    try {
      const res = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          model,
          aspect_ratio: "16:9",
          quality: "premium"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate image");

      return {
        success: true,
        jobId: data.id,
        resultUrl: data.url
      };
    } catch (error: any) {
      console.error("KieAI Image Gen Error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gera música de fundo baseada no estilo do template
   * Modelos sugeridos: suno-v4
   */
  static async generateMusic(style: string, duration: number = 60): Promise<KieGenerationResponse> {
    if (!this.apiKey) return { success: false, error: "API Key missing" };
    try {
      const res = await fetch(`${this.baseUrl}/audio/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: `Background music for a YouTube video, style: ${style}`,
          model: "suno-v4",
          duration
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate music");

      return {
        success: true,
        jobId: data.id,
        resultUrl: data.url
      };
    } catch (error: any) {
      console.error("KieAI Music Gen Error:", error);
      return { success: false, error: error.message };
    }
  }
}
