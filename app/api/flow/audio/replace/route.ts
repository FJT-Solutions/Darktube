import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { getCurrentUser } from '@/lib/auth-helpers';
import { replaceProjectAudio } from '@/lib/flow-audio-replace';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = (await getFlowAgentUser(req)) || (await getCurrentUser());
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let projectId = '';
    let audioInput = '';
    let lipsync = false;
    let layout: 'expert' | 'split' | 'auto' | undefined;
    let scriptText = '';
    let tmpDirToClean = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      projectId = String(formData.get('projectId') || '');
      lipsync = formData.get('lipsync') === 'true' || formData.get('lipsync') === '1';
      const rawLayout = String(formData.get('layout') || '');
      if (rawLayout === 'expert' || rawLayout === 'split' || rawLayout === 'auto') layout = rawLayout;
      scriptText = String(formData.get('scriptText') || '');

      const file = formData.get('audio') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'Arquivo de áudio não enviado no campo "audio".' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = path.extname(file.name) || '.webm';
      tmpDirToClean = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-api-audio-'));
      audioInput = path.join(tmpDirToClean, `upload_${Date.now()}${ext}`);
      fs.writeFileSync(audioInput, buffer);
    } else {
      const body = await req.json().catch(() => ({}));
      projectId = String(body.projectId || '');
      audioInput = String(body.audioUrl || body.audioPath || body.audioInput || '');
      lipsync = Boolean(body.lipsync);
      if (body.layout === 'expert' || body.layout === 'split' || body.layout === 'auto') layout = body.layout;
      scriptText = String(body.scriptText || '');
    }

    if (!projectId) {
      if (tmpDirToClean) fs.rmSync(tmpDirToClean, { recursive: true, force: true });
      return NextResponse.json({ success: false, error: 'O parâmetro "projectId" é obrigatório.' }, { status: 400 });
    }

    if (!audioInput) {
      if (tmpDirToClean) fs.rmSync(tmpDirToClean, { recursive: true, force: true });
      return NextResponse.json({ success: false, error: 'Nenhum áudio fornecido.' }, { status: 400 });
    }

    try {
      const result = await replaceProjectAudio({
        userId: user.id,
        projectId,
        audioInput,
        lipsync,
        layout,
        scriptText,
        updateProject: true,
      });

      return NextResponse.json({
        success: true,
        projectId: result.projectId,
        title: result.title,
        finalUrl: result.finalUrl,
        srtUrl: result.srtUrl,
        duration: result.duration,
        burned: result.burned,
        lipsyncApplied: result.lipsyncApplied,
        method: result.method,
      });
    } finally {
      if (tmpDirToClean) {
        try {
          fs.rmSync(tmpDirToClean, { recursive: true, force: true });
        } catch (_) {}
      }
    }
  } catch (err: any) {
    console.error('[API ReplaceAudio] Erro:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Erro interno ao processar áudio.' }, { status: 500 });
  }
}
