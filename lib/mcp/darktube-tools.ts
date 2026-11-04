/**
 * Ferramentas (Tools) do MCP DarkTube para integração com agentes externos (ex: X1).
 * Suporta o Motor nativo do /flow (templates, geração de roteiro por IA, prompts de câmera e registro no banco).
 */

import fs from 'fs';
import path from 'path';
import { FLOW_TEMPLATES, getFlowTemplate, type FlowTemplate } from '@/lib/flow-templates';
import {
  buildSystemPrompt,
  buildTakePrompt,
  extractJson,
  normalizeScript,
  validateScript,
  type FlowParams,
  type FlowScript,
} from '@/lib/flow-script';
import { callFlowLLM, type FlowProvider } from '@/lib/flow-llm';
import { createFlowProject } from '@/lib/flow-projects';
import { pool } from '@/lib/db-client';

const REMOTION_SERVER_URL = process.env.REMOTION_SERVER_URL || 'http://127.0.0.1:3001';
const DARKTUBE_BASE_URL = process.env.DARKTUBE_BASE_URL || 'https://darktube.fjt-solutions.com';

export interface CampaignCreativeInput {
  offer: string;
  angle?: 'pao-frigideira' | 'doce-sem-culpa' | 'mosaico-365' | string;
  templateId?: string;
  format?: '9:16' | '1:1' | '16:9';
  takesCount?: number;
  benefits?: string;
  customIdea?: string;
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
 * Resolve o usuário padrão no banco do DarkTube para vincular o projeto criado.
 */
async function resolveDefaultUserId(): Promise<string> {
  try {
    const { rows } = await pool.query('SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1');
    if (rows && rows.length > 0) return rows[0].id;
  } catch (err: any) {
    console.warn('[MCP DarkTube] Não foi possível consultar tabela users:', err.message);
  }
  return '00000000-0000-0000-0000-000000000000';
}

/**
 * 2. Cria o criativo utilizando a esteira nativa do /flow (Cenário 2):
 * - Aplica os templates do /flow (ex: produto-tiktok-shop ou livre).
 * - Gera roteiro com IA ou carrega preset validado de alta conversão.
 * - Constrói os prompts detalhados de imagem e câmera para cada take.
 * - Registra no banco PostgreSQL do DarkTube para aparecer no menu "Projetos" da tela /flow.
 */
export async function createCampaignCreative(input: CampaignCreativeInput) {
  const {
    offer,
    angle = 'pao-frigideira',
    templateId = 'produto-tiktok-shop',
    format = '9:16',
    takesCount = 4,
    benefits = '',
    customIdea = '',
  } = input;

  const t: FlowTemplate = getFlowTemplate(templateId) || getFlowTemplate('produto-tiktok-shop') || FLOW_TEMPLATES[0];

  // Presets validados da oferta campeã (utilizados como base ou fallback de segurança)
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
          action: 'Mãos partindo um pãozinho dourado, redondo e fofinho recém-saído da frigideira. Vapor quente subindo da massa aerada.',
          camera: 'macro close-up on hands opening the steaming golden bread',
          line: 'Você não precisa cortar o pão quentinho de manhã para desinchar a barriga...',
        },
        {
          index: 1,
          durationSeconds: 4,
          captionText: 'Essa receita leva só 3 ingredientes e fica pronta em 5 minutos na frigideira!',
          action: 'Massa líquida cremosa caindo na frigideira antiaderente untada, dourando rapidamente com bolhas suaves.',
          camera: 'medium overhead angle of skillet on small stove',
          line: 'Essa receita leva só 3 ingredientes simples e fica pronta em 5 minutos na frigideira!',
        },
        {
          index: 2,
          durationSeconds: 4,
          captionText: 'Sem glúten, sem açúcar e sem lactose, tão fofinho que derrete a manteiga.',
          action: 'Uma fatia de manteiga derretendo sobre o pão ainda quente no prato rústico de café da manhã.',
          camera: 'close-up shot on melting butter dripping down bread crust',
          line: 'É 100% sem glúten, sem açúcar e sem leite. Tão macio que derrete na boca.',
        },
        {
          index: 3,
          durationSeconds: 5,
          captionText: 'Toque em Saiba Mais para receber as 365 receitas direto no seu WhatsApp!',
          action: 'Smartphone na mão exibindo a capa digital das 365 Receitas com botão verde de WhatsApp.',
          camera: 'medium eye-level shot with presenter pointing down towards screen',
          line: 'Toque no botão abaixo agora e me manda um oi no WhatsApp para receber o livro completo!',
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
          action: 'Pedaço generoso de brownie de chocolate escuro e úmido com morangos frescos ao redor.',
          camera: 'macro push-in on rich dark chocolate brownie texture',
          line: 'Pare de passar vontade de comer doce achando que vai engordar...',
        },
        {
          index: 1,
          durationSeconds: 4,
          captionText: 'Esse brownie cremoso de cacau não leva nem um grama de açúcar refinado ou trigo.',
          action: 'Colher afundando lentamente na textura macia do brownie revelando o centro cremoso.',
          camera: 'slow tilt-down following dessert spoon cutting the slice',
          line: 'Esse brownie cremoso de cacau não leva nem um grama de açúcar refinado ou trigo.',
        },
        {
          index: 2,
          durationSeconds: 4,
          captionText: 'Mata a fissura por doce sem dar pico de glicose e ajuda a manter o foco.',
          action: 'Prato gourmet pronto com calda de cacau 70% brilhante sobre a mesa elegante.',
          camera: 'steady eye-level close-up with appetizing natural light',
          line: 'Mata a fissura por doce sem dar pico de glicose e ajuda a manter o foco.',
        },
        {
          index: 3,
          durationSeconds: 5,
          captionText: 'Toque em Saiba Mais para ter sobremesas saudáveis todos os dias!',
          action: 'Apostila aberta na tela do celular com botão verde em destaque.',
          camera: 'medium shot pointing down towards the CTA link',
          line: 'Toque em Saiba Mais para ter sobremesas saudáveis todos os dias!',
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
          action: 'Mesa farta e colorida com 3 pratos diferentes: salada vibrante, quiche e sobremesa saudável.',
          camera: 'wide overhead dynamic shot panning over healthy food layout',
          line: 'Cansada de comer sempre a mesma comida sem graça na dieta?',
        },
        {
          index: 1,
          durationSeconds: 4,
          captionText: 'São 365 receitas completas: café da manhã, almoço, lanche e jantar.',
          action: 'Páginas do livro de receitas sendo folheadas com fotos de pratos reais apetitosos.',
          camera: 'close-up tracking hands flipping through recipe handbook',
          line: 'São 365 receitas completas: café da manhã, almoço, lanche e jantar.',
        },
        {
          index: 2,
          durationSeconds: 4,
          captionText: 'Tudo com ingredientes simples que você já tem em casa.',
          action: 'Mãos preparando uma receita em apenas 10 minutos na bancada da cozinha.',
          camera: 'quick medium cut showing fast assembly in frying pan',
          line: 'Tudo com ingredientes simples que você já tem em casa.',
        },
        {
          index: 3,
          durationSeconds: 5,
          captionText: 'Toque abaixo e receba o material completo com valor promocional!',
          action: 'Apresentação visual da oferta com celular e mensagem do WhatsApp.',
          camera: 'medium presenter shot pointing to WhatsApp link',
          line: 'Toque abaixo e receba o material completo com valor promocional!',
        },
      ],
    },
  };

  const selectedPreset = presets[angle] || presets['pao-frigideira'];

  const params: FlowParams = {
    tema: `${offer} - ${selectedPreset.title}`,
    produto: offer,
    beneficios: benefits || 'Sem glúten, sem açúcar, sem lactose, pronto em 5 minutos',
    estilo: angle === 'pao-frigideira' ? 'dor' : 'objecao',
    roteiro: customIdea || '',
    idioma: 'pt-BR',
    realismo: 'cinematografico',
    takes: takesCount,
    seconds: 6,
    aspect: format === '9:16' ? '9:16' : '16:9',
    model: 'Omni 1.1 Flash',
    quality: '360p',
  };

  let generatedScript: FlowScript | null = null;
  const apiKey = process.env.OPENAI_API_KEY;

  // Tentativa de geração com LLM nativo do /flow se a chave estiver configurada
  if (apiKey) {
    try {
      console.log(`[MCP DarkTube] Acionando IA do /flow para o template "${t.name}"...`);
      const system = buildSystemPrompt(t, params);
      const userPrompt = `Gere o roteiro de anúncio para o produto "${offer}", ângulo "${selectedPreset.title}".`;
      const llmText = await callFlowLLM('openai', apiKey, system, userPrompt);
      const rawJson = extractJson(llmText);
      if (rawJson && typeof rawJson === 'object') {
        generatedScript = normalizeScript(rawJson, t, params);
        console.log(`[MCP DarkTube] Roteiro gerado com sucesso via IA do /flow!`);
      }
    } catch (llmErr: any) {
      console.warn(`[MCP DarkTube] Aviso na chamada do LLM do /flow: ${llmErr.message}. Utilizando preset validado.`);
    }
  }

  // Se não rodou LLM, monta a estrutura completa baseada no preset validado
  if (!generatedScript) {
    generatedScript = {
      title: selectedPreset.title,
      characters: [
        {
          id: 'c1',
          name: 'Apresentador',
          visual: 'Pessoa comunicativa e amigável em cozinha moderna e acolhedora com luz matinal.',
          voice: 'natural, acolhedora e empática',
        },
      ],
      locations: [
        {
          id: 'l1',
          name: 'Cozinha Matinal',
          description: 'Cozinha aconchegante com bancada de madeira rústica e luz suave.',
        },
      ],
      takes: selectedPreset.scenes.map((s: any, idx: number) => ({
        n: idx + 1,
        seconds: s.durationSeconds,
        kind: 'narracao',
        line: s.line,
        action: s.action,
        camera: s.camera,
        sound: 'som ambiente de cozinha, chiado suave da frigideira',
        location: 'l1',
        characters: ['c1'],
      })),
      seo: {
        title: selectedPreset.copy.headline,
        hook: selectedPreset.hook,
        caption: selectedPreset.copy.body,
        tags: ['receitasfit', 'semgluten', 'semlactose', 'emagrecimento', 'cafedamanha'],
      },
    };
  }

  // Gera os prompts individuais de cada take formatados para Google Flow / I2V
  const takesWithPrompts = generatedScript.takes.map((take) => {
    const prompt = buildTakePrompt(generatedScript!, take, params, t);
    return {
      takeNumber: take.n,
      seconds: take.seconds,
      kind: take.kind,
      spokenLine: take.line,
      visualAction: take.action,
      cameraFraming: take.camera,
      flowGenerationPrompt: prompt,
      audioFoley: take.sound,
    };
  });

  // Salva no banco de dados para aparecer imediatamente na tela /flow do DarkTube
  let savedProject = null;
  try {
    const userId = await resolveDefaultUserId();
    savedProject = await createFlowProject({
      userId,
      templateId: t.id,
      params,
      script: generatedScript,
      provider: apiKey ? 'openai' : 'preset',
    });
    console.log(`[MCP DarkTube] Projeto Flow salvo no banco com ID: ${savedProject.id}`);
  } catch (dbErr: any) {
    console.warn(`[MCP DarkTube] Banco de dados offline ou ignorado: ${dbErr.message}`);
  }

  return {
    success: true,
    engine: 'DarkTube Flow Engine (/flow)',
    offer,
    angle,
    template: {
      id: t.id,
      name: t.name,
      niche: t.niche,
    },
    projectId: savedProject ? savedProject.id : `flow_${Date.now()}`,
    flowUrl: `${DARKTUBE_BASE_URL}/flow`,
    creative: {
      title: generatedScript.title,
      hook: generatedScript.seo?.hook || selectedPreset.hook,
      copyMetaAds: selectedPreset.copy,
      takesCount: takesWithPrompts.length,
      takes: takesWithPrompts,
    },
    status: 'ready_in_flow',
  };
}

/**
 * 3. Faz o download do arquivo de vídeo para a pasta interna ./midia/criativos/ do projeto atual.
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
 * 4. Renderização procedural opcional via Remotion Server (quando o serviço estiver rodando).
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

  const endpoint = input.isDraft
    ? `${REMOTION_SERVER_URL}/render-draft`
    : `${REMOTION_SERVER_URL}/render`;

  console.log(`[MCP DarkTube] Disparando render para ${endpoint}...`);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      historyId,
      templateId,
      composition,
      callbackUrl: `${DARKTUBE_BASE_URL}/api/mcp/callback`,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Falha no Remotion Server (${res.status}): ${errorText}`);
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

  return {
    success: true,
    historyId,
    videoUrl,
    contactSheetUrl: sheetUrl,
    isDraft: Boolean(input.isDraft),
  };
}
