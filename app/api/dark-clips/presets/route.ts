import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getDarkClipPresets, saveDarkClipPreset, deleteDarkClipPreset } from '@/lib/database';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const presets = await getDarkClipPresets(user?.id);
    return NextResponse.json({ success: true, presets });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const saved = await saveDarkClipPreset({
      ...body,
      user_id: user?.id,
    });
    return NextResponse.json({ success: true, preset: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    await deleteDarkClipPreset(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
