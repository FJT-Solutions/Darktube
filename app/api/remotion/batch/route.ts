import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { renderHtmlSvgToMp4 } from '@/lib/html-svg-render';
import type { HtmlSvgPreset } from '@/lib/html-svg-templates';
import { generateLipSyncMouthCues } from '@/lib/puppet-studio';
import { enqueueDetachedRenderTask } from '@/lib/render-queue';
import { uploadMediaFile } from '@/lib/storage';
import { generateThreeJsDirection } from '@/lib/threejs-director';
import { renderThreeJsToMp4 } from '@/lib/threejs-render';
import { compileThreeJsStoryboard } from '@/lib/threejs-scene-compiler';
import { resolveVoiceWithTimestamps, type VoiceGender, type VoiceProviderChoice } from '@/lib/voice-resolver';

export const dynamic = 'force-dynamic';
export const maxDuration = 900;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }
    const userId = String(user.id);
    const body = await req.json();
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    const maxLimit = Math.max(1, Math.min(20, Number(body?.limit) || 20));
    const items = rawItems.slice(0, maxLimit);

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Envie "items" com pelo menos 1 item JSON para renderização em lote.' },
        { status: 400 }
      );
    }

    const jobs: Array<{ index: number; title: string; engine: string; jobId: string; status: string; queuePosition: number }> = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      const engine: 'html_svg' | 'threejs_3d' = it.engine === 'threejs_3d' ? 'threejs_3d' : 'html_svg';
      const title = String(it.title || it.topic || `Lote #${i + 1}`).slice(0, 120);
      const aspect: '9:16' | '16:9' | '1:1' = it.aspect === '16:9' || it.aspect === '1:1' ? it.aspect : '9:16';
      const isDraft = it.isDraft !== undefined ? Boolean(it.isDraft) : true;
      const voiceProvider: VoiceProviderChoice = it.voiceProvider || 'auto';
      const voiceGender: VoiceGender = it.voiceGender === 'female' ? 'female' : 'male';

      if (engine === 'html_svg') {
        const preset = (it.preset || 'html_svg_explainer') as HtmlSvgPreset;
        const queued = await enqueueDetachedRenderTask(
          {
            userId,
            engine: 'html_svg',
            kind: 'full_video',
            title,
            payload: { batchIndex: i + 1, preset, aspect, isDraft },
          },
          async ({ onProgress }) => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_batch_svg_'));
            try {
              const spoken =
                String(it.scriptText || '').trim() ||
                (Array.isArray(it.scenes)
                  ? it.scenes.map((s: any) => s.spokenLine || s.subtitle || s.title).filter(Boolean).join(' ')
                  : title);
              let audioPath: string | undefined;
              if (spoken) {
                const vr = await resolveVoiceWithTimestamps({
                  userId,
                  scriptText: spoken,
                  outputDir: tmpDir,
                  voiceProvider,
                  voiceGender,
                  language: 'pt-BR',
                });
                audioPath = vr.audioPath;
              }
              await onProgress(25);
              const outMp4 = path.join(tmpDir, `batch_${i}_${Date.now()}.mp4`);
              const rendered = await renderHtmlSvgToMp4({
                spec: {
                  preset,
                  title,
                  aspect,
                  palette: Array.isArray(it.palette) ? it.palette : undefined,
                  scenes: Array.isArray(it.scenes) ? it.scenes : undefined,
                },
                outputPath: outMp4,
                draft: isDraft,
                audioPath,
              });
              const storagePath = await uploadMediaFile(
                fs.readFileSync(rendered.outputPath),
                `batch_htmlsvg_${Date.now()}_${i}.mp4`,
                'video/mp4'
              );
              return {
                videoUrl: storagePath,
                durationSec: rendered.durationSec,
                renderDurationMs: rendered.renderDurationMs,
                renderDurationLabel: rendered.renderDurationLabel,
              };
            } finally {
              try {
                fs.rmSync(tmpDir, { recursive: true, force: true });
              } catch {}
            }
          }
        );
        jobs.push({
          index: i + 1,
          title,
          engine: 'html_svg',
          jobId: queued.queueJobId,
          status: queued.status,
          queuePosition: queued.positionInQueue,
        });
      } else {
        const queued = await enqueueDetachedRenderTask(
          {
            userId,
            engine: 'threejs_3d',
            kind: 'full_video',
            title,
            payload: { batchIndex: i + 1, aspect, isDraft },
          },
          async ({ onProgress }) => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_batch_3d_'));
            try {
              let workingStoryboard = it.storyboard;
              let spoken = String(it.spokenScript || it.scriptText || '').trim();
              if (!workingStoryboard?.cenas?.length) {
                const dir = await generateThreeJsDirection({
                  userId,
                  topic: it.topic || title,
                  durationSec: Number(it.durationSec) || 24,
                  aspect,
                  quality: it.quality || (isDraft ? 'basica' : 'media'),
                  isDraft,
                });
                workingStoryboard = dir.compiled.storyboard;
                if (!spoken) spoken = dir.spokenScript;
              }
              const voiceRes = await resolveVoiceWithTimestamps({
                userId,
                scriptText: spoken || title,
                outputDir: tmpDir,
                voiceProvider,
                voiceGender,
                language: 'pt-BR',
              });
              await onProgress(25);
              const compiled = compileThreeJsStoryboard({
                kind: 'full_video',
                preset: 'custom_storyboard',
                title,
                aspect,
                isDraft,
                audioDurationSec: voiceRes.durationSec,
                storyboard: workingStoryboard,
              });
              const lipSync = await generateLipSyncMouthCues({
                audioPath: voiceRes.audioPath,
                words: voiceRes.words,
                durationSec: compiled.storyboard.duracao,
              });
              const outMp4 = path.join(tmpDir, `batch3d_${i}_${Date.now()}.mp4`);
              const sheetPath = path.join(tmpDir, `batch3d_qa_${i}.png`);
              const rendered = await renderThreeJsToMp4({
                storyboard: compiled.storyboard,
                words: voiceRes.words,
                mouthCues: lipSync.cues,
                audioPath: voiceRes.audioPath,
                outputPath: outMp4,
                isDraft,
                generateContactSheet: true,
                contactSheetPath: sheetPath,
                onProgress,
              });
              const storagePath = await uploadMediaFile(
                fs.readFileSync(rendered.outputPath),
                `batch_3d_${Date.now()}_${i}.mp4`,
                'video/mp4'
              );
              return {
                videoUrl: storagePath,
                durationSec: rendered.durationSec,
                renderDurationMs: rendered.renderDurationMs,
                renderDurationLabel: rendered.renderDurationLabel,
              };
            } finally {
              try {
                fs.rmSync(tmpDir, { recursive: true, force: true });
              } catch {}
            }
          }
        );
        jobs.push({
          index: i + 1,
          title,
          engine: 'threejs_3d',
          jobId: queued.queueJobId,
          status: queued.status,
          queuePosition: queued.positionInQueue,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalQueued: jobs.length,
      jobs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro ao enfileirar renderização em lote.' },
      { status: 500 }
    );
  }
}
