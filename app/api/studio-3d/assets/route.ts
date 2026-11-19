import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import {
  downloadExternalGlbToLibrary,
  downloadPolyHavenModel,
  listLocal3dModels,
  searchFree3dAssets,
} from '@/lib/threejs-asset-hub';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const limit = Number(url.searchParams.get('limit') || 16);
    const result = await searchFree3dAssets(q, { limit });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erro ao buscar assets 3D' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    const body = await req.json();
    const source = String(body?.source || 'polyhaven');

    if (source === 'polyhaven') {
      const assetId = String(body?.assetId || '').trim();
      if (!assetId) return NextResponse.json({ success: false, error: 'assetId é obrigatório.' }, { status: 400 });
      const model = await downloadPolyHavenModel(assetId);
      return NextResponse.json({ success: true, model, local: listLocal3dModels() });
    }

    const url = String(body?.url || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ success: false, error: 'Informe uma URL https:// válida para o arquivo .glb.' }, { status: 400 });
    }
    const model = await downloadExternalGlbToLibrary({
      url,
      id: body?.assetId ? String(body.assetId) : undefined,
      name: body?.name ? String(body.name) : undefined,
      source: source === 'polypizza' ? 'polypizza' : 'url',
      license: body?.license ? String(body.license) : 'CC0',
      thumbnailUrl: body?.thumbnailUrl ? String(body.thumbnailUrl) : undefined,
    });
    return NextResponse.json({ success: true, model, local: listLocal3dModels() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erro ao baixar modelo 3D' }, { status: 500 });
  }
}
