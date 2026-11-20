import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { buildAiStreamerBundle } from '@/lib/ai-streamer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }
    const body = await req.json();
    const bundle = buildAiStreamerBundle({
      personaName: body?.personaName,
      niche: body?.niche,
      personalityPromptPtBr: body?.personalityPromptPtBr,
      voiceName: body?.voiceName,
      obsSceneName: body?.obsSceneName,
      triggerOnGifts: body?.triggerOnGifts,
      triggerOnComments: body?.triggerOnComments,
      llmModel: body?.llmModel,
      cooldownSec: body?.cooldownSec,
    });
    return NextResponse.json({ success: true, ...bundle });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro ao gerar Kit Streamer IA.' },
      { status: 500 }
    );
  }
}
