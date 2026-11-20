import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getAllRecentProductionHistory } from '@/lib/database';
import { computeRenderTiming } from '@/lib/render-timing';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ history: [] });
    }

    const rawHistory = await getAllRecentProductionHistory(20);
    const history = rawHistory.map((item: any) => {
      const payload = typeof item.payload === 'string' ? (() => { try { return JSON.parse(item.payload); } catch { return {}; } })() : (item.payload || {});
      const finishedRef = payload?.deliveryFinishedAt || (item.status === 'completed' || item.status === 'failed' ? item.updated_at || null : null);
      const timing = computeRenderTiming({
        createdAt: item.dispatched_at || item.created_at,
        finishedAt: finishedRef,
      });
      const deliveryTimeMs = typeof payload?.deliveryTimeMs === 'number' ? payload.deliveryTimeMs : timing.totalDeliveryMs;
      const deliveryTimeLabel = payload?.deliveryTimeLabel || timing.totalDeliveryLabel;
      return {
        ...item,
        deliveryTimeMs,
        deliveryTimeLabel,
      };
    });
    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('Error in GET /api/productions/recent:', error);
    return NextResponse.json({ history: [] });
  }
}
