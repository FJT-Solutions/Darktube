/**
 * Ferramentas (Tools) do MCP DarkTube para integração com agentes externos (ex: X1).
 * Suporta o Pipeline 3 (Híbrido):
 * - pipeline_mode: 'remotion' -> Renderiza o MP4 real via Remotion Server com timeout de 5 min e baixa para ./midia/criativos/.
 * - pipeline_mode: 'flow'     -> Cria o projeto no /flow, gera roteiro por IA, enfileira takes para o Google Flow e registra no PostgreSQL.
 * - pipeline_mode: 'script_only' -> Gera o roteiro estruturado e a copy do Meta Ads sem disparar renders.
 */

import fs from 'fs';
import path from 'path';
import { FLOW_TEMPLATES, getFlowTemplate, type FlowTemplate } from '@/lib/flow-templates';
import { VIDEO_MODELS, TAKE_SECONDS } from '@/lib/flow-template-base';
import {
  buildSystemPrompt,
  buildTakePrompt,
  takeReference,
  extractJson,
  normalizeScript,
  validateScript,
  type FlowParams,
  type FlowScript,
  type FlowCharacter,
} from '@/lib/flow-script';
import { buildSheetPrompt } from '@/lib/flow-characters';
import { callFlowLLM } from '@/lib/flow-llm';
import { createFlowProject, updateFlowProject } from '@/lib/flow-projects';
import { createFlowJob } from '@/lib/flow-jobs';
import { assembleFlowProject } from '@/lib/flow-assemble';
import { getUserApiKey } from '@/lib/database';
import { pool } from '@/lib/db-client';

const DARKTUBE_BASE_URL = process.env.DARKTUBE_BASE_URL || 'https://darktube.fjt-solutions.com';

/**
 * URLs candidatas do serviço Remotion (Docker interno no Coolify ou local).
 */
const CANDIDATE_URLS = [
  'http://n8n-remotionservice-ry6eh9:3001',
  process.env.REMOTION_SERVICE_URL?.replace(/\/render\/?$/, ''),
  process.env.REMOTION_SERVER_URL,
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://remotion-service:3001',
].filter(Boolean) as string[];

export type PipelineMode = 'remotion' | 'flow' | 'script_only';

export interface CampaignCharacterInput {
  name?: string;
  description?: string;
  voice?: string;
  sheetUrl?: string; // Imagem/folha de referência já existente
  generateSheet?: boolean; // Se true e não houver sheetUrl, gera a folha via IA
}

export interface CampaignCreativeInput {
  offer: string;
  angle?: 'pao-frigideira' | 'doce-sem-culpa' | 'mosaico-365' | string;
  pipelineMode?: PipelineMode;
  templateId?: string;
  videoModel?: string;
  secondsPerTake?: number;
  quality?: string;
  format?: '9:16' | '1:1' | '16:9';
  takesCount?: number;
  benefits?: string;
  customIdea?: string;
  character?: CampaignCharacterInput;
  templateParams?: Record<string, string | number>;
  isDraft?: boolean;
  downloadLocal?: boolean;
  outputDir?: string;
  queueTakes?: boolean;
  waitForSeconds?: number;
}

export interface GetCreativeStatusInput {
  projectId: string;
  assembleIfReady?: boolean;
  downloadLocal?: boolean;
  outputDir?: string;
  waitForSeconds?: number;
}

export interface AssembleCreativeInput {
  projectId: string;
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
 * 1. Lista todos os templates oficiais disponíveis no DarkTube Flow com tempos e modelos.
 */
export async function listFlowTemplates() {
  return FLOW_TEMPLATES.map((t) => {
    const takes = t.defaults?.takes || 5;
    const seconds = t.defaults?.seconds || 6;
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      niche: t.niche,
      subniche: t.subniche,
      length: t.length,
      trend: t.trend,
      videoModel: t.defaults?.model || 'Omni 1.2 Flash',
      secondsPerTake: seconds,
      defaultTakesCount: takes,
      totalDurationSeconds: takes * seconds,
      availableModels: VIDEO_MODELS.map((m) => m.value),
      availableSeconds: TAKE_SECONDS,
      beats: t.beats,
      defaults: t.defaults,
      fields: t.fields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        default: f.default,
        options: f.options,
      })),
    };
  });
}

/**
 * Resolve o usuário padrão no banco do DarkTube para vincular projetos.
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
 * 3. Renderiza a composição real no Remotion Server (com timeout de 5 minutos e pool de candidatos).
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
        signal: AbortSignal.timeout(300000), // 5 minutos para permitir compilação e render do Chromium
      });

      if (attempt.ok) {
        res = attempt;
        console.log(`[MCP DarkTube] Remotion render concluído com sucesso em ${cleanBase}!`);
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
 * 4. Pipeline 3 (Híbrido):
 * - pipelineMode: 'remotion' (Padrão) -> Renderiza na hora o MP4 real com cortes, legendas pop e baixa localmente.
 * - pipelineMode: 'flow'              -> Cria projeto oficial no /flow, gera prompts e enfileira no Google Flow.
 * - pipelineMode: 'script_only'       -> Gera o roteiro e copy para o Meta Ads sem disparar renders.
 */
export async function createCampaignCreative(input: CampaignCreativeInput) {
  const {
    offer,
    angle = 'pao-frigideira',
    pipelineMode = 'remotion',
    templateId = 'produto-tiktok-shop',
    videoModel,
    secondsPerTake,
    quality,
    format = '9:16',
    takesCount,
    benefits = '',
    customIdea = '',
    templateParams = {},
    isDraft = true,
    downloadLocal = true,
    outputDir = './midia/criativos',
    queueTakes = true,
    waitForSeconds: rawWaitForSeconds,
  } = input;
  const waitForSeconds = rawWaitForSeconds ?? (pipelineMode === 'flow' && queueTakes ? 600 : 0);

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
          action: 'Mãos partindo um pãozinho dourado e fofinho recém-saído da frigideira. Vapor quente subindo da massa aerada.',
          camera: 'macro close-up on hands opening the steaming bread',
          line: 'Você não precisa cortar o pão quentinho de manhã para desinchar a barriga...',
        },
        {
          index: 1,
          durationSeconds: 4,
          captionText: 'Essa receita leva só 3 ingredientes e fica pronta em 5 minutos na frigideira!',
          animationStyle: 'kenburns-right',
          transitionIn: 'slide-right',
          textEffect: 'pop',
          action: 'Massa cremosa caindo na frigideira antiaderente untada, dourando rapidamente com bolhas suaves.',
          camera: 'medium overhead angle of skillet on small stove',
          line: 'Essa receita leva só 3 ingredientes simples e fica pronta em 5 minutos na frigideira!',
        },
        {
          index: 2,
          durationSeconds: 4,
          captionText: 'Sem glúten, sem açúcar e sem lactose, tão fofinho que derrete a manteiga.',
          animationStyle: 'kenburns-left',
          transitionIn: 'fade',
          textEffect: 'pop',
          action: 'Uma fatia de manteiga derretendo sobre o pão ainda quente no prato rústico.',
          camera: 'close-up shot on melting butter dripping down bread crust',
          line: 'É 100% sem glúten, sem açúcar e sem leite. Tão macio que derrete na boca.',
        },
        {
          index: 3,
          durationSeconds: 5,
          captionText: 'Toque em Saiba Mais para receber as 365 receitas direto no seu WhatsApp!',
          animationStyle: 'kenburns-center',
          transitionIn: 'slide-up',
          textEffect: 'bounce',
          action: 'Smartphone na mão exibindo a capa digital das 365 Receitas com botão verde de WhatsApp.',
          camera: 'medium eye-level shot pointing down towards screen',
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
          animationStyle: 'kenburns-center',
          transitionIn: 'fade',
          textEffect: 'pop',
          action: 'Pedaço generoso de brownie de chocolate escuro e úmido com morangos frescos ao redor.',
          camera: 'macro push-in on rich dark chocolate brownie texture',
          line: 'Pare de passar vontade de comer doce achando que vai engordar...',
        },
        {
          index: 1,
          durationSeconds: 4,
          captionText: 'Esse brownie cremoso de cacau não leva nem um grama de açúcar refinado ou trigo.',
          animationStyle: 'kenburns-right',
          transitionIn: 'slide-right',
          textEffect: 'pop',
          action: 'Colher afundando lentamente na textura macia do brownie revelando o centro cremoso.',
          camera: 'slow tilt-down following dessert spoon cutting the slice',
          line: 'Esse brownie cremoso de cacau não leva nem um grama de açúcar refinado ou trigo.',
        },
        {
          index: 2,
          durationSeconds: 4,
          captionText: 'Mata a fissura por doce sem dar pico de glicose e ajuda a manter o foco.',
          animationStyle: 'kenburns-left',
          transitionIn: 'fade',
          textEffect: 'pop',
          action: 'Prato gourmet pronto com calda de cacau 70% brilhante sobre a mesa elegante.',
          camera: 'steady eye-level close-up with appetizing natural light',
          line: 'Mata a fissura por doce sem dar pico de glicose e ajuda a manter o foco.',
        },
        {
          index: 3,
          durationSeconds: 5,
          captionText: 'Toque em Saiba Mais para ter sobremesas saudáveis todos os dias!',
          animationStyle: 'kenburns-center',
          transitionIn: 'slide-up',
          textEffect: 'bounce',
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
          animationStyle: 'kenburns-center',
          transitionIn: 'fade',
          textEffect: 'pop',
          action: 'Mesa farta e colorida com 3 pratos diferentes: salada vibrante, quiche e sobremesa saudável.',
          camera: 'wide overhead dynamic shot panning over healthy food layout',
          line: 'Cansada de comer sempre a mesma comida sem graça na dieta?',
        },
        {
          index: 1,
          durationSeconds: 4,
          captionText: 'São 365 receitas completas: café da manhã, almoço, lanche e jantar.',
          animationStyle: 'kenburns-right',
          transitionIn: 'slide-right',
          textEffect: 'pop',
          action: 'Páginas do livro de receitas sendo folheadas com fotos de pratos reais apetitosos.',
          camera: 'close-up tracking hands flipping through recipe handbook',
          line: 'São 365 receitas completas: café da manhã, almoço, lanche e jantar.',
        },
        {
          index: 2,
          durationSeconds: 4,
          captionText: 'Tudo com ingredientes simples que você já tem em casa.',
          animationStyle: 'kenburns-left',
          transitionIn: 'fade',
          textEffect: 'pop',
          action: 'Mãos preparando uma receita em apenas 10 minutos na bancada da cozinha.',
          camera: 'quick medium cut showing fast assembly in frying pan',
          line: 'Tudo com ingredientes simples que você já tem em casa.',
        },
        {
          index: 3,
          durationSeconds: 5,
          captionText: 'Toque abaixo e receba o material completo com valor promocional!',
          animationStyle: 'kenburns-center',
          transitionIn: 'slide-up',
          textEffect: 'bounce',
          action: 'Apresentação visual da oferta com celular e mensagem do WhatsApp.',
          camera: 'medium presenter shot pointing to WhatsApp link',
          line: 'Toque abaixo e receba o material completo com valor promocional!',
        },
      ],
    },
  };

  const selectedPreset = presets[angle] || presets['pao-frigideira'];

  // ── CAMINHO 1: REMOTION RENDER (Vídeo Real em MP4 entregue na hora) ──
  if (pipelineMode === 'remotion') {
    console.log(`[MCP DarkTube] Disparando Pipeline 3 (Remotion MP4) para oferta=${offer}, angulo=${angle}...`);

    const renderResult = await renderCreative({
      templateId: 'ShortVideo',
      scenes: selectedPreset.scenes,
      format: format === '9:16' ? 'vertical' : 'horizontal',
      isDraft,
      downloadLocal,
      outputDir,
    });

    const totalDuration = selectedPreset.scenes.reduce((sum: number, sc: any) => sum + (sc.durationSeconds || 4), 0);

    return {
      success: true,
      pipelineMode: 'remotion',
      engine: 'Remotion Render Server (:3001)',
      offer,
      angle,
      videoModel: 'Remotion React / Chromium Headless',
      totalDurationSeconds: totalDuration,
      scenesCount: selectedPreset.scenes.length,
      format,
      title: selectedPreset.title,
      copyMetaAds: selectedPreset.copy,
      videoUrl: renderResult.videoUrl,
      contactSheetUrl: renderResult.contactSheetUrl,
      isDraft,
      localFile: renderResult.localFile,
      status: 'video_delivered',
    };
  }

  // ── CAMINHO 2: NATIVO DO /FLOW (Google Flow Takes + Fila + Whisper) ──
  if (pipelineMode === 'flow') {
    console.log(`[MCP DarkTube] Disparando Pipeline 3 (Nativo do /flow) para oferta=${offer}...`);
    const t: FlowTemplate = getFlowTemplate(templateId) || getFlowTemplate('produto-tiktok-shop') || FLOW_TEMPLATES[0];

    const resolvedTakesCount = takesCount || t.defaults?.takes || 4;
    const resolvedSeconds = secondsPerTake || t.defaults?.seconds || 6;
    const resolvedModel = videoModel || t.defaults?.model || 'Omni 1.2 Flash';
    const resolvedQuality = quality || t.defaults?.quality || '360p';

    const params: FlowParams = {
      tema: `${offer} - ${selectedPreset.title}`,
      produto: offer,
      beneficios: benefits || 'Sem glúten, sem açúcar, sem lactose, pronto em 5 minutos',
      estilo: angle === 'pao-frigideira' ? 'dor' : 'objecao',
      roteiro: customIdea || '',
      idioma: 'pt-BR',
      realismo: t.defaults?.realismo || 'cinematografico',
      takes: resolvedTakesCount,
      seconds: resolvedSeconds,
      aspect: format === '9:16' ? '9:16' : '16:9',
      model: resolvedModel,
      quality: resolvedQuality,
      ...templateParams,
    };

    if (templateId === 'receita-viral') {
      if (!params.prato) params.prato = offer;
      if (!params.voz) params.voz = 'sem_voz';
      if (!params.tipo) params.tipo = 'tres_ingredientes';
      if (!params.cta) params.cta = 'RECEITA';
    }

    let script: FlowScript | null = null;
    const defaultUserId = await resolveDefaultUserId().catch(() => '');
    const userOpenAiKey = defaultUserId ? await getUserApiKey(defaultUserId, 'openai').catch(() => '') : '';
    const apiKey = userOpenAiKey;

    if (!apiKey) {
      throw new Error('Chave da OpenAI não configurada nas credenciais da conta (public.user_api_keys). Cadastre a chave no painel de credenciais para criar o roteiro.');
    }

    try {
      const system = buildSystemPrompt(t, params);
      const text = await callFlowLLM('openai', apiKey, system, `Gere o roteiro de anúncio para "${offer}".`);
      const json = extractJson(text);
      if (json && typeof json === 'object') {
        script = normalizeScript(json, t, params);
      }
    } catch (err: any) {
      throw new Error(`Falha ao gerar roteiro via OpenAI LLM: ${err.message}`);
    }

    if (!script) {
      throw new Error('A IA da OpenAI não retornou um roteiro estruturado válido.');
    }

    const finalScript: FlowScript = script;

    if (input.character) {
      const charInput = input.character;
      const charId = 'c1';
      const existingCharIndex = finalScript.characters.findIndex((c) => c.id === charId);
      const newChar: FlowCharacter = {
        id: charId,
        name: charInput.name || 'Apresentador',
        description: charInput.description || 'Pessoa comunicativa e expressiva',
        voice: charInput.voice || 'natural',
        sheetUrl: charInput.sheetUrl,
        sheetStatus: charInput.sheetUrl ? 'aprovada' : (charInput.generateSheet ? 'aguardando' : undefined),
      };

      if (existingCharIndex >= 0) {
        finalScript.characters[existingCharIndex] = newChar;
      } else {
        finalScript.characters.unshift(newChar);
      }
    }

    let savedProject = null;
    try {
      const userId = await resolveDefaultUserId();
      savedProject = await createFlowProject({
        userId,
        templateId: t.id,
        params,
        script: finalScript,
        provider: apiKey ? 'openai' : 'preset',
      });

      if (queueTakes) {
        // Se pediu para gerar a folha do personagem por IA e ele ainda não tem foto anexada:
        if (input.character?.generateSheet && !input.character.sheetUrl && finalScript.characters[0]) {
          const charToGenerate = finalScript.characters[0];
          const sheetPrompt = buildSheetPrompt(charToGenerate, String(params.realismo || ''));
          await createFlowJob({
            userId,
            kind: 'image',
            prompt: sheetPrompt,
            params: { resolution: '360p', model: 'Omni 1.2 Flash' },
            projectId: savedProject.id,
            takeIndex: 0,
            role: 'character_sheet',
            deadlineMinutes: 720,
          });
        }

        for (const take of finalScript.takes) {
          const ref = takeReference(finalScript, take, params);
          const prompt = buildTakePrompt(finalScript, take, params, t, ref);
          await createFlowJob({
            userId,
            kind: 'video',
            prompt,
            params: {
              aspectRatio: String(params.aspect),
              duration: take.seconds || resolvedSeconds,
              resolution: resolvedQuality,
              model: resolvedModel,
              ...(ref.refImageUrl ? { refImageUrl: ref.refImageUrl } : {}),
            },
            projectId: savedProject.id,
            takeIndex: take.n,
            role: 'take',
            deadlineMinutes: 720,
          });
        }
        await updateFlowProject(userId, savedProject.id, { status: 'queued' });
      }
    } catch (dbErr: any) {
      console.warn(`[MCP DarkTube] Banco de dados: ${dbErr.message}`);
    }

    const totalDuration = finalScript.takes.reduce((sum, tk) => sum + (tk.seconds || resolvedSeconds), 0);

    // Se o solicitante pediu para aguardar a conclusão no Flow:
    if (waitForSeconds > 0 && savedProject?.id && queueTakes) {
      console.log(`[MCP DarkTube] Aguardando até ${waitForSeconds}s para conclusão dos takes no Google Flow...`);
      const startWait = Date.now();
      const maxMs = waitForSeconds * 1000;
      while (Date.now() - startWait < maxMs) {
        await new Promise((r) => setTimeout(r, 5000));
        try {
          const statusResult = await getCreativeStatus({
            projectId: savedProject.id,
            assembleIfReady: true,
            downloadLocal,
            outputDir,
          });
          if (statusResult.isComplete && statusResult.finalVideoUrl) {
            return {
              success: true,
              pipelineMode: 'flow',
              engine: 'DarkTube Flow Engine (/flow + Google Flow Queue)',
              offer,
              angle,
              projectId: savedProject.id,
              flowUrl: `${DARKTUBE_BASE_URL}/flow`,
              videoModel: resolvedModel,
              totalDurationSeconds: totalDuration,
              title: finalScript.title,
              hook: finalScript.seo?.hook || selectedPreset.hook,
              copyMetaAds: selectedPreset.copy,
              character: statusResult.character,
              finalVideoUrl: statusResult.finalVideoUrl,
              srtUrl: statusResult.srtUrl,
              takes: statusResult.takes,
              localFiles: statusResult.localFiles,
              status: 'video_delivered',
            };
          }
        } catch (pollErr: any) {
          console.warn(`[MCP DarkTube] Polling status: ${pollErr.message}`);
        }
      }
    }

    return {
      success: true,
      pipelineMode: 'flow',
      engine: 'DarkTube Flow Engine (/flow + Google Flow Queue)',
      offer,
      angle,
      projectId: savedProject?.id || `flow_${Date.now()}`,
      flowUrl: `${DARKTUBE_BASE_URL}/flow`,
      videoModel: resolvedModel,
      secondsPerTake: resolvedSeconds,
      takesCount: finalScript.takes.length,
      totalDurationSeconds: totalDuration,
      aspectRatio: String(params.aspect),
      quality: resolvedQuality,
      title: finalScript.title,
      hook: finalScript.seo?.hook || selectedPreset.hook,
      copyMetaAds: selectedPreset.copy,
      character: finalScript.characters[0]
        ? {
            name: finalScript.characters[0].name,
            description: finalScript.characters[0].description,
            voice: finalScript.characters[0].voice,
            sheetUrl: finalScript.characters[0].sheetUrl || null,
            sheetStatus: finalScript.characters[0].sheetStatus || (input.character?.generateSheet ? 'aguardando' : 'nenhuma'),
          }
        : undefined,
      takes: finalScript.takes.map((take) => {
        const ref = takeReference(finalScript, take, params);
        return {
          n: take.n,
          seconds: take.seconds || resolvedSeconds,
          line: take.line,
          action: take.action,
          prompt: buildTakePrompt(finalScript, take, params, t, ref),
          referenceImage: ref.refImageUrl || null,
        };
      }),
      status: queueTakes ? 'queued_for_google_flow' : 'created_in_flow',
    };
  }

  // ── CAMINHO 3: SCRIPT ONLY (Apenas roteiro e copy) ──
  const totalDuration = selectedPreset.scenes.reduce((sum: number, sc: any) => sum + (sc.durationSeconds || 4), 0);

  return {
    success: true,
    pipelineMode: 'script_only',
    offer,
    angle,
    totalDurationSeconds: totalDuration,
    scenesCount: selectedPreset.scenes.length,
    title: selectedPreset.title,
    copyMetaAds: selectedPreset.copy,
    scenes: selectedPreset.scenes,
    status: 'script_ready',
  };
}

/**
 * 5. Consulta o status de um projeto no /flow (takes prontos, erros, folha de personagem e vídeo final montado).
 */
export async function getCreativeStatus(input: GetCreativeStatusInput): Promise<any> {
  const { projectId: rawProjectId, assembleIfReady = false, downloadLocal = false, outputDir = './midia/criativos', waitForSeconds = 0 } = input;

  if (waitForSeconds > 0) {
    const startWait = Date.now();
    const maxMs = waitForSeconds * 1000;
    while (Date.now() - startWait < maxMs) {
      const current = await getCreativeStatus({
        projectId: rawProjectId,
        assembleIfReady,
        downloadLocal,
        outputDir,
        waitForSeconds: 0,
      });
      if (current.finalVideoUrl || (current.progress.failedTakes > 0 && current.progress.inProgressTakes === 0)) {
        return current;
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  const { rows: projRows } = await pool.query(
    'SELECT * FROM public.flow_projects WHERE id::text = $1 OR id::text LIKE $2 ORDER BY created_at DESC LIMIT 1',
    [rawProjectId, `${rawProjectId}%`]
  );
  if (!projRows || projRows.length === 0) {
    throw new Error(`Projeto "${rawProjectId}" não foi encontrado no banco de dados.`);
  }
  const project = projRows[0];
  const projectId = String(project.id);
  const userId = project.user_id;

  const { rows: jobs } = await pool.query(
    'SELECT id, take_index, kind, role, status, result_url, error_message, finished_at FROM public.flow_jobs WHERE project_id = $1 ORDER BY take_index ASC NULLS FIRST',
    [projectId]
  );

  const charJob = jobs.find((j: any) => j.role === 'character_sheet');
  const takeJobs = jobs.filter((j: any) => j.role === 'take' || j.kind === 'video');

  const charSheetUrl = charJob?.result_url
    ? (charJob.result_url.startsWith('http') ? charJob.result_url : `${DARKTUBE_BASE_URL}${charJob.result_url}`)
    : (project.script?.characters?.[0]?.sheetUrl || null);

  const totalTakes = project.script?.takes?.length || takeJobs.length;
  const completedTakes = takeJobs.filter((j: any) => j.status === 'done' && j.result_url).length;
  const failedTakes = takeJobs.filter((j: any) => j.status === 'draft' || j.error_message).length;
  const inProgressTakes = takeJobs.filter((j: any) => j.status === 'running' || j.status === 'queued' || j.status === 'collecting').length;

  const allTakesDone = totalTakes > 0 && completedTakes === totalTakes;

  let finalUrl = project.final_url
    ? (project.final_url.startsWith('http') ? project.final_url : `${DARKTUBE_BASE_URL}${project.final_url}`)
    : null;
  let srtUrl = project.srt_url
    ? (project.srt_url.startsWith('http') ? project.srt_url : `${DARKTUBE_BASE_URL}${project.srt_url}`)
    : null;

  if (allTakesDone && !finalUrl && assembleIfReady) {
    try {
      console.log(`[MCP DarkTube] Todos os ${totalTakes} takes prontos! Montando projeto ${projectId}...`);
      const asmResult = await assembleFlowProject(userId, projectId);
      finalUrl = asmResult.finalUrl.startsWith('http') ? asmResult.finalUrl : `${DARKTUBE_BASE_URL}${asmResult.finalUrl}`;
      srtUrl = asmResult.srtUrl ? (asmResult.srtUrl.startsWith('http') ? asmResult.srtUrl : `${DARKTUBE_BASE_URL}${asmResult.srtUrl}`) : null;
    } catch (asmErr: any) {
      console.warn(`[MCP DarkTube] Erro na montagem automática: ${asmErr.message}`);
    }
  }

  let localFiles: Record<string, any> = {};
  if (downloadLocal) {
    if (finalUrl) {
      localFiles.finalVideo = await downloadCreativeToLocal(finalUrl, outputDir, `flow_final_${projectId}.mp4`);
    }
    if (charSheetUrl) {
      localFiles.characterSheet = await downloadCreativeToLocal(charSheetUrl, outputDir, `character_${projectId}.jpg`);
    }
  }

  return {
    success: true,
    projectId,
    title: project.title,
    status: project.status,
    isComplete: Boolean(finalUrl) || allTakesDone,
    progress: {
      totalTakes,
      completedTakes,
      failedTakes,
      inProgressTakes,
      percent: totalTakes > 0 ? Math.round((completedTakes / totalTakes) * 100) : 0,
    },
    character: {
      name: project.script?.characters?.[0]?.name || 'Apresentador',
      sheetUrl: charSheetUrl,
      status: charJob?.status || (charSheetUrl ? 'done' : 'none'),
    },
    finalVideoUrl: finalUrl,
    srtUrl,
    takes: takeJobs.map((j: any) => ({
      takeIndex: j.take_index,
      kind: j.kind,
      status: j.status,
      videoUrl: j.result_url ? (j.result_url.startsWith('http') ? j.result_url : `${DARKTUBE_BASE_URL}${j.result_url}`) : null,
      error: j.error_message || null,
    })),
    localFiles: Object.keys(localFiles).length > 0 ? localFiles : undefined,
  };
}

/**
 * 6. Dispara a montagem de um projeto do /flow via ffmpeg, gerando o MP4 unificado com legendas.
 */
export async function assembleFlowCreative(input: AssembleCreativeInput) {
  const { projectId: rawProjectId, downloadLocal = true, outputDir = './midia/criativos' } = input;
  const { rows } = await pool.query(
    'SELECT id, user_id FROM public.flow_projects WHERE id::text = $1 OR id::text LIKE $2 ORDER BY created_at DESC LIMIT 1',
    [rawProjectId, `${rawProjectId}%`]
  );
  if (!rows || rows.length === 0) throw new Error(`Projeto "${rawProjectId}" não foi encontrado no banco de dados.`);
  const projectId = String(rows[0].id);
  const userId = rows[0].user_id;

  const asm = await assembleFlowProject(userId, projectId);
  const finalUrl = asm.finalUrl.startsWith('http') ? asm.finalUrl : `${DARKTUBE_BASE_URL}${asm.finalUrl}`;
  const srtUrl = asm.srtUrl ? (asm.srtUrl.startsWith('http') ? asm.srtUrl : `${DARKTUBE_BASE_URL}${asm.srtUrl}`) : null;

  let localFile = null;
  if (downloadLocal && finalUrl) {
    localFile = await downloadCreativeToLocal(finalUrl, outputDir, `flow_final_${projectId}.mp4`);
  }

  return {
    success: true,
    projectId,
    finalUrl,
    srtUrl,
    burned: asm.burned,
    takesCount: asm.takes,
    durationSeconds: asm.seconds,
    localFile,
  };
}
