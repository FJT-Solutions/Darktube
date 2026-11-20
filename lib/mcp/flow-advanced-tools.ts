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
import { enqueueDetachedRenderTask, getRenderQueueSnapshot, runQueuedRenderTask, type RenderJobKind } from '@/lib/render-queue';
import { resolveVoiceWithTimestamps, type VoiceGender, type VoiceProviderChoice } from '@/lib/voice-resolver';
import { compileThreeJsStoryboard, type ThreeJsStoryboard, type ThreeJsViralCaptionsConfig } from '@/lib/threejs-scene-compiler';
import { renderThreeJsToMp4 } from '@/lib/threejs-render';
import { renderBlenderStoryboard } from '@/lib/blender-bridge';
import { buildPuppetRigFromChromaPng, generateLipSyncMouthCues } from '@/lib/puppet-studio';
import { analyzeLiveAudioPeaks, renderAutoLiveClip } from '@/lib/auto-clipper';
import { generateThreeJsDirection } from '@/lib/threejs-director';
import {
  downloadExternalGlbToLibrary,
  downloadPolyHavenModel,
  downloadSketchfabModel,
  ensureBuiltinSfx,
  listLocal3dModels,
  searchFree3dAssets,
  searchFreesoundSfx,
  searchWikimediaImages,
} from '@/lib/threejs-asset-hub';
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
  kind?: RenderJobKind;
  isDraft?: boolean;
  downloadLocal?: boolean;
  outputDir?: string;
  fileName?: string;
  voiceProvider?: VoiceProviderChoice;
  voiceGender?: VoiceGender;
  voiceId?: string;
  audioPathOrUrl?: string;
  scriptText?: string;
}

/**
 * 12. Renderiza video em HTML + SVG + fisica deterministica ($0 de creditos IA)
 * via Fila FIFO multi-usuario + Playwright Chromium + FFmpeg + Motion Checks.
 */
export async function renderHtmlSvgVideoMcp(input: RenderHtmlSvgInput) {
  const userId = await resolveDefaultUserId();
  const safeBase = String(input.fileName || `htmlsvg_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60);
  const wantLocal = input.downloadLocal !== false;
  const targetDir = wantLocal
    ? path.resolve(process.cwd(), input.outputDir || './midia/criativos')
    : os.tmpdir();
  const outputPath = path.join(targetDir, `${safeBase}.mp4`);
  const kind: RenderJobKind = input.kind === 'single_scene' || input.scenes?.length === 1 ? 'single_scene' : 'full_video';

  return await runQueuedRenderTask(
    {
      userId,
      engine: 'html_svg',
      kind,
      title: input.title || input.preset || safeBase,
      payload: { preset: input.preset || 'html_svg_explainer', aspect: input.aspect || '9:16', isDraft: Boolean(input.isDraft) },
    },
    async ({ onProgress }) => {
      let audioPath: string | undefined;
      if (input.audioPathOrUrl || input.scriptText) {
        const spoken =
          input.scriptText ||
          (input.scenes || [])
            .map((s) => s.spokenLine || s.subtitle || s.title)
            .filter(Boolean)
            .join(' ');
        if (spoken || input.audioPathOrUrl) {
          const voiceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_voice_'));
          const vr = await resolveVoiceWithTimestamps({
            userId,
            scriptText: spoken,
            outputDir: voiceDir,
            audioPathOrUrl: input.audioPathOrUrl,
            voiceProvider: input.voiceProvider || 'auto',
            voiceGender: input.voiceGender || 'male',
            voiceId: input.voiceId,
          });
          audioPath = vr.audioPath;
        }
      }

      await onProgress(15);
      const rendered = await renderHtmlSvgToMp4({
        spec: input,
        outputPath,
        draft: Boolean(input.isDraft),
        audioPath,
      });
      await onProgress(92);

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
        kind,
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
        renderDurationMs: rendered.renderDurationMs,
        renderDurationLabel: rendered.renderDurationLabel,
      };
    }
  );
}

export interface RenderThreeJsInput {
  kind?: RenderJobKind;
  preset?: 'curiosidade_cratera' | 'custom_storyboard';
  backend?: 'threejs' | 'blender';
  fallbackToThreeJs?: boolean;
  topic?: string;
  durationSec?: number;
  quality?: 'alta' | 'media' | 'basica';
  provider?: FlowProvider;
  title?: string;
  aspect?: '9:16' | '16:9' | '1:1';
  fps?: number;
  isDraft?: boolean;
  scriptText?: string;
  storyboard?: Partial<ThreeJsStoryboard>;
  captions?: ThreeJsViralCaptionsConfig;
  voiceProvider?: VoiceProviderChoice;
  voiceGender?: VoiceGender;
  voiceId?: string;
  language?: string;
  speed?: number;
  audioPathOrUrl?: string;
  waitForResult?: boolean;
  downloadLocal?: boolean;
  outputDir?: string;
  fileName?: string;
}

/**
 * 13. Renderiza video 3D (Three.js articulado + GLTFLoader .glb) na Fila FIFO multi-usuario com Voz Hibrida
 * (Audio externo -> ElevenLabs do usuario -> OpenAI TTS -> Edge TTS fallback $0) e Legendas Virais.
 */
export async function renderThreeJsVideoMcp(input: RenderThreeJsInput) {
  const userId = await resolveDefaultUserId();
  const safeBase = String(input.fileName || `darktube3d_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60);
  const wantLocal = input.downloadLocal !== false;
  const targetDir = wantLocal
    ? path.resolve(process.cwd(), input.outputDir || './midia/criativos')
    : os.tmpdir();
  const outputPath = path.join(targetDir, `${safeBase}.mp4`);
  const kind: RenderJobKind = input.kind === 'single_scene' ? 'single_scene' : 'full_video';

  const executeJob = async ({ onProgress }: { jobId: string; onProgress: (pct: number) => Promise<void> }) => {
    let workingStoryboard = input.storyboard;
    let workingScript = input.scriptText;
    let directorProvider: string | null = null;

    if (input.topic && !workingStoryboard?.cenas?.length) {
      const directed = await generateThreeJsDirection({
        userId,
        topic: input.topic,
        durationSec: input.durationSec,
        kind,
        aspect: input.aspect || '9:16',
        quality: input.quality || (input.isDraft ? 'basica' : 'media'),
        isDraft: input.isDraft,
        provider: input.provider,
        captions: input.captions,
      });
      workingStoryboard = directed.compiled.storyboard;
      workingScript = workingScript || directed.spokenScript;
      directorProvider = directed.providerUsed;
      await onProgress(8);
    }

    const initialCompile = compileThreeJsStoryboard({
      kind,
      preset: workingStoryboard?.cenas?.length ? 'custom_storyboard' : (input.preset || 'curiosidade_cratera'),
      title: input.title || input.topic,
      aspect: input.aspect || '9:16',
      fps: input.fps,
      isDraft: input.isDraft,
      storyboard: workingStoryboard,
      captions: input.captions,
    });

    const spokenText = String(workingScript || initialCompile.spokenScript || '').trim();
    const voiceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_3d_voice_'));
    const voiceRes = await resolveVoiceWithTimestamps({
      userId,
      scriptText: spokenText,
      outputDir: voiceDir,
      audioPathOrUrl: input.audioPathOrUrl,
      voiceProvider: input.voiceProvider || 'auto',
      voiceGender: input.voiceGender || 'male',
      voiceId: input.voiceId,
      language: input.language || 'pt-BR',
      speed: input.speed,
    });
    await onProgress(15);

    const finalCompile = compileThreeJsStoryboard({
      kind,
      preset: workingStoryboard?.cenas?.length ? 'custom_storyboard' : (input.preset || 'curiosidade_cratera'),
      title: input.title || input.topic,
      aspect: input.aspect || '9:16',
      fps: input.fps,
      isDraft: input.isDraft,
      storyboard: {
        ...workingStoryboard,
        ...(input.quality ? { qualidade: input.quality } : {}),
      },
      captions: input.captions,
      audioDurationSec: kind === 'single_scene' ? undefined : voiceRes.durationSec,
    });

    const lipSync = await generateLipSyncMouthCues({
      audioPath: voiceRes.audioPath,
      words: voiceRes.words,
      durationSec: finalCompile.storyboard.duracao,
    });
    const contactSheetPath = path.join(voiceDir, `contact_sheet_${Date.now()}.png`);
    const useBlender = input.backend === 'blender';

    const rendered = useBlender
      ? await renderBlenderStoryboard({
          storyboard: finalCompile.storyboard,
          words: voiceRes.words,
          mouthCues: lipSync.cues,
          audioPath: voiceRes.audioPath,
          outputPath,
          isDraft: Boolean(input.isDraft),
          fallbackToThreeJs: input.fallbackToThreeJs !== false,
          contactSheetPath,
          onProgress,
        })
      : await renderThreeJsToMp4({
          storyboard: finalCompile.storyboard,
          words: voiceRes.words,
          mouthCues: lipSync.cues,
          audioPath: voiceRes.audioPath,
          outputPath,
          isDraft: Boolean(input.isDraft),
          generateContactSheet: true,
          contactSheetPath,
          onProgress,
        });

    let contactSheetUrl: string | null = null;
    try {
      if (rendered.contactSheetPath && fs.existsSync(rendered.contactSheetPath)) {
        const qaBuf = fs.readFileSync(rendered.contactSheetPath);
        const qaPath = await uploadMediaFile(qaBuf, `${safeBase}_qa_${Date.now()}.png`, 'image/png');
        contactSheetUrl = `https://darktube.fjt-solutions.com${qaPath}`;
      }
    } catch {}

    try {
      fs.rmSync(voiceDir, { recursive: true, force: true });
    } catch {}

    let storageUrl: string | null = null;
    try {
      const buf = fs.readFileSync(rendered.outputPath);
      const storagePath = await uploadMediaFile(buf, `${safeBase}_${Date.now()}.mp4`, 'video/mp4');
      storageUrl = `https://darktube.fjt-solutions.com${storagePath}`;
    } catch {}

    const backendUsed = 'backendUsed' in rendered ? rendered.backendUsed : 'threejs';

    return {
      success: true,
      engine: useBlender ? 'blender_3d' : 'threejs_3d',
      backendUsed,
      lipSyncEngine: lipSync.engine,
      kind,
      creditsCost: 0,
      directorProvider,
      voiceProviderUsed: voiceRes.providerUsed,
      voiceUsed: voiceRes.voiceUsed,
      wordsCount: voiceRes.words.length,
      sceneCount: finalCompile.sceneCount,
      auditFixes: finalCompile.auditFixes,
      localFile: wantLocal ? rendered.outputPath : null,
      videoUrl: storageUrl,
      contactSheetUrl,
      qaChecks: rendered.qaChecks,
      width: rendered.width,
      height: rendered.height,
      fps: rendered.fps,
      durationSec: rendered.durationSec,
      totalFrames: rendered.totalFrames,
      motionCheck: rendered.motionCheck,
      renderDurationMs: rendered.renderDurationMs,
      renderDurationLabel: rendered.renderDurationLabel,
    };
  };

  const queueOpts = {
    userId,
    engine: input.backend === 'blender' ? ('blender_3d' as const) : ('threejs_3d' as const),
    kind,
    title: input.title || input.topic || input.preset || safeBase,
    payload: { kind, backend: input.backend || 'threejs', preset: input.preset || (input.topic ? 'director_llm' : 'curiosidade_cratera'), isDraft: Boolean(input.isDraft) },
  };

  if (input.waitForResult === false) {
    return await enqueueDetachedRenderTask(queueOpts, executeJob);
  }
  return await runQueuedRenderTask(queueOpts, executeJob);
}

/**
 * 14. Consulta o status da Fila Multi-Usuario FIFO de renderizacao na VPS.
 */
export async function getRenderQueueStatusMcp(input: { jobId?: string }) {
  const userId = await resolveDefaultUserId();
  const snapshot = await getRenderQueueSnapshot(userId, input.jobId);
  return { success: true, ...snapshot };
}

/**
 * 15. Acervo V2 ($0): busca e baixa modelos 3D CC0 (Poly Haven, Poly Pizza, Sketchfab), fotos Wikimedia Commons e SFX CC0.
 */
export async function searchAndDownload3dAssetsMcp(input: {
  query?: string;
  limit?: number;
  assetType?: '3d' | 'wikimedia' | 'sfx';
  downloadSource?: 'polyhaven' | 'polypizza' | 'sketchfab' | 'url' | 'sfx_builtin';
  assetId?: string;
  url?: string;
  name?: string;
}) {
  if (input.downloadSource === 'polyhaven' && input.assetId) {
    const saved = await downloadPolyHavenModel(input.assetId);
    return { success: true, action: 'downloaded', model: saved, localCount: listLocal3dModels().length };
  }
  if (input.downloadSource === 'sketchfab' && input.assetId) {
    const saved = await downloadSketchfabModel(input.assetId);
    return { success: true, action: 'downloaded', model: saved, localCount: listLocal3dModels().length };
  }
  if (input.downloadSource === 'sfx_builtin' && input.assetId) {
    const saved = await ensureBuiltinSfx(input.assetId);
    return { success: true, action: 'downloaded_sfx', sfx: saved };
  }
  if ((input.downloadSource === 'polypizza' || input.downloadSource === 'url') && input.url) {
    const saved = await downloadExternalGlbToLibrary({
      url: input.url,
      id: input.assetId,
      name: input.name,
      source: input.downloadSource,
    });
    return { success: true, action: 'downloaded', model: saved, localCount: listLocal3dModels().length };
  }
  if (input.assetType === 'wikimedia') {
    const images = await searchWikimediaImages(input.query || 'history', input.limit || 12);
    return { success: true, action: 'search_wikimedia', query: input.query, images };
  }
  if (input.assetType === 'sfx') {
    const sfx = await searchFreesoundSfx(input.query || '', input.limit || 12);
    return { success: true, action: 'search_sfx', ...sfx };
  }
  const found = await searchFree3dAssets(input.query || '', { limit: input.limit || 16 });
  return { success: true, action: 'search', ...found };
}

export interface GenerateFlowImageMcpInput {
  action?: 'generate' | 'cutout_only';
  assetKind?: 'character' | 'expressions' | 'prop' | 'background';
  description?: string;
  customPrompt?: string;
  realismo?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  chromaGreen?: boolean;
  gridLayout?: '2x2' | '3x2';
  autoCutout?: boolean;
  imageUrl?: string;
  similarity?: number;
  blend?: number;
  waitForSeconds?: number;
  downloadLocal?: boolean;
  outputDir?: string;
}

/**
 * 16. Gera imagens avulsas no Nano Banana (Google Flow kind: 'image') com suporte a Fundo Verde Chroma (#00FF00),
 * recorte automático para PNG 32-bit transparente (RGBA) e fatiamento de folha de expressões (2x2 ou 3x2) para
 * animar a $0 nos motores procedurais (Stickman 2.5D, Netflix Doc, Remotion, HTML+SVG, HyperFrames).
 */
export async function generateFlowImageMcp(input: GenerateFlowImageMcpInput) {
  const userId = await resolveDefaultUserId();
  const { createStandaloneFlowImageJob, removeChromaGreenToPng } = await import('@/lib/flow-image-tools');

  if (input.action === 'cutout_only' || (input.imageUrl && !input.description && !input.customPrompt)) {
    if (!input.imageUrl) {
      throw new Error('Informe "imageUrl" para recortar uma imagem existente em fundo verde (#00FF00).');
    }
    const cutout = await removeChromaGreenToPng({
      inputSource: input.imageUrl,
      sliceGrid: input.gridLayout,
      similarity: input.similarity,
      blend: input.blend,
      downloadLocal: input.downloadLocal !== false,
      outputDir: input.outputDir || './midia/criativos',
    });
    return {
      success: true,
      action: 'cutout_only',
      ...cutout,
    };
  }

  const res = await createStandaloneFlowImageJob({
    userId,
    assetKind: input.assetKind || 'character',
    description: input.description,
    customPrompt: input.customPrompt,
    realismo: input.realismo,
    aspectRatio: input.aspectRatio || (input.assetKind === 'expressions' ? '1:1' : '9:16'),
    chromaGreen: input.chromaGreen,
    gridLayout: input.gridLayout,
    autoCutout: input.autoCutout !== false,
    waitForSeconds: input.waitForSeconds ?? 0,
    downloadLocal: input.downloadLocal !== false,
    outputDir: input.outputDir || './midia/criativos',
  });

  return {
    success: true,
    action: 'generate',
    jobId: res.job.id,
    status: res.job.status,
    resultUrl: res.job.result_url,
    assetKind: res.assetKind,
    chromaGreen: res.chromaGreen,
    prompt: res.prompt,
    cutout: res.cutout,
  };
}

/**
 * 17. Constrói Puppet Rig 2.5D articulado (head/torso/armL/armR/legL/legR + Sticker Swap + Acessórios)
 * a partir de uma folha em fundo #00FF00 (OpenCV ou FFmpeg proporcional $0).
 */
export async function buildPuppetRigMcp(input: {
  imageUrl: string;
  characterName?: string;
  expressionsUrl?: string;
  gridLayout?: '2x2' | '3x2';
  accessoriesUrl?: string;
  outputBaseName?: string;
}) {
  if (!input?.imageUrl) {
    throw new Error('Informe "imageUrl" com a imagem base em fundo #00FF00.');
  }
  const rig = await buildPuppetRigFromChromaPng({
    imageSource: input.imageUrl,
    characterName: input.characterName || 'Personagem Puppet',
    expressionsSheetSource: input.expressionsUrl,
    gridLayout: input.gridLayout === '3x2' ? '3x2' : '2x2',
    accessoriesSheetSource: input.accessoriesUrl,
    outputBaseName: input.outputBaseName,
  });
  return { success: true, rig };
}

/**
 * 18. Auto-Clipper Audio-First para Lives & Podcasts (analisa picos via áudio sem baixar o vídeo completo,
 * depois corta o trecho selecionado em 9:16 vertical_center ou split_screen com Modo Comentário TTS).
 */
export async function autoClipLiveMcp(input: {
  action?: 'analyze' | 'render';
  sourceUrl?: string;
  audioPathOrUrl?: string;
  minClipSec?: number;
  maxClipSec?: number;
  topN?: number;
  startSec?: number;
  endSec?: number;
  layout?: 'vertical_center' | 'split_screen';
  gameplayUrl?: string;
  commentIntroText?: string;
  voiceProvider?: VoiceProviderChoice;
  voiceGender?: VoiceGender;
  title?: string;
  waitForResult?: boolean;
}) {
  const userId = await resolveDefaultUserId();
  if (input.action !== 'render') {
    const analyzed = await analyzeLiveAudioPeaks({
      sourceUrl: input.sourceUrl,
      audioPathOrUrl: input.audioPathOrUrl,
      minClipSec: input.minClipSec,
      maxClipSec: input.maxClipSec,
      topN: input.topN || 4,
    });
    return { success: true, action: 'analyze', ...analyzed };
  }

  const target = String(input.sourceUrl || input.audioPathOrUrl || '').trim();
  if (!target) {
    throw new Error('Informe "sourceUrl" da transmissão para renderizar o corte.');
  }
  const startSec = Number(input.startSec) || 0;
  const endSec = Math.max(startSec + 5, Number(input.endSec) || startSec + 28);
  const title = String(input.title || `Auto-Clip ${Math.round(startSec)}s–${Math.round(endSec)}s`).slice(0, 120);

  const queueOpts = {
    userId,
    engine: 'auto_clipper' as const,
    kind: 'full_video' as const,
    title,
    payload: { sourceUrl: target, startSec, endSec, layout: input.layout || 'vertical_center' },
  };
  const runJob = async ({ onProgress }: { onProgress: (pct: number) => Promise<void> | void }) =>
    await renderAutoLiveClip({
      userId,
      sourceUrl: target,
      startSec,
      endSec,
      layout: input.layout || 'vertical_center',
      gameplayUrl: input.gameplayUrl,
      commentIntroText: input.commentIntroText,
      voiceProvider: input.voiceProvider || 'auto',
      voiceGender: input.voiceGender || 'male',
      title,
      onProgress,
    });

  if (input.waitForResult === false) {
    return await enqueueDetachedRenderTask(queueOpts, runJob);
  }
  return await runQueuedRenderTask(queueOpts, runJob);
}

/**
 * 19. Enfileira lotes Data-in, Video-out (até 20 vídeos em sequência FIFO) para HTML+SVG V2 ou Three.js 3D.
 */
export async function batchRenderMcp(input: {
  items: Array<{
    engine?: 'html_svg' | 'threejs_3d';
    title?: string;
    preset?: string;
    aspect?: '9:16' | '16:9' | '1:1';
    isDraft?: boolean;
    topic?: string;
    durationSec?: number;
    scriptText?: string;
    spokenScript?: string;
    palette?: string[];
    scenes?: any[];
    storyboard?: Partial<ThreeJsStoryboard>;
    voiceProvider?: VoiceProviderChoice;
    voiceGender?: VoiceGender;
  }>;
}) {
  const userId = await resolveDefaultUserId();
  const items = Array.isArray(input?.items) ? input.items.slice(0, 20) : [];
  if (items.length === 0) {
    throw new Error('Envie "items" com 1 a 20 objetos de vídeo para enfileirar em lote.');
  }

  const jobs: Array<{ index: number; title: string; engine: string; jobId: string; status: string; queuePosition: number }> = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    const engine: 'html_svg' | 'threejs_3d' = it.engine === 'threejs_3d' ? 'threejs_3d' : 'html_svg';
    const title = String(it.title || it.topic || `Lote MCP #${i + 1}`).slice(0, 120);
    const aspect = it.aspect === '16:9' || it.aspect === '1:1' ? it.aspect : '9:16';
    const isDraft = it.isDraft !== undefined ? Boolean(it.isDraft) : true;

    const queued = await enqueueDetachedRenderTask(
      {
        userId,
        engine,
        kind: 'full_video',
        title,
        payload: { batchIndex: i + 1, preset: it.preset || engine, aspect, isDraft },
      },
      async ({ onProgress }) => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_mcp_batch_'));
        try {
          if (engine === 'html_svg') {
            const spoken =
              String(it.scriptText || '').trim() ||
              (Array.isArray(it.scenes)
                ? it.scenes.map((s: any) => s.spokenLine || s.subtitle || s.title).filter(Boolean).join(' ')
                : title);
            let audioPath: string | undefined;
            if (spoken) {
              const vr = await resolveVoiceWithTimestamps({
                userId,
                scriptText: spoken,
                outputDir: tmpDir,
                voiceProvider: it.voiceProvider || 'auto',
                voiceGender: it.voiceGender || 'male',
                language: 'pt-BR',
              });
              audioPath = vr.audioPath;
            }
            await onProgress(25);
            const outMp4 = path.join(tmpDir, `mcp_batch_svg_${i}.mp4`);
            const rendered = await renderHtmlSvgToMp4({
              spec: {
                preset: (it.preset || 'html_svg_explainer') as any,
                title,
                aspect,
                palette: it.palette,
                scenes: it.scenes,
              },
              outputPath: outMp4,
              draft: isDraft,
              audioPath,
            });
            const storagePath = await uploadMediaFile(
              fs.readFileSync(rendered.outputPath),
              `mcp_batch_svg_${Date.now()}_${i}.mp4`,
              'video/mp4'
            );
            return {
              videoUrl: `https://darktube.fjt-solutions.com${storagePath}`,
              durationSec: rendered.durationSec,
              renderDurationMs: rendered.renderDurationMs,
              renderDurationLabel: rendered.renderDurationLabel,
            };
          } else {
            let workingStoryboard = it.storyboard;
            let spoken = String(it.spokenScript || it.scriptText || '').trim();
            if (!workingStoryboard?.cenas?.length) {
              const dir = await generateThreeJsDirection({
                userId,
                topic: it.topic || title,
                durationSec: Number(it.durationSec) || 24,
                aspect,
                quality: isDraft ? 'basica' : 'media',
                isDraft,
              });
              workingStoryboard = dir.compiled.storyboard;
              if (!spoken) spoken = dir.spokenScript;
            }
            const voiceRes = await resolveVoiceWithTimestamps({
              userId,
              scriptText: spoken || title,
              outputDir: tmpDir,
              voiceProvider: it.voiceProvider || 'auto',
              voiceGender: it.voiceGender || 'male',
              language: 'pt-BR',
            });
            await onProgress(25);
            const compiled = compileThreeJsStoryboard({
              kind: 'full_video',
              preset: 'custom_storyboard',
              title,
              aspect,
              isDraft,
              audioDurationSec: voiceRes.durationSec,
              storyboard: workingStoryboard,
            });
            const lipSync = await generateLipSyncMouthCues({
              audioPath: voiceRes.audioPath,
              words: voiceRes.words,
              durationSec: compiled.storyboard.duracao,
            });
            const outMp4 = path.join(tmpDir, `mcp_batch_3d_${i}.mp4`);
            const rendered = await renderThreeJsToMp4({
              storyboard: compiled.storyboard,
              words: voiceRes.words,
              mouthCues: lipSync.cues,
              audioPath: voiceRes.audioPath,
              outputPath: outMp4,
              isDraft,
              onProgress,
            });
            const storagePath = await uploadMediaFile(
              fs.readFileSync(rendered.outputPath),
              `mcp_batch_3d_${Date.now()}_${i}.mp4`,
              'video/mp4'
            );
            return {
              videoUrl: `https://darktube.fjt-solutions.com${storagePath}`,
              durationSec: rendered.durationSec,
              renderDurationMs: rendered.renderDurationMs,
              renderDurationLabel: rendered.renderDurationLabel,
            };
          }
        } finally {
          try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          } catch {}
        }
      }
    );
    jobs.push({
      index: i + 1,
      title,
      engine,
      jobId: queued.queueJobId,
      status: queued.status,
      queuePosition: queued.positionInQueue,
    });
  }

  return { success: true, totalQueued: jobs.length, jobs };
}
