/**
 * Ferramentas (Tools) do MCP DarkTube para integração com agentes externos (ex: X1).
 * Renderiza o vídeo real em MP4 via Remotion e baixa direto para ./midia/criativos/ do projeto.
 */

import fs from 'fs';
import path from 'path';
import { FLOW_TEMPLATES } from '@/lib/flow-templates';

const DARKTUBE_BASE_URL = process.env.DARKTUBE_BASE_URL || 'https://darktube.fjt-solutions.com';

/**
 * URLs candidatas do serviço Remotion (Docker interno no Coolify ou local).
 */
const CANDIDATE_URLS = [
  'http://n8n-remotionservice-ry6eh9:3001',
  process.env.REMOTION_SERVICE_URL?.replace(/\/render\/?$/, ''),
  process.env.REMOTION_SERVER_URL,
  'http://remotion-service:3001',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter(Boolean) as string[];

export interface CampaignCreativeInput {
  offer: string;
  angle?: 'pao-frigideira' | 'doce-sem-culpa' | 'mosaico-365' | string;
  format?: '9:16' | '1:1' | '16:9';
  isDraft?: boolean;
  downloadLocal?: boolean;
  outputDir?: string;
}

export interface RenderCreativeInput {
  templateId?: string;
  scenes: Array<{
    durationSeconds: number;
    captionText: string;
    mediaUrl?: string;
    animationStyle?: string;
    transitionIn?: string;
    textEffect?: string;
  }>;
  format?: 'vertical' | 'horizontal';
  isDraft?: boolean;
  captionStyle?: 'pop' | 'karaoke' | 'subtitle';
  primaryColor?: string;
  accentColor?: string;
  downloadLocal?: boolean;
  outputDir?: string;
}

/**
 * 1. Lista todos os 26 templates oficiais disponíveis no DarkTube Flow.
 */
export async function listFlowTemplates() {
  return FLOW_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    niche: t.niche,
    subniche: t.subniche,
    length: t.length,
    trend: t.trend,
    beats: t.beats,
    defaults: t.defaults,
    fields: t.fields.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      default: f.default,
      options: f.options,
    })),
  }));
}

/**
 * 2. Faz o download do arquivo de vídeo gerado para a pasta interna ./midia/criativos/ do projeto atual.
 */
export async function downloadCreativeToLocal(
  videoUrl: string,
  outputDir = './midia/criativos',
  preferredFileName?: string
): Promise<{ success: boolean; filePath: string; sizeBytes: number; error?: string }> {
  try {
    const resolvedUrl = videoUrl.startsWith('http')
      ? videoUrl
      : `${DARKTUBE_BASE_URL}${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`;

    const parsedUrl = new URL(resolvedUrl);
    const fileName =
      preferredFileName ||
      path.basename(parsedUrl.pathname) ||
      `criativo_${Date.now()}.mp4`;

    const targetDir = path.resolve(process.cwd(), outputDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, fileName);
    console.log(`[MCP DarkTube] Baixando vídeo de ${resolvedUrl} para ${filePath}...`);

    const res = await fetch(resolvedUrl);
    if (!res.ok) {
      throw new Error(`Falha ao baixar vídeo (${res.status} ${res.statusText}): ${resolvedUrl}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    return {
      success: true,
      filePath,
      sizeBytes: buffer.length,
    };
  } catch (err: any) {
    console.error('[MCP DarkTube] Erro no download local:', err);
    return {
      success: false,
      filePath: '',
      sizeBytes: 0,
      error: err.message,
    };
  }
}

/**
 * 3. Renderiza a composição real no Remotion Server (gerando o .mp4 e a folha de contato).
 */
export async function renderCreative(input: RenderCreativeInput) {
  const isVertical = (input.format || 'vertical') === 'vertical';
  const historyId = `mcp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const templateId = input.templateId || 'ShortVideo';

  const composition = {
    scenes: input.scenes,
    format: isVertical ? 'vertical' : 'horizontal',
    captionStyle: input.captionStyle || 'pop',
    primaryColor: input.primaryColor || '#EAB308',
    accentColor: input.accentColor || '#FFFFFF',
    showWatermark: false,
  };

  let res: Response | null = null;
  let lastError: Error | null = null;

  for (const base of CANDIDATE_URLS) {
    const cleanBase = base.replace(/\/+$/, '');
    const endpoint = input.isDraft
      ? `${cleanBase}/render-draft`
      : `${cleanBase}/render`;

    try {
      console.log(`[MCP DarkTube] Tentando Remotion Server em ${endpoint}...`);
      const attempt = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historyId,
          templateId,
          composition,
          callbackUrl: `${DARKTUBE_BASE_URL}/api/mcp/callback`,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (attempt.ok) {
        res = attempt;
        console.log(`[MCP DarkTube] Remotion render iniciado com sucesso em ${cleanBase}!`);
        break;
      } else {
        const text = await attempt.text().catch(() => attempt.statusText);
        console.warn(`[MCP DarkTube] Candidato ${cleanBase} retornou HTTP ${attempt.status}: ${text}`);
      }
    } catch (err: any) {
      console.warn(`[MCP DarkTube] Falha ao conectar em ${cleanBase}: ${err.message}`);
      lastError = err;
    }
  }

  if (!res) {
    throw new Error(`Falha ao conectar no Remotion Server: ${lastError?.message || 'Nenhum candidato respondeu'}`);
  }

  const result = await res.json();
  const rawVideoUrl = result.draftVideoUrl || result.videoUrl || result.outputUrl || '';
  
  const videoUrl = rawVideoUrl.startsWith('http')
    ? rawVideoUrl
    : `${DARKTUBE_BASE_URL}${rawVideoUrl.startsWith('/') ? '' : '/'}${rawVideoUrl}`;

  const sheetUrl = result.contactSheetUrl
    ? (result.contactSheetUrl.startsWith('http')
        ? result.contactSheetUrl
        : `${DARKTUBE_BASE_URL}${result.contactSheetUrl.startsWith('/') ? '' : '/'}${result.contactSheetUrl}`)
    : null;

  let localFile: { success: boolean; filePath: string; sizeBytes: number } | null = null;
  if (input.downloadLocal && videoUrl) {
    localFile = await downloadCreativeToLocal(videoUrl, input.outputDir);
  }

  return {
    success: true,
    historyId,
    videoUrl,
    contactSheetUrl: sheetUrl,
    isDraft: Boolean(input.isDraft),
    localFile,
  };
}

/**
 * 4. Gera o criativo completo para o X1 (oferta 365 receitas ou personalizada):
 * - Monta as cenas cinematográficas com ganchos e legendas pop.
 * - Renderiza o MP4 via Remotion Server (porta 3001 / remotion-service).
 * - Devolve o link do vídeo .mp4 pronto e faz o download local para ./midia/criativos/.
 */
export async function createCampaignCreative(input: CampaignCreativeInput) {
  const {
    offer,
    angle = 'pao-frigideira',
    format = '9:16',
    isDraft = true,
    downloadLocal = true,
    outputDir = './midia/criativos',
  } = input;

  const presets: Record<string, any> = {
    'pao-frigideira': {
      title: 'Pão de Frigideira Fofinho (Café da Manhã em 5 min)',
      hook: 'Você não precisa cortar o pão quentinho de manhã para desinchar a barriga...',
      copy: {
        headline: 'Pão de Frigideira Low Carb em 5 Minutos',
        body: 'Coma pão quentinho todos os dias sem estufar a barriga. Pegue o livro completo com 365 receitas sem açúcar, sem glúten e sem leite.',
        cta: 'Chamar no WhatsApp',
      },
      scenes: [
        {
          index: 0,
          durationSeconds: 4,
          captionText: 'Você não precisa cortar o pão quentinho de manhã para desinchar...',
          animationStyle: 'kenburns-center',
          transitionIn: 'fade',
          textEffect: 'pop',
        },
        {
          index: 1,
          durationSeconds: 4,
          captionText: 'Essa receita leva só 3 ingredientes e fica pronta em 5 minutos na frigideira!',
          animationStyle: 'kenburns-right',
          transitionIn: 'slide-right',
          textEffect: 'pop',
        },
        {
          index: 2,
          durationSeconds: 4,
          captionText: 'Sem glúten, sem açúcar e sem lactose, tão fofinho que derrete a manteiga.',
          animationStyle: 'kenburns-left',
          transitionIn: 'fade',
          textEffect: 'pop',
        },
        {
          index: 3,
          durationSeconds: 5,
          captionText: 'Toque em Saiba Mais para receber as 365 receitas direto no seu WhatsApp!',
          animationStyle: 'kenburns-center',
          transitionIn: 'slide-up',
          textEffect: 'bounce',
        },
      ],
    },
    'doce-sem-culpa': {
      title: 'Doce Sem Culpa (Brownie Cremoso Sem Açúcar)',
      hook: 'Pare de passar vontade de comer doce achando que vai estragar a sua dieta...',
      copy: {
        headline: 'Brownie e Sobremesas Saudáveis Sem Açúcar',
        body: 'Mata a vontade de doce sem peso na consciência e sem glúten. Mais de 365 opções práticas para a família toda.',
        cta: 'Chamar no WhatsApp',
      },
      scenes: [
        {
          index: 0,
          durationSeconds: 4,
          captionText: 'Pare de passar vontade de comer doce achando que vai engordar...',
          animationStyle: 'kenburns-center',
          transitionIn: 'fade',
          textEffect: 'pop',
        },
        {
          index: 1,
          durationSeconds: 4,
          captionText: 'Esse brownie cremoso de cacau não leva nem um grama de açúcar refinado ou trigo.',
          animationStyle: 'kenburns-right',
          transitionIn: 'slide-right',
          textEffect: 'pop',
        },
        {
          index: 2,
          durationSeconds: 4,
          captionText: 'Mata a fissura por doce sem dar pico de glicose e ajuda a manter o foco.',
          animationStyle: 'kenburns-left',
          transitionIn: 'fade',
          textEffect: 'pop',
        },
        {
          index: 3,
          durationSeconds: 5,
          captionText: 'Toque em Saiba Mais para ter sobremesas saudáveis todos os dias!',
          animationStyle: 'kenburns-center',
          transitionIn: 'slide-up',
          textEffect: 'bounce',
        },
      ],
    },
    'mosaico-365': {
      title: 'Mosaico 365 Dias (Variedade e Praticidade)',
      hook: 'Nunca mais passe pelo estresse de não saber o que cozinhar para manter a saúde...',
      copy: {
        headline: 'Guia 365 Receitas Fáceis Sem Glúten e Sem Leite',
        body: 'Um prato novo para cada dia do ano. Receitas práticas de até 15 minutos para desinchar e comer bem.',
        cta: 'Chamar no WhatsApp',
      },
      scenes: [
        {
          index: 0,
          durationSeconds: 4,
          captionText: 'Cansada de comer sempre a mesma comida sem graça na dieta?',
          animationStyle: 'kenburns-center',
          transitionIn: 'fade',
          textEffect: 'pop',
        },
        {
          index: 1,
          durationSeconds: 4,
          captionText: 'São 365 receitas completas: café da manhã, almoço, lanche e jantar.',
          animationStyle: 'kenburns-right',
          transitionIn: 'slide-right',
          textEffect: 'pop',
        },
        {
          index: 2,
          durationSeconds: 4,
          captionText: 'Tudo com ingredientes simples que você já tem em casa.',
          animationStyle: 'kenburns-left',
          transitionIn: 'fade',
          textEffect: 'pop',
        },
        {
          index: 3,
          durationSeconds: 5,
          captionText: 'Toque abaixo e receba o material completo com valor promocional!',
          animationStyle: 'kenburns-center',
          transitionIn: 'slide-up',
          textEffect: 'bounce',
        },
      ],
    },
  };

  const selectedPreset = presets[angle] || presets['pao-frigideira'];

  console.log(`[MCP DarkTube] Iniciando renderização do vídeo MP4 para oferta=${offer}, angulo=${angle}...`);

  const renderResult = await renderCreative({
    templateId: 'ShortVideo',
    scenes: selectedPreset.scenes,
    format: format === '9:16' ? 'vertical' : 'horizontal',
    isDraft,
    downloadLocal,
    outputDir,
  });

  return {
    success: true,
    engine: 'Remotion Render Engine (MP4 Final)',
    offer,
    angle,
    title: selectedPreset.title,
    copyMetaAds: selectedPreset.copy,
    videoUrl: renderResult.videoUrl,
    contactSheetUrl: renderResult.contactSheetUrl,
    isDraft,
    localFile: renderResult.localFile,
    status: 'video_ready',
  };
}
