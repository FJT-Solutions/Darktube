#!/usr/bin/env node
/**
 * CLI e Watcher Oficial do DarkTube MCP (compatível com cockpit-bg.js).
 *
 * Exemplos de uso:
 *   npx tsx scripts/mcp-cli.ts status e9bea186
 *   npx tsx scripts/mcp-cli.ts assemble e9bea186
 *   npx tsx scripts/mcp-cli.ts wait e9bea186
 *   npx tsx scripts/mcp-cli.ts templates
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import {
  listFlowTemplates,
  createCampaignCreative,
  getCreativeStatus,
  assembleFlowCreative,
  downloadCreativeToLocal,
} from '../lib/mcp/darktube-tools';

const REMOTE_MCP_URL = process.env.DARKTUBE_MCP_URL || 'https://darktube.fjt-solutions.com/api/mcp';

async function callRemoteMcp(tool: string, args: Record<string, any>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = process.env.DARKTUBE_MCP_SECRET || process.env.DARKTUBE_API_KEY;
  if (secret) headers['Authorization'] = `Bearer ${secret}`;

  const res = await fetch(REMOTE_MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tool, args }),
    signal: AbortSignal.timeout(300000),
  });
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data.result ?? data;
}

async function run() {
  const [, , cmd, arg1, ...rest] = process.argv;

  if (!cmd || cmd === 'templates') {
    const res = await listFlowTemplates();
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  }

  if (cmd === 'status') {
    if (!arg1) throw new Error('Informe o projectId (ex: e9bea186)');
    const assembleIfReady = rest.includes('--assemble');
    const downloadLocal = rest.includes('--download');
    let res = await getCreativeStatus({
      projectId: arg1,
      assembleIfReady: false,
      downloadLocal: false,
    });

    if (assembleIfReady && res.progress.completedTakes === res.progress.totalTakes && !res.finalVideoUrl) {
      try {
        await assembleFlowCreative({ projectId: res.projectId, downloadLocal });
      } catch {
        await callRemoteMcp('darktube_assemble_flow_project', { projectId: res.projectId, downloadLocal: false });
      }
      res = await getCreativeStatus({ projectId: res.projectId, assembleIfReady: false, downloadLocal });
    } else if (downloadLocal && res.finalVideoUrl) {
      res = await getCreativeStatus({ projectId: res.projectId, assembleIfReady: false, downloadLocal: true });
    }

    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  }

  if (cmd === 'assemble') {
    if (!arg1) throw new Error('Informe o projectId (ex: e9bea186)');
    const st = await getCreativeStatus({ projectId: arg1, assembleIfReady: false, downloadLocal: false });
    const fullId = st.projectId;
    console.log(`[MCP CLI] Iniciando montagem do projeto ${fullId} (Whisper + FFmpeg)...`);
    let res: any;
    try {
      res = await assembleFlowCreative({ projectId: fullId, downloadLocal: true });
    } catch (localErr: any) {
      console.log(`[MCP CLI] Fallback para montagem remota na VPS (${localErr.message})...`);
      res = await callRemoteMcp('darktube_assemble_flow_project', { projectId: fullId, downloadLocal: false });
      if (res.finalUrl) {
        res.localFile = await downloadCreativeToLocal(res.finalUrl, './midia/criativos', `flow_final_${fullId}.mp4`);
      }
    }
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  }

  if (cmd === 'wait') {
    if (!arg1) throw new Error('Informe o projectId (ex: e9bea186)');
    const maxMinutes = Number(rest[0]) || 25;
    const deadline = Date.now() + maxMinutes * 60 * 1000;
    console.log(`[MCP Watcher] Acompanhando projeto ${arg1} por até ${maxMinutes} min...`);

    while (Date.now() < deadline) {
      let st = await getCreativeStatus({
        projectId: arg1,
        assembleIfReady: false,
        downloadLocal: false,
      });

      console.log(
        `[MCP Watcher] Progresso: ${st.progress.completedTakes}/${st.progress.totalTakes} takes (${st.progress.percent}%) | status=${st.status} | finalVideo=${st.finalVideoUrl || 'pendente'}`
      );

      if (st.progress.completedTakes === st.progress.totalTakes && st.progress.totalTakes > 0 && !st.finalVideoUrl) {
        console.log(`[MCP Watcher] Todos os takes prontos! Disparando montagem de ${st.projectId}...`);
        try {
          await assembleFlowCreative({ projectId: st.projectId, downloadLocal: true });
        } catch {
          await callRemoteMcp('darktube_assemble_flow_project', { projectId: st.projectId, downloadLocal: false });
        }
        st = await getCreativeStatus({ projectId: st.projectId, assembleIfReady: false, downloadLocal: true });
      }

      if (st.finalVideoUrl) {
        if (!st.localFiles?.finalVideo) {
          st = await getCreativeStatus({ projectId: st.projectId, assembleIfReady: false, downloadLocal: true });
        }
        console.log('[MCP Watcher] Vídeo final montado e baixado localmente!');
        console.log(JSON.stringify(st, null, 2));
        process.exit(0);
      }

      if (st.progress.failedTakes > 0 && st.progress.inProgressTakes === 0) {
        console.error(`[MCP Watcher] ${st.progress.failedTakes} take(s) falharam e não há jobs em andamento.`);
        console.log(JSON.stringify(st, null, 2));
        process.exit(1);
      }

      await new Promise((r) => setTimeout(r, 15000));
    }

    throw new Error(`Timeout após ${maxMinutes} minutos aguardando o projeto ${arg1}.`);
  }

  if (cmd === 'create') {
    const payload = arg1 ? JSON.parse(arg1) : {};
    const res = await createCampaignCreative(payload);
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  }

  if (cmd === 'download') {
    if (!arg1) throw new Error('Informe a URL do vídeo');
    const res = await downloadCreativeToLocal(arg1, './midia/criativos', rest[0]);
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  }

  if (cmd === 'retry-take') {
    if (!arg1) throw new Error('Informe o projectId');
    const takeIndex = Number(rest[0]) || 1;
    const { pool } = await import('../lib/db-client');
    const { rows } = await pool.query(
      `UPDATE public.flow_jobs
          SET status = 'queued', error_message = NULL, result_url = NULL, claimed_at = NULL, finished_at = NULL,
              params = params - 'policyRetries' - 'genRetries',
              deadline_at = NOW() + interval '720 minutes'
        WHERE (project_id::text = $1 OR project_id::text LIKE $2) AND take_index = $3
        RETURNING id, take_index, status`,
      [arg1, `${arg1}%`, takeIndex]
    );
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  }

  throw new Error(`Comando desconhecido: ${cmd}`);
}

run().catch((err) => {
  console.error('[MCP CLI Error]:', err.message || err);
  process.exit(1);
});
