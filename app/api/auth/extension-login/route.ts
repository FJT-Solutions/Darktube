import { NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { verifyPassword, signJWT } from '@/lib/crypto';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.getProfileByEmail(cleanEmail);

    if (!user) {
      return NextResponse.json({ success: false, error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    if (user.status === 'pending') {
      return NextResponse.json({ success: false, error: 'Sua conta ainda está aguardando aprovação.' }, { status: 403 });
    }

    if (user.status === 'blocked') {
      return NextResponse.json({ success: false, error: 'Sua conta foi bloqueada.' }, { status: 403 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ success: false, error: 'Senha não configurada para este usuário.' }, { status: 400 });
    }

    const isPasswordCorrect = await verifyPassword(password, user.password_hash);
    if (!isPasswordCorrect) {
      return NextResponse.json({ success: false, error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    // Sign JWT token
    const token = await signJWT({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      status: user.status || 'approved',
      full_name: user.full_name || user.email.split('@')[0]
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name || user.email.split('@')[0],
        role: user.role || 'user'
      }
    });
  } catch (err: any) {
    console.error('Error in extension-login API:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
