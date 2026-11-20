import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { detectBlenderRuntime } from '@/lib/blender-bridge';
import { detectRhubarbRuntime } from '@/lib/puppet-studio';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    blender: detectBlenderRuntime(),
    rhubarb: detectRhubarbRuntime(),
  });
}
