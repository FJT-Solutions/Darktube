export interface RenderTimingInfo {
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  queueWaitMs: number | null;
  renderDurationMs: number | null;
  totalDeliveryMs: number | null;
  queueWaitLabel: string | null;
  renderDurationLabel: string | null;
  totalDeliveryLabel: string | null;
  isRunning: boolean;
}

function toMs(v: string | Date | null | undefined): number | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function toIso(v: string | Date | null | undefined): string | null {
  const t = toMs(v);
  return t === null ? null : new Date(t).toISOString();
}

export function formatDeliveryDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '—';
  const totalSec = ms / 1000;
  if (totalSec < 60) {
    const rounded = Math.round(totalSec * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
  }
  const intSec = Math.round(totalSec);
  const hours = Math.floor(intSec / 3600);
  const mins = Math.floor((intSec % 3600) / 60);
  const secs = intSec % 60;
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function computeRenderTiming(input: {
  createdAt?: string | Date | null;
  startedAt?: string | Date | null;
  finishedAt?: string | Date | null;
  nowMs?: number;
}): RenderTimingInfo {
  const cMs = toMs(input.createdAt);
  const sMs = toMs(input.startedAt);
  const fMs = toMs(input.finishedAt);
  const now = typeof input.nowMs === 'number' && Number.isFinite(input.nowMs) ? input.nowMs : Date.now();
  const isRunning = fMs === null;

  const endMs = fMs ?? now;
  const queueWaitMs = cMs !== null && sMs !== null ? Math.max(0, sMs - cMs) : cMs !== null && isRunning ? Math.max(0, now - cMs) : null;
  const renderDurationMs = sMs !== null ? Math.max(0, endMs - sMs) : null;
  const totalDeliveryMs = cMs !== null ? Math.max(0, endMs - cMs) : renderDurationMs;

  return {
    createdAt: toIso(input.createdAt),
    startedAt: toIso(input.startedAt),
    finishedAt: toIso(input.finishedAt),
    queueWaitMs,
    renderDurationMs,
    totalDeliveryMs,
    queueWaitLabel: queueWaitMs !== null ? formatDeliveryDuration(queueWaitMs) : null,
    renderDurationLabel: renderDurationMs !== null ? formatDeliveryDuration(renderDurationMs) : null,
    totalDeliveryLabel: totalDeliveryMs !== null ? formatDeliveryDuration(totalDeliveryMs) : null,
    isRunning,
  };
}
