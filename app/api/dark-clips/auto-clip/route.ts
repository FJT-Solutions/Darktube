import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { analyzeLiveAudioPeaks, renderAutoLiveClip } from '@/lib/auto-clipper';
import { enqueueDetachedRenderTask } from '@/lib/render-queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 900;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }
    const userId = String(user.id);
    const body = await req.json();
    const action = body?.action === 'render' ? 'render' : 'analyze';

    if (action === 'analyze') {
      const result = await analyzeLiveAudioPeaks({
        sourceUrl: body?.sourceUrl ? String(body.sourceUrl) : undefined,
        audioPathOrUrl: body?.audioPathOrUrl ? String(body.audioPathOrUrl) : undefined,
        minClipSec: body?.minClipSec ? Number(body.minClipSec) : undefined,
        maxClipSec: body?.maxClipSec ? Number(body.maxClipSec) : undefined,
        topN: body?.topN ? Number(body.topN) : 4,
      });
      return NextResponse.json({ success: true, action: 'analyze', ...result });
    }

    const sourceUrl = String(body?.sourceUrl || body?.audioPathOrUrl || '').trim();
    if (!sourceUrl) {
      return NextResponse.json({ success: false, error: 'Informe "sourceUrl" da transmissão/vídeo para renderizar o corte.' }, { status: 400 });
    }

    const startSec = Number(body?.startSec) || 0;
    const endSec = Math.max(startSec + 5, Number(body?.endSec) || startSec + 28);
    const layout = body?.layout === 'split_screen' ? 'split_screen' : 'vertical_center';
    const commentIntroText = body?.commentIntroText ? String(body.commentIntroText) : undefined;
    const gameplayUrl = body?.gameplayUrl ? String(body.gameplayUrl) : undefined;
    const title = String(body?.title || `Corte Viral ${Math.round(startSec)}s–${Math.round(endSec)}s`).slice(0, 120);

    const queued = await enqueueDetachedRenderTask(
      {
        userId,
        engine: 'auto_clipper',
        kind: 'full_video',
        title,
        payload: { sourceUrl, startSec, endSec, layout, hasCommentIntro: Boolean(commentIntroText) },
      },
      async ({ onProgress }) => {
        return await renderAutoLiveClip({
          userId,
          sourceUrl,
          startSec,
          endSec,
          layout,
          gameplayUrl,
          commentIntroText,
          voiceProvider: body?.voiceProvider || 'auto',
          voiceGender: body?.voiceGender === 'female' ? 'female' : 'male',
          title,
          onProgress,
        });
      }
    );

    return NextResponse.json({ success: true, action: 'render', ...queued });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro ao processar Auto-Clipper de Lives.' },
      { status: 500 }
    );
  }
}
