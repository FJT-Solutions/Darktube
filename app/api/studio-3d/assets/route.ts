import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import {
  downloadExternalGlbToLibrary,
  downloadPolyHavenModel,
  downloadSketchfabModel,
  ensureBuiltinSfx,
  listLocal3dModels,
  searchFree3dAssets,
  searchFreesoundSfx,
  searchWikimediaImages,
} from '@/lib/threejs-asset-hub';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    const url = new URL(req.url);

    const sfxPlay = url.searchParams.get('sfxPlay');
    if (sfxPlay) {
      const sfx = await ensureBuiltinSfx(sfxPlay);
      return new NextResponse(fs.readFileSync(sfx.path), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const type = url.searchParams.get('type') || '3d';
    const q = url.searchParams.get('q') || '';
    const limit = Number(url.searchParams.get('limit') || 16);

    if (type === 'wikimedia') {
      const images = await searchWikimediaImages(q || 'history', limit);
      return NextResponse.json({ success: true, type: 'wikimedia', images });
    }

    if (type === 'sfx') {
      const sfx = await searchFreesoundSfx(q, limit);
      return NextResponse.json({ success: true, type: 'sfx', ...sfx });
    }

    const result = await searchFree3dAssets(q, { limit });
    return NextResponse.json({ success: true, type: '3d', ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erro ao buscar assets' }, { status: 500 });
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

    if (source === 'sketchfab') {
      const assetId = String(body?.assetId || '').trim();
      if (!assetId) return NextResponse.json({ success: false, error: 'assetId do Sketchfab é obrigatório.' }, { status: 400 });
      const model = await downloadSketchfabModel(assetId);
      return NextResponse.json({ success: true, model, local: listLocal3dModels() });
    }

    if (source === 'sfx_builtin') {
      const sfxId = String(body?.sfxId || body?.assetId || '').trim();
      if (!sfxId) return NextResponse.json({ success: false, error: 'sfxId é obrigatório.' }, { status: 400 });
      const sfx = await ensureBuiltinSfx(sfxId);
      return NextResponse.json({ success: true, sfx });
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
    return NextResponse.json({ success: false, error: err?.message || 'Erro ao baixar asset' }, { status: 500 });
  }
}
