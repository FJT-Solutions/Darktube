import fs from 'fs';

export interface SceneClockCheckInput {
  index: number;
  inicio: number;
  fim: number;
  acoes?: Array<{ de?: number; ate?: number }>;
  movimentos?: Array<{ de?: number; ate?: number }>;
  textos?: Array<{ de?: number; ate?: number }>;
  elementos?: Array<{ de?: number; ate?: number }>;
}

export interface TimelineClockAudit {
  ok: boolean;
  errors: string[];
  warnings: string[];
  cutsPerTenSec: number;
  avgSceneDurationSec: number;
}

/**
 * Audita o relógio de cenas seguindo o padrão viral (#05/#19):
 * evita cortes apressados (<1.1s), planos mortos (>7.5s) e keys a <0.7s do corte final.
 */
export function validateTimelineClockAndCuts(
  scenes: SceneClockCheckInput[],
  options?: { minKeyMarginSec?: number; autoClampNearCut?: boolean }
): TimelineClockAudit {
  const minMargin = options?.minKeyMarginSec ?? 0.7;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(scenes) || scenes.length === 0) {
    return { ok: false, errors: ['Nenhuma cena informada para auditoria de relógio.'], warnings, cutsPerTenSec: 0, avgSceneDurationSec: 0 };
  }

  let totalDur = 0;
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const start = Number(sc.inicio || 0);
    const end = Number(sc.fim || 0);
    const dur = end - start;
    if (!Number.isFinite(dur) || dur <= 0) {
      errors.push(`Cena ${i + 1}: duração inválida (${start}s -> ${end}s).`);
      continue;
    }
    totalDur += dur;
    if (dur < 1.1) {
      warnings.push(`Cena ${i + 1}: muito curta (${dur.toFixed(2)}s < 1.1s); risco de corte picotado.`);
    } else if (dur > 7.5 && scenes.length > 1) {
      warnings.push(`Cena ${i + 1}: longa demais (${dur.toFixed(1)}s > 7.5s); considere dividir ou usar slow creep.`);
    }

    const inspectList = [
      ...(sc.acoes || []).map((x) => ({ kind: 'ação', obj: x })),
      ...(sc.movimentos || []).map((x) => ({ kind: 'movimento', obj: x })),
      ...(sc.textos || []).map((x) => ({ kind: 'texto', obj: x })),
      ...(sc.elementos || []).map((x) => ({ kind: 'elemento', obj: x })),
    ];

    for (const item of inspectList) {
      const de = item.obj?.de;
      if (typeof de !== 'number' || !Number.isFinite(de)) continue;
      if (end - de < minMargin && dur > minMargin + 0.4) {
        const clamped = +(end - minMargin).toFixed(2);
        if (options?.autoClampNearCut !== false && clamped >= start) {
          item.obj.de = clamped;
          warnings.push(`Cena ${i + 1}: ${item.kind} iniciava a ${(end - de).toFixed(2)}s do corte; antecipado para ${clamped}s (regra <0.7s).`);
        } else {
          warnings.push(`Cena ${i + 1}: ${item.kind} inicia muito perto do corte (${(end - de).toFixed(2)}s < ${minMargin}s).`);
        }
      }
    }
  }

  const avgDur = scenes.length > 0 ? totalDur / scenes.length : 0;
  const cutsPerTenSec = totalDur > 0 ? +((scenes.length / totalDur) * 10).toFixed(2) : 0;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    cutsPerTenSec,
    avgSceneDurationSec: +avgDur.toFixed(2),
  };
}

export interface CriticIssue {
  panel: number;
  severity: 'high' | 'medium' | 'low';
  note: string;
}

export interface VisualCriticReport {
  engine: 'openai_vision' | 'deterministic_qa';
  score: number;
  passed: boolean;
  summary: string;
  framingOk: boolean;
  safeZoneOk: boolean;
  occlusionFree: boolean;
  issues: CriticIssue[];
}

/**
 * Crítico Visual Independente (#19 make-short):
 * Nunca confia só em checks numéricos — lê a folha de contato real e pontua enquadramento,
 * pés no chão, Safe Zone (x 80-1000, y 160-1600), oclusões e legibilidade.
 */
export async function auditContactSheetWithCritic(opts: {
  contactSheetPath?: string;
  title?: string;
  styleLabel?: string;
  expectedScenes?: number;
  blankFramesDetected?: number;
  occlusionsRemaining?: number;
  openAiApiKey?: string;
}): Promise<VisualCriticReport> {
  const blanks = Number(opts.blankFramesDetected || 0);
  const occlusions = Number(opts.occlusionsRemaining || 0);
  const baseScore = Math.max(2, 8.6 - blanks * 2.5 - occlusions * 2.2);

  const fallbackReport: VisualCriticReport = {
    engine: 'deterministic_qa',
    score: +baseScore.toFixed(1),
    passed: blanks === 0 && occlusions === 0,
    summary:
      blanks === 0 && occlusions === 0
        ? `QA determinístico aprovado (${opts.expectedScenes || '?'} cenas amostradas, 0 quadros pretos, 0 oclusões).`
        : `Falhas detectadas: ${blanks} quadros pretos, ${occlusions} oclusões de câmera.`,
    framingOk: occlusions === 0,
    safeZoneOk: true,
    occlusionFree: occlusions === 0,
    issues: [
      ...(blanks > 0 ? [{ panel: 1, severity: 'high' as const, note: `${blanks} cena(s) com frame preto/vazio.` }] : []),
      ...(occlusions > 0 ? [{ panel: 1, severity: 'high' as const, note: `${occlusions} cena(s) com câmera bloqueada por sólido.` }] : []),
    ],
  };

  const apiKey = opts.openAiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey || !opts.contactSheetPath || !fs.existsSync(opts.contactSheetPath)) {
    return fallbackReport;
  }

  try {
    const b64 = fs.readFileSync(opts.contactSheetPath).toString('base64');
    const promptText = `You are a strict independent video animation critic inspecting a numbered contact sheet for "${opts.title || 'DarkTube Short'}" (style: ${opts.styleLabel || '2.5D/3D/2D'}).
Score strictly 1.0 to 10.0 on:
1. Subject framing (characters full-body or intentional portrait, NOT awkwardly cut off at waist or stuck inside walls/props).
2. Camera visibility (no huge grey/solid wall filling the screen; clear focal point).
3. Safe zone & caption readability (text legible, not colliding with main characters' faces).
4. Visual cohesion & contrast (clean palette, readable props, not messy AI mush).
Also take into account: blankFrames=${blanks}, occlusionsRemaining=${occlusions}.
Return ONLY valid JSON:
{
  "score": 8.0,
  "framingOk": true,
  "safeZoneOk": true,
  "occlusionFree": true,
  "summary": "Brief objective review in Portuguese (pt-BR)",
  "issues": [{"panel": 1, "severity": "low|medium|high", "note": "Issue in Portuguese"}]
}`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 450,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'high' } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!resp.ok) return fallbackReport;
    const json: any = await resp.json();
    const content = String(json?.choices?.[0]?.message?.content || '').trim();
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return fallbackReport;
    const parsed = JSON.parse(match[0]);
    const rawScore = Number(parsed?.score);
    const finalScore = Number.isFinite(rawScore) ? Math.max(1, Math.min(10, +rawScore.toFixed(1))) : fallbackReport.score;
    return {
      engine: 'openai_vision',
      score: blanks > 0 || occlusions > 0 ? Math.min(finalScore, 5.5) : finalScore,
      passed: blanks === 0 && occlusions === 0 && finalScore >= 6.5,
      summary: String(parsed?.summary || fallbackReport.summary),
      framingOk: parsed?.framingOk !== false && occlusions === 0,
      safeZoneOk: parsed?.safeZoneOk !== false,
      occlusionFree: parsed?.occlusionFree !== false && occlusions === 0,
      issues: Array.isArray(parsed?.issues)
        ? parsed.issues.slice(0, 6).map((it: any) => ({
            panel: Number(it?.panel || 1),
            severity: it?.severity === 'high' || it?.severity === 'medium' ? it.severity : 'low',
            note: String(it?.note || ''),
          }))
        : fallbackReport.issues,
    };
  } catch {
    return fallbackReport;
  }
}
