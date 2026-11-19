/**
 * Ferramentas avancadas do MCP DarkTube para o motor /flow:
 * - darktube_create_next_part: cria Parte 2, Parte 3... continuando um projeto mantendo personagens, retratos e narrador.
 * - darktube_analyze_video_link: baixa um video por link, analisa frame a frame + OCR com a credencial do usuario.
 * - darktube_clone_video_from_link: clona a estrutura de um link aplicando trocas de historia/personagem/ambiente e enfileira no /flow.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pool } from '@/lib/db-client';
import { getUserApiKey } from '@/lib/database';
import { uploadMediaFile } from '@/lib/storage';
import { renderHtmlSvgToMp4 } from '@/lib/html-svg-render';
import type { HtmlSvgProjectSpec } from '@/lib/html-svg-templates';
import { getFlowTemplate, MAX_TAKES, clampSecondsForModel, normalizeRealism, type FlowTemplate } from '@/lib/flow-templates';
import {
  buildRepairPrompt,
  buildSystemPrompt,
  buildTakePrompt,
  carryOverPart,
  extractJson,
  normalizeScript,
  summarizeForNextPart,
  takeReference,
  validateScript,
  type FlowCharacter,
  type FlowParams,
  type FlowScript,
} from '@/lib/flow-script';
import { buildSheetPrompt, isChromaKeyTemplate, isVoiceOnlyCharacter } from '@/lib/flow-characters';
import { callFlowLLM, FLOW_PROVIDERS, type FlowProvider } from '@/lib/flow-llm';
import { createFlowProject, updateFlowProject, type FlowProject } from '@/lib/flow-projects';
import { createFlowJob, normalizeStorageReference, syncProjectQueuedJobsWithReferences } from '@/lib/flow-jobs';
import { analyzeVideoStructureFromLink, buildCloneTemplateAndParams, formatCloneAsVideoMd } from '@/lib/flow-video-clone';
import type { CloneCustomization } from '@/lib/flow-clone-types';
import {
  getCreativeStatus,
  resolveDefaultUserId,
  type CampaignCharacterInput,
} from '@/lib/mcp/darktube-tools';

const DARKTUBE_BASE_URL = process.env.DARKTUBE_BASE_URL || 'https://darktube.fjt-solutions.com';

export interface CreateNextPartInput {
  projectId: string;
  pipelineMode?: 'flow' | 'script_only';
  videoModel?: string;
  secondsPerTake?: number;
  quality?: string;
  takesCount?: number;
  customIdea?: string;
  provider?: FlowProvider;
  queueTakes?: boolean;
  waitForSeconds?: number;
  downloadLocal?: boolean;
  outputDir?: string;
}

export interface AnalyzeVideoLinkInput {
  url: string;
  provider?: FlowProvider;
}

export interface CloneVideoFromLinkInput {
  url: string;
  provider?: FlowProvider;
  pipelineMode?: 'flow' | 'script_only';
  newTheme?: string;
  newCharacter?: string;
  newLocation?: string;
  keepInstructions?: string;
  videoModel?: string;
  secondsPerTake?: number;
  quality?: string;
  format?: '9:16' | '16:9';
  takesCount?: number;
  idioma?: string;
  realismo?: string;
  isHybrid?: boolean;
  wordsPerCaption?: number;
  character?: CampaignCharacterInput;
  queueTakes?: boolean;
  waitForSeconds?: number;
  downloadLocal?: boolean;
  outputDir?: string;
}

/** Resolve qual provedor e chave de IA o usuario possui em Credenciais (priorizando o pedido, senao OpenAI -> outros). */
async function resolveUserLlmCredential(userId: string, preferred?: FlowProvider | string) {
  const defaultPriority: FlowProvider[] = ['openai', 'claude', 'openrouter', 'gemini'];
  const order: FlowProvider[] = [];
  if (preferred && FLOW_PROVIDERS.includes(preferred as FlowProvider)) {
    order.push(preferred as FlowProvider);
  }
  for (const p of defaultPriority) {
    if (!order.includes(p)) order.push(p);
  }
  for (const p of FLOW_PROVIDERS) {
    if (!order.includes(p)) order.push(p);
  }

  const credentials: Array<{ provider: FlowProvider; apiKey: string }> = [];
  let openaiKey = '';

  for (const p of order) {
    const k = await getUserApiKey(userId, p).catch(() => '');
    if (k) {
      credentials.push({ provider: p, apiKey: k });
      if (p === 'openai') openaiKey = k;
    }
  }
  if (!credentials.length) {
    throw new Error('Nenhuma chave de IA (Gemini, OpenAI, Claude ou OpenRouter) configurada em Credenciais.');
  }
  return {
    provider: credentials[0].provider,
    apiKey: credentials[0].apiKey,
    fallbackCredentials: credentials.slice(1),
    openaiKey,
  };
}

/** Gera o roteiro pela IA e executa ate 2 rodadas automaticas de validacao e reparo contra as regras do /flow. */
async function writeValidatedFlowScript(
  provider: FlowProvider,
  apiKey: string,
  t: FlowTemplate,
  params: FlowParams,
  adjust?: (s: FlowScript) => FlowScript
) {
  const fix = adjust ?? ((s: FlowScript) => s);
  const system = buildSystemPrompt(t, params);
  const text = await callFlowLLM(provider, apiKey, system, 'Gere o roteiro agora.');
  let script = fix(normalizeScript(extractJson(text), t, params));
  let issues = validateScript(script, t, params);

  for (let round = 0; round < 2 && issues.some((i) => i.level === 'erro'); round++) {
    try {
      const fixed = await callFlowLLM(
        provider,
        apiKey,
        system,
        buildRepairPrompt(
          script,
          issues.filter((i) => i.level === 'erro')
        )
      );
      const repaired = fix(normalizeScript(extractJson(fixed), t, params));
      const after = validateScript(repaired, t, params);
      if (after.filter((i) => i.level === 'erro').length > issues.filter((i) => i.level === 'erro').length) break;
      script = repaired;
      issues = after;
    } catch {
      break;
    }
  }
  return { script, issues };
}

/** Enfileira retratos de todos os personagens visuais (se pedido) + takes de video no PostgreSQL e opcionalmente aguarda conclusao. */
async function saveAndQueueFlowProject(opts: {
  userId: string;
  template: FlowTemplate;
  params: FlowParams;
  script: FlowScript;
  provider: FlowProvider;
  queueTakes: boolean;
  generateSheet?: boolean;
  hasSheetUrl?: boolean;
  waitForSeconds: number;
  downloadLocal: boolean;
  outputDir: string;
}) {
  const { userId, template, params, script, provider, queueTakes, generateSheet, waitForSeconds, downloadLocal, outputDir } = opts;

  if (generateSheet) {
    script.characters = script.characters.map((c) => {
      if (isVoiceOnlyCharacter(c) || c.sheetUrl) return c;
      return {
        ...c,
        sheetStatus: queueTakes ? 'gerando' : 'aguardando',
      };
    });
  }

  const savedProject = await createFlowProject({
    userId,
    templateId: template.id,
    params,
    script,
    provider,
  });

  const resolvedModel = String(params.model || template.defaults.model || 'Omni 1.2 Flash');
  const resolvedSeconds = Number(params.seconds) || template.defaults.seconds || 6;
  const resolvedQuality = String(params.quality || template.defaults.quality || '360p');

  if (queueTakes) {
    if (generateSheet) {
      for (let idx = 0; idx < script.characters.length; idx++) {
        const charToGenerate = script.characters[idx];
        if (isVoiceOnlyCharacter(charToGenerate) || charToGenerate.sheetUrl) continue;
        const sheetPrompt = buildSheetPrompt(charToGenerate, String(params.realismo || ''), isChromaKeyTemplate(template.id));
        await createFlowJob({
          userId,
          kind: 'image',
          prompt: sheetPrompt,
          params: {
            aspectRatio: String(params.aspect || '9:16'),
            model: 'Nano Banana',
            characterId: charToGenerate.id,
          },
          projectId: savedProject.id,
          takeIndex: idx,
          role: 'character_sheet',
          deadlineMinutes: 720,
        });
      }
    }

    for (const take of script.takes) {
      const ref = takeReference(script, take, params);
      const prompt = buildTakePrompt(script, take, params, template, ref);
      await createFlowJob({
        userId,
        kind: 'video',
        prompt,
        params: {
          aspectRatio: String(params.aspect || '9:16'),
          duration: take.seconds || resolvedSeconds,
          resolution: resolvedQuality,
          model: take.model || resolvedModel,
          ...(ref.refImageUrl ? { refImageUrl: normalizeStorageReference(ref.refImageUrl, 'refImageUrl') } : {}),
        },
        projectId: savedProject.id,
        takeIndex: take.n,
        role: 'take',
        deadlineMinutes: 720,
      });
    }
    await updateFlowProject(userId, savedProject.id, { status: 'queued' });
  }

  let completedStatus: any = null;
  if (waitForSeconds > 0 && queueTakes) {
    const startWait = Date.now();
    const maxMs = waitForSeconds * 1000;
    while (Date.now() - startWait < maxMs) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const st = await getCreativeStatus({
          projectId: savedProject.id,
          assembleIfReady: true,
          downloadLocal,
          outputDir,
        });
        if (st.awaitingCharacterApproval || (st.isComplete && st.finalVideoUrl)) {
          completedStatus = st;
          break;
        }
      } catch {}
    }
  }

  return { savedProject, completedStatus, resolvedModel, resolvedSeconds, resolvedQuality };
}

function summarizeTakes(script: FlowScript, params: FlowParams, template: FlowTemplate, fallbackSec: number, fallbackModel: string) {
  return script.takes.map((take) => {
    const ref = takeReference(script, take, params);
    return {
      n: take.n,
      seconds: take.seconds || fallbackSec,
      model: take.model || fallbackModel,
      line: take.line,
      action: take.action,
      prompt: buildTakePrompt(script, take, params, template, ref),
      referenceImage: ref.refImageUrl ? (normalizeStorageReference(ref.refImageUrl, 'refImageUrl') || null) : null,
      transition: take.transition || 'cut',
      sfx: take.sfx || 'none',
    };
  });
}

/**
 * 8. Cria a proxima parte (Parte 2, Parte 3...) de um projeto do /flow via MCP,
 * herdando personagens, retratos aprovados e voz do narrador da parte anterior.
 */
export async function createNextPartCreative(input: CreateNextPartInput) {
  const {
    projectId: rawProjectId,
    pipelineMode = 'flow',
    videoModel,
    secondsPerTake,
    quality,
    takesCount,
    customIdea,
    provider: preferredProvider,
    queueTakes = true,
    waitForSeconds = 0,
    downloadLocal = true,
    outputDir = './midia/criativos',
  } = input;

  const { rows } = await pool.query(
    'SELECT * FROM public.flow_projects WHERE id::text = $1 OR id::text LIKE $2 ORDER BY created_at DESC LIMIT 1',
    [rawProjectId, `${rawProjectId}%`]
  );
  if (!rows || rows.length === 0) {
    throw new Error(`Projeto anterior "${rawProjectId}" não foi encontrado.`);
  }
  const prev = rows[0] as FlowProject;
  const t = getFlowTemplate(prev.template_id);
  if (!t) throw new Error(`Template "${prev.template_id}" do projeto anterior é inválido.`);

  const userId = String(prev.user_id || (await resolveDefaultUserId()));
  const { provider, apiKey } = await resolveUserLlmCredential(userId, preferredProvider || (prev.provider as FlowProvider));

  const part = (Number(prev.params?.parte) || 1) + 1;
  const resolvedModel = videoModel || String(prev.params?.model || t.defaults.model || 'Omni 1.2 Flash');
  const resolvedSeconds = clampSecondsForModel(secondsPerTake || Number(prev.params?.seconds) || t.defaults.seconds, resolvedModel);
  const resolvedTakes = Math.min(MAX_TAKES, Math.max(1, Math.round(takesCount || Number(prev.params?.takes) || t.defaults.takes)));

  const params: FlowParams = {
    ...prev.params,
    model: resolvedModel,
    seconds: resolvedSeconds,
    takes: resolvedTakes,
    ...(quality ? { quality } : {}),
    parte: part,
    parteAnterior: summarizeForNextPart(prev.script),
    roteiro: customIdea ? String(customIdea).slice(0, 8000) : '',
  };

  const { script, issues } = await writeValidatedFlowScript(provider, apiKey, t, params, (s) => carryOverPart(prev.script, s));
  const totalDurationSeconds = script.takes.reduce((sum, tk) => sum + (tk.seconds || resolvedSeconds), 0);

  if (pipelineMode === 'script_only') {
    return {
      success: true,
      pipelineMode: 'script_only',
      part,
      previousProjectId: String(prev.id),
      title: script.title,
      hook: script.seo?.hook || '',
      totalDurationSeconds,
      characters: script.characters,
      takes: summarizeTakes(script, params, t, resolvedSeconds, resolvedModel),
      issues: issues.map((i) => i.message),
      status: 'script_ready',
    };
  }

  const needsAnySheet = script.characters.some((c) => !isVoiceOnlyCharacter(c) && !c.sheetUrl);
  const { savedProject, completedStatus, resolvedQuality } = await saveAndQueueFlowProject({
    userId,
    template: t,
    params,
    script,
    provider,
    queueTakes,
    generateSheet: needsAnySheet,
    hasSheetUrl: !needsAnySheet,
    waitForSeconds,
    downloadLocal,
    outputDir,
  });

  if (completedStatus) {
    return {
      success: true,
      pipelineMode: 'flow',
      part,
      previousProjectId: String(prev.id),
      projectId: savedProject.id,
      flowUrl: `${DARKTUBE_BASE_URL}/flow`,
      title: script.title,
      totalDurationSeconds,
      awaitingCharacterApproval: completedStatus.awaitingCharacterApproval,
      finalVideoUrl: completedStatus.finalVideoUrl,
      srtUrl: completedStatus.srtUrl,
      character: completedStatus.character,
      characters: completedStatus.characters,
      takes: completedStatus.takes,
      localFiles: completedStatus.localFiles,
      status: completedStatus.awaitingCharacterApproval ? 'awaiting_character_approval' : 'video_delivered',
    };
  }

  return {
    success: true,
    pipelineMode: 'flow',
    part,
    previousProjectId: String(prev.id),
    projectId: savedProject.id,
    flowUrl: `${DARKTUBE_BASE_URL}/flow`,
    videoModel: resolvedModel,
    secondsPerTake: resolvedSeconds,
    takesCount: script.takes.length,
    totalDurationSeconds,
    quality: resolvedQuality,
    title: script.title,
    hook: script.seo?.hook || '',
    characters: script.characters,
    takes: summarizeTakes(script, params, t, resolvedSeconds, resolvedModel),
    issues: issues.map((i) => i.message),
    status: queueTakes ? 'queued_for_google_flow' : 'created_in_flow',
  };
}

/**
 * 9. Baixa e analisa um video de referencia por link (frame a frame + OCR visual) via credencial do usuario.
 */
export async function analyzeVideoLinkMcp(input: AnalyzeVideoLinkInput) {
  const userId = await resolveDefaultUserId();
  const { provider, apiKey, fallbackCredentials, openaiKey } = await resolveUserLlmCredential(userId, input.provider);
  const structure = await analyzeVideoStructureFromLink({
    url: input.url,
    provider,
    apiKey,
    openaiKey,
    fallbackCredentials,
  });
  return { success: true, structure, videoMd: formatCloneAsVideoMd(structure) };
}

/**
 * 10. Analisa um video por link e replica sua estrutura no /flow com as trocas pedidas pelo usuario.
 */
export async function cloneVideoFromLinkMcp(input: CloneVideoFromLinkInput) {
  const {
    url,
    provider: preferredProvider,
    pipelineMode = 'flow',
    newTheme,
    newCharacter,
    newLocation,
    keepInstructions,
    videoModel,
    secondsPerTake,
    quality,
    format,
    takesCount,
    idioma = 'pt-BR',
    realismo,
    isHybrid = true,
    wordsPerCaption = 2,
    character,
    queueTakes = true,
    waitForSeconds = 0,
    downloadLocal = true,
    outputDir = './midia/criativos',
  } = input;

  const userId = await resolveDefaultUserId();
  const { provider, apiKey, fallbackCredentials, openaiKey } = await resolveUserLlmCredential(userId, preferredProvider);

  const structure = await analyzeVideoStructureFromLink({
    url,
    provider,
    apiKey,
    openaiKey,
    fallbackCredentials,
  });

  const resolvedModel = videoModel || structure.recommendedModel || 'Omni 1.2 Flash';
  const resolvedSeconds = clampSecondsForModel(secondsPerTake || structure.recommendedSeconds || 6, resolvedModel);
  const resolvedTakes = Math.min(MAX_TAKES, Math.max(1, Math.round(takesCount || structure.recommendedTakes || structure.beats.length || 5)));
  const resolvedAspect = format === '16:9' ? '16:9' : format === '9:16' ? '9:16' : structure.aspect;

  const custom: CloneCustomization = { newTheme, newCharacter, newLocation, keepInstructions };
  const baseParams: FlowParams = {
    idioma: idioma || structure.language || 'pt-BR',
    realismo: normalizeRealism(realismo || structure.visualStyle || 'cinematografico'),
    takes: resolvedTakes,
    seconds: resolvedSeconds,
    aspect: resolvedAspect,
    model: resolvedModel,
    quality: quality || '360p',
    isHybrid,
    wordsPerCaption,
    refImages: '1',
    refPrevVideo: '0',
  };

  const { template, params } = buildCloneTemplateAndParams(structure, custom, baseParams);
  const { script, issues } = await writeValidatedFlowScript(provider, apiKey, template, params);

  if (character) {
    const newChar: FlowCharacter = {
      id: 'c1',
      name: character.name || script.characters[0]?.name || 'Apresentador',
      description: character.description || script.characters[0]?.description || 'Adult presenter in natural lighting',
      voice: character.voice || script.characters[0]?.voice || 'natural',
      sheetUrl: character.sheetUrl ? (normalizeStorageReference(character.sheetUrl, 'character.sheetUrl') || undefined) : undefined,
      sheetStatus: character.sheetUrl ? 'aprovada' : character.generateSheet ? (queueTakes ? 'gerando' : 'aguardando') : undefined,
    };
    if (script.characters.length > 0) script.characters[0] = newChar;
    else script.characters.unshift(newChar);
  }

  const totalDurationSeconds = script.takes.reduce((sum, tk) => sum + (tk.seconds || resolvedSeconds), 0);

  if (pipelineMode === 'script_only') {
    return {
      success: true,
      pipelineMode: 'script_only',
      structure,
      title: script.title,
      hook: script.seo?.hook || '',
      totalDurationSeconds,
      characters: script.characters,
      takes: summarizeTakes(script, params, template, resolvedSeconds, resolvedModel),
      issues: issues.map((i) => i.message),
      status: 'script_ready',
    };
  }

  const { savedProject, completedStatus, resolvedQuality } = await saveAndQueueFlowProject({
    userId,
    template,
    params,
    script,
    provider,
    queueTakes,
    generateSheet: Boolean(character?.generateSheet),
    hasSheetUrl: script.characters.every((c) => isVoiceOnlyCharacter(c) || Boolean(c.sheetUrl)),
    waitForSeconds,
    downloadLocal,
    outputDir,
  });

  if (completedStatus) {
    return {
      success: true,
      pipelineMode: 'flow',
      projectId: savedProject.id,
      flowUrl: `${DARKTUBE_BASE_URL}/flow`,
      structure,
      title: script.title,
      totalDurationSeconds,
      awaitingCharacterApproval: completedStatus.awaitingCharacterApproval,
      finalVideoUrl: completedStatus.finalVideoUrl,
      srtUrl: completedStatus.srtUrl,
      character: completedStatus.character,
      characters: completedStatus.characters,
      takes: completedStatus.takes,
      localFiles: completedStatus.localFiles,
      status: completedStatus.awaitingCharacterApproval ? 'awaiting_character_approval' : 'video_delivered',
    };
  }

  return {
    success: true,
    pipelineMode: 'flow',
    projectId: savedProject.id,
    flowUrl: `${DARKTUBE_BASE_URL}/flow`,
    structure,
    videoModel: resolvedModel,
    secondsPerTake: resolvedSeconds,
    takesCount: script.takes.length,
    totalDurationSeconds,
    quality: resolvedQuality,
    title: script.title,
    hook: script.seo?.hook || '',
    characters: script.characters,
    takes: summarizeTakes(script, params, template, resolvedSeconds, resolvedModel),
    issues: issues.map((i) => i.message),
    status: queueTakes ? 'queued_for_google_flow' : 'created_in_flow',
  };
}

export interface CharacterDecisionInput {
  characterId: string;
  decision: 'approve' | 'reject' | 'regenerate';
  newDescription?: string;
  sheetUrl?: string;
}

export interface ReviewProjectCharactersInput {
  projectId: string;
  approveAll?: boolean;
  realismo?: string;
  decisions?: CharacterDecisionInput[];
  waitForSeconds?: number;
  downloadLocal?: boolean;
  outputDir?: string;
}

/**
 * 11. Aprova ou reprova/regenera as folhas de todos os personagens de um projeto no /flow.
 * Quando todos os personagens visuais ficam com sheetStatus = 'aprovada', a trava do claimNextFlowJob
 * destrava automaticamente os takes de video enfileirados.
 */
export async function reviewProjectCharactersMcp(input: ReviewProjectCharactersInput) {
  const {
    projectId: rawProjectId,
    approveAll = false,
    realismo: newRealismo,
    decisions = [],
    waitForSeconds = 0,
    downloadLocal = true,
    outputDir = './midia/criativos',
  } = input;

  const { rows } = await pool.query(
    'SELECT * FROM public.flow_projects WHERE id::text = $1 OR id::text LIKE $2 ORDER BY created_at DESC LIMIT 1',
    [rawProjectId, `${rawProjectId}%`]
  );
  if (!rows || rows.length === 0) {
    throw new Error(`Projeto "${rawProjectId}" não foi encontrado.`);
  }
  const project = rows[0] as FlowProject;
  const projectId = String(project.id);
  const userId = String(project.user_id || (await resolveDefaultUserId()));
  const script: FlowScript = JSON.parse(JSON.stringify(project.script));
  const params: FlowParams = { ...(project.params || {}) };
  if (newRealismo && String(newRealismo).trim()) {
    params.realismo = normalizeRealism(String(newRealismo));
  } else if (params.realismo) {
    params.realismo = normalizeRealism(String(params.realismo));
  }
  const templateId = String(project.template_id || '');

  const regeneratedIds: string[] = [];
  const approvedIds: string[] = [];

  for (let idx = 0; idx < script.characters.length; idx++) {
    const c = script.characters[idx];
    if (isVoiceOnlyCharacter(c)) continue;

    const match = decisions.find(
      (d) =>
        d.characterId.toLowerCase() === String(c.id).toLowerCase() ||
        d.characterId.toLowerCase() === String(c.name).toLowerCase()
    );

    const action = match?.decision || (approveAll ? 'approve' : undefined);
    if (!action) continue;

    if (action === 'approve') {
      if (match?.sheetUrl) {
        c.sheetUrl = normalizeStorageReference(match.sheetUrl, 'character.sheetUrl') || match.sheetUrl;
      }
      if (c.sheetUrl) {
        c.sheetStatus = 'aprovada';
        approvedIds.push(c.id);
      } else {
        // Se foi pedido para aprovar mas ainda nao tinha sheetUrl gerada, enfileira a geracao da folha:
        c.sheetStatus = 'gerando';
        const sheetPrompt = buildSheetPrompt(c, String(params.realismo || ''), isChromaKeyTemplate(templateId));
        await createFlowJob({
          userId,
          kind: 'image',
          prompt: sheetPrompt,
          params: {
            aspectRatio: String(params.aspect || '9:16'),
            model: 'Nano Banana',
            characterId: c.id,
          },
          projectId,
          takeIndex: idx,
          role: 'character_sheet',
          deadlineMinutes: 720,
        });
        regeneratedIds.push(c.id);
      }
    } else if (action === 'reject' || action === 'regenerate') {
      if (match?.newDescription && match.newDescription.trim()) {
        c.description = match.newDescription.trim();
      }
      c.sheetUrl = undefined;
      c.sheetStatus = 'gerando';
      const sheetPrompt = buildSheetPrompt(c, String(params.realismo || ''), isChromaKeyTemplate(templateId));
      await createFlowJob({
        userId,
        kind: 'image',
        prompt: sheetPrompt,
        params: {
          aspectRatio: String(params.aspect || '9:16'),
          model: 'Nano Banana',
          characterId: c.id,
        },
        projectId,
        takeIndex: idx,
        role: 'character_sheet',
        deadlineMinutes: 720,
      });
      regeneratedIds.push(c.id);
    }
  }

  await updateFlowProject(userId, projectId, { script, params });
  await syncProjectQueuedJobsWithReferences(userId, projectId, script, params, templateId);

  const statusResult = await getCreativeStatus({
    projectId,
    assembleIfReady: true,
    downloadLocal,
    outputDir,
    waitForSeconds,
  });

  return {
    success: true,
    projectId,
    approvedCharacters: approvedIds,
    regeneratedCharacters: regeneratedIds,
    takesUnlocked: script.characters.every((c) => isVoiceOnlyCharacter(c) || c.sheetStatus === 'aprovada' || (!c.sheetStatus && !c.sheetUrl)),
    ...statusResult,
  };
}

export interface RenderHtmlSvgInput extends HtmlSvgProjectSpec {
  isDraft?: boolean;
  downloadLocal?: boolean;
  outputDir?: string;
  fileName?: string;
}

/**
 * 12. Renderiza video em HTML + SVG + fisica deterministica ($0 de creditos IA)
 * via Playwright Chromium + FFmpeg, rodando Motion Checks (Frame 0, paleta hex e duracao).
 */
export async function renderHtmlSvgVideoMcp(input: RenderHtmlSvgInput) {
  const safeBase = String(input.fileName || `htmlsvg_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60);
  const wantLocal = input.downloadLocal !== false;
  const targetDir = wantLocal
    ? path.resolve(process.cwd(), input.outputDir || './midia/criativos')
    : os.tmpdir();
  const outputPath = path.join(targetDir, `${safeBase}.mp4`);

  const rendered = await renderHtmlSvgToMp4({
    spec: input,
    outputPath,
    draft: Boolean(input.isDraft),
  });

  let storageUrl: string | null = null;
  try {
    const buf = fs.readFileSync(rendered.outputPath);
    const storagePath = await uploadMediaFile(buf, `${safeBase}_${Date.now()}.mp4`, 'video/mp4');
    storageUrl = `https://darktube.fjt-solutions.com${storagePath}`;
  } catch {
    // Segue sem falhar se rodar offline sem banco configurado; arquivo local continua entregue.
  }

  return {
    success: true,
    engine: 'html_svg',
    creditsCost: 0,
    localFile: wantLocal ? rendered.outputPath : null,
    videoUrl: storageUrl,
    width: rendered.width,
    height: rendered.height,
    fps: rendered.fps,
    durationSec: rendered.durationSec,
    totalFrames: rendered.totalFrames,
    palette: rendered.palette,
    motionCheck: rendered.motionCheck,
    timelineIssues: rendered.timelineIssues,
  };
}
