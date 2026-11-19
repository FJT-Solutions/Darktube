import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { generateThreeJsDirection } from '@/lib/threejs-director';
import { compileThreeJsStoryboard } from '@/lib/threejs-scene-compiler';
import type { FlowProvider } from '@/lib/flow-llm';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });

    const body = await req.json();
    const mode = String(body?.mode || 'llm');
    const kind = body?.kind === 'single_scene' ? 'single_scene' : 'full_video';
    const aspect = body?.aspect === '16:9' || body?.aspect === '1:1' ? body.aspect : '9:16';
    const quality = body?.quality === 'alta' ? 'alta' : body?.quality === 'basica' ? 'basica' : 'media';

    if (mode === 'preset') {
      const compiled = compileThreeJsStoryboard({
        kind,
        preset: 'curiosidade_cratera',
        aspect,
        isDraft: quality === 'basica',
        storyboard: { qualidade: quality },
      });
      return NextResponse.json({
        success: true,
        providerUsed: 'preset',
        spokenScript: compiled.spokenScript,
        storyboard: compiled.storyboard,
        sceneCount: compiled.sceneCount,
        auditFixes: compiled.auditFixes,
        usedGlbModels: [],
      });
    }

    const topic = String(body?.topic || '').trim();
    if (!topic) {
      return NextResponse.json({ success: false, error: 'Descreva o tema do vídeo 3D.' }, { status: 400 });
    }

    const directed = await generateThreeJsDirection({
      userId: String(user.id),
      topic,
      durationSec: Number(body?.durationSec || (kind === 'single_scene' ? 6 : 60)),
      kind,
      aspect,
      quality,
      isDraft: quality === 'basica',
      provider: body?.provider as FlowProvider | undefined,
    });

    return NextResponse.json({
      success: true,
      providerUsed: directed.providerUsed,
      spokenScript: directed.spokenScript,
      storyboard: directed.compiled.storyboard,
      sceneCount: directed.compiled.sceneCount,
      auditFixes: directed.compiled.auditFixes,
      usedGlbModels: directed.usedGlbModels,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erro ao gerar roteiro 3D' }, { status: 500 });
  }
}
