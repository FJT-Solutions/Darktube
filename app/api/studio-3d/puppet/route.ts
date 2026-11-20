import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { listFlowLibrary } from '@/lib/flow-characters';
import {
  PUPPET_GOLDEN_PROMPTS,
  buildPuppetRigFromChromaPng,
  detectRhubarbRuntime,
  generateLipSyncMouthCues,
} from '@/lib/puppet-studio';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    const library = await listFlowLibrary(String(user.id)).catch(() => []);
    return NextResponse.json({
      success: true,
      rhubarb: detectRhubarbRuntime(),
      goldenPrompts: PUPPET_GOLDEN_PROMPTS,
      characters: library,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erro ao consultar Puppet Studio' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    const body = await req.json();
    const action = String(body?.action || 'build_rig');

    if (action === 'lipsync') {
      const words = Array.isArray(body?.words) ? body.words : [];
      const out = await generateLipSyncMouthCues({
        audioPath: body?.audioPath ? String(body.audioPath) : undefined,
        words,
        durationSec: body?.durationSec ? Number(body.durationSec) : undefined,
      });
      return NextResponse.json({ success: true, ...out });
    }

    const imageSource = String(body?.imageUrl || body?.imageSource || '').trim();
    if (!imageSource) {
      return NextResponse.json(
        { success: false, error: 'Informe imageUrl da folha de personagem em fundo #00FF00.' },
        { status: 400 }
      );
    }

    const rig = await buildPuppetRigFromChromaPng({
      imageSource,
      characterName: String(body?.characterName || 'Personagem Puppet'),
      expressionsSheetSource: body?.expressionsUrl ? String(body.expressionsUrl) : undefined,
      gridLayout: body?.gridLayout === '3x2' ? '3x2' : '2x2',
      accessoriesSheetSource: body?.accessoriesUrl ? String(body.accessoriesUrl) : undefined,
      outputBaseName: body?.outputBaseName ? String(body.outputBaseName) : undefined,
    });

    return NextResponse.json({ success: true, rig });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erro ao construir Puppet Rig' }, { status: 500 });
  }
}
