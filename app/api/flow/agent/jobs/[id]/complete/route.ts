import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { completeFlowJob, getFlowJob } from '@/lib/flow-jobs';
import { uploadMediaFile } from '@/lib/storage';

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
  if (!current || current.status !== 'running') {
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
  return NextResponse.json({ success: true, job });
}
