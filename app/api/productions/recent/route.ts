import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/crypto';
import { db } from '@/lib/database';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ history: [] });
    }

    const history = await db.getAllRecentProductionHistory(user.id, 20);
    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('Error in GET /api/productions/recent:', error);
    return NextResponse.json({ history: [] });
  }
}
