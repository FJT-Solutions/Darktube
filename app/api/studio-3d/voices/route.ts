import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { readStored } from '@/lib/flow-assemble';
import { uploadMediaFile } from '@/lib/storage';
import { cloneElevenLabsVoice, listAvailableVoices } from '@/lib/voice-resolver';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }
    const catalog = await listAvailableVoices(String(user.id));
    return NextResponse.json({ success: true, ...catalog });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro ao consultar catálogo de vozes.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }
    const userId = String(user.id);
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const action = String(form.get('action') || 'upload_external');
      const file = form.get('audio');
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          { success: false, error: 'Envie um arquivo de áudio válido (.mp3, .wav, .webm, .m4a).' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = String(file.name || 'audio.mp3')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '_')
        .slice(-48);

      if (action === 'clone_elevenlabs') {
        const cloned = await cloneElevenLabsVoice({
          userId,
          name: String(form.get('name') || 'Voz DarkTube'),
          description: form.get('description') ? String(form.get('description')) : undefined,
          audioBuffer: buffer,
          fileName: safeName,
          mimeType: file.type || 'audio/mpeg',
        });
        return NextResponse.json({ success: true, action: 'clone_elevenlabs', ...cloned });
      }

      const audioUrl = await uploadMediaFile(
        buffer,
        `voice_ext_${Date.now()}_${safeName}`,
        file.type || 'audio/mpeg'
      );
      return NextResponse.json({
        success: true,
        action: 'upload_external',
        audioUrl,
        fileName: safeName,
      });
    }

    const body = await req.json();
    const action = String(body?.action || '');
    if (action === 'clone_elevenlabs') {
      const audioUrl = String(body?.audioUrl || '').trim();
      if (!audioUrl) {
        return NextResponse.json(
          { success: false, error: 'Informe audioUrl ou envie o arquivo em multipart/form-data para clonar.' },
          { status: 400 }
        );
      }
      let buffer: Buffer;
      if (audioUrl.startsWith('/api/storage/')) {
        buffer = await readStored(audioUrl);
      } else if (/^https?:\/\//i.test(audioUrl)) {
        const resp = await fetch(audioUrl, { signal: AbortSignal.timeout(45_000) });
        if (!resp.ok) throw new Error(`Falha ao baixar áudio base (${resp.status})`);
        buffer = Buffer.from(await resp.arrayBuffer());
      } else {
        return NextResponse.json({ success: false, error: 'audioUrl inválida para clonagem.' }, { status: 400 });
      }
      const cloned = await cloneElevenLabsVoice({
        userId,
        name: String(body?.name || 'Voz DarkTube'),
        description: body?.description ? String(body.description) : undefined,
        audioBuffer: buffer,
        fileName: 'amostra.mp3',
      });
      return NextResponse.json({ success: true, action: 'clone_elevenlabs', ...cloned });
    }

    return NextResponse.json({ success: false, error: `Ação inválida: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro ao processar áudio/clonagem de voz.' },
      { status: 500 }
    );
  }
}
