import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { completeFlowJob, getFlowJob, syncProjectQueuedJobsWithReferences } from '@/lib/flow-jobs';
import { uploadMediaFile } from '@/lib/storage';
import { pool } from '@/lib/db-client';
import { assembleFlowProject } from '@/lib/flow-assemble';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 100 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

// multipart/form-data com o campo "file" (a mídia gerada no Flow).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getFlowAgentUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;

  const current = await getFlowJob(user.id, id);
  if (!current || (current.status !== 'running' && current.status !== 'collecting')) {
    return NextResponse.json({ success: false, error: 'Job não está em execução.' }, { status: 409 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'Arquivo ausente.' }, { status: 400 });
  }
  const ext = EXT_BY_MIME[file.type];
  if (!ext) return NextResponse.json({ success: false, error: 'Tipo de mídia não suportado.' }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: 'Arquivo grande demais.' }, { status: 413 });

  const url = await uploadMediaFile(Buffer.from(await file.arrayBuffer()), `flow_${id}.${ext}`, file.type);
  const job = await completeFlowJob(user.id, id, url);
  if (!job) return NextResponse.json({ success: false, error: 'Job não está em execução.' }, { status: 409 });

  // Se uma folha de personagem (character_sheet) acabou de ficar pronta para um projeto, vincula sheetUrl,
  // destrava sheetStatus = 'aprovada' e propaga refImageUrl para os takes que ainda estao na fila.
  if (job.project_id && job.role === 'character_sheet') {
    try {
      const { rows: pRows } = await pool.query(`SELECT script FROM public.flow_projects WHERE id = $1`, [job.project_id]);
      const sc = pRows[0]?.script;
      if (sc && Array.isArray(sc.characters) && sc.characters.length > 0) {
        const idx = typeof job.take_index === 'number' && sc.characters[job.take_index] ? job.take_index : 0;
        sc.characters[idx] = { ...sc.characters[idx], sheetUrl: url, sheetStatus: 'aprovada' };
        await pool.query(`UPDATE public.flow_projects SET script = $2::jsonb, updated_at = NOW() WHERE id = $1`, [
          job.project_id,
          JSON.stringify(sc),
        ]);
        // So os takes em que o personagem aparece recebem o retrato (b-roll de maos e cenas de objetos seguem sem
        // referencia: anexa-la custava ~40 s de envio e pode atrair recusa). takeReference decide take a take e o
        // prompt e reescrito junto, citando a referencia.
        const { rows: prj } = await pool.query(`SELECT params, template_id FROM public.flow_projects WHERE id = $1`, [job.project_id]);
        await syncProjectQueuedJobsWithReferences(user.id, String(job.project_id), sc, prj[0]?.params || {}, String(prj[0]?.template_id || ''));
      }
    } catch (sheetErr: any) {
      console.warn(`[Flow Complete] Falha ao propagar character_sheet aprovada: ${sheetErr.message}`);
    }
  }

  if (job.project_id) {
    (async () => {
      try {
        const { rows: projJobs } = await pool.query(
          // Conta cada take uma vez so (nova tentativa e folha de personagem nao entram): contar jobs fazia a montagem
          // comecar com 2 dos 4 takes prontos ("Faltam takes prontos: 1, 4").
          `SELECT count(DISTINCT take_index) FILTER (WHERE status = 'done' AND result_url IS NOT NULL AND role IN ('take', 'take_final'))::int AS done_count,
                  count(DISTINCT take_index) FILTER (WHERE role IN ('take', 'take_final'))::int AS total_count
             FROM public.flow_jobs
            WHERE project_id = $1 AND role IN ('take', 'take_final')`,
          [job.project_id]
        );
        const { rows: proj } = await pool.query(
          `SELECT final_url, script FROM public.flow_projects WHERE id = $1`,
          [job.project_id]
        );
        const scriptTakes = proj[0]?.script?.takes?.length || 0;
        const totalTakes = scriptTakes > 0 ? scriptTakes : (projJobs[0]?.total_count || 0);

        if (totalTakes > 0 && projJobs[0]?.done_count >= totalTakes && !proj[0]?.final_url) {
          console.log(`[Auto-Assemble] Todos os ${totalTakes} takes do projeto ${job.project_id} prontos! Iniciando montagem automática em background...`);
          await assembleFlowProject(user.id, String(job.project_id));
          console.log(`[Auto-Assemble] Projeto ${job.project_id} montado com sucesso!`);
        }
      } catch (err: any) {
        console.warn(`[Auto-Assemble] Erro na montagem: ${err.message}`);
      }
    })().catch(() => {});
  }

  return NextResponse.json({ success: true, job });
}
