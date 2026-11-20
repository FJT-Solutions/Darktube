import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { renderBlenderStoryboard } from '@/lib/blender-bridge';
import { generateLipSyncMouthCues } from '@/lib/puppet-studio';
import { enqueueDetachedRenderTask, type RenderJobKind } from '@/lib/render-queue';
import { formatDeliveryDuration } from '@/lib/render-timing';
import { compileThreeJsStoryboard, type ThreeJsStoryboard } from '@/lib/threejs-scene-compiler';
import { renderThreeJsToMp4 } from '@/lib/threejs-render';
import { resolveVoiceWithTimestamps, type VoiceGender, type VoiceProviderChoice } from '@/lib/voice-resolver';
import { uploadMediaFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 900;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    const userId = String(user.id);

    const body = await req.json();
    const storyboardInput = body?.storyboard as Partial<ThreeJsStoryboard> | undefined;
    const spokenScript = String(body?.spokenScript || '').trim();
    const kind: RenderJobKind = body?.kind === 'single_scene' ? 'single_scene' : 'full_video';
    const aspect = body?.aspect === '16:9' || body?.aspect === '1:1' ? body.aspect : '9:16';
    const quality: 'alta' | 'media' | 'basica' = body?.quality === 'alta' ? 'alta' : body?.quality === 'basica' ? 'basica' : 'media';
    const isDraft = body?.isDraft !== undefined ? Boolean(body.isDraft) : quality === 'basica';
    const backend: 'threejs' | 'blender' = body?.backend === 'blender' ? 'blender' : 'threejs';
    const fallbackToThreeJs = body?.fallbackToThreeJs !== false;
    const voiceProvider: VoiceProviderChoice = body?.voiceProvider || 'auto';
    const voiceGender: VoiceGender = body?.voiceGender === 'female' ? 'female' : 'male';
    const audioPathOrUrl = body?.audioPathOrUrl ? String(body.audioPathOrUrl) : undefined;
    const title = String(body?.title || storyboardInput?.titulo || 'Vídeo 3D DarkTube').slice(0, 120);

    if (!storyboardInput?.cenas?.length) {
      return NextResponse.json({ success: false, error: 'Gere ou forneça um storyboard 3D com cenas válidas antes de renderizar.' }, { status: 400 });
    }

    const queued = await enqueueDetachedRenderTask(
      {
        userId,
        engine: backend === 'blender' ? 'blender_3d' : 'threejs_3d',
        kind,
        title,
        payload: { kind, aspect, quality, isDraft, backend, voiceProvider, voiceGender, scenesCount: storyboardInput.cenas.length },
      },
      async ({ onProgress }) => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_studio3d_'));
        try {
          const voiceRes = await resolveVoiceWithTimestamps({
            userId,
            scriptText: spokenScript || title,
            outputDir: tmpDir,
            audioPathOrUrl,
            voiceProvider,
            voiceGender,
            language: 'pt-BR',
          });
          await onProgress(15);

          const compiled = compileThreeJsStoryboard({
            kind,
            preset: 'custom_storyboard',
            title,
            aspect,
            isDraft,
            audioDurationSec: kind === 'single_scene' ? undefined : voiceRes.durationSec,
            storyboard: {
              ...storyboardInput,
              qualidade: quality,
            },
          });

          const lipSync = await generateLipSyncMouthCues({
            audioPath: voiceRes.audioPath,
            words: voiceRes.words,
            durationSec: compiled.storyboard.duracao,
          });

          const outMp4 = path.join(tmpDir, `studio3d_${Date.now()}.mp4`);
          const qaSheetPath = path.join(tmpDir, `contact_sheet_${Date.now()}.png`);

          const rendered =
            backend === 'blender'
              ? await renderBlenderStoryboard({
                  storyboard: compiled.storyboard,
                  words: voiceRes.words,
                  mouthCues: lipSync.cues,
                  audioPath: voiceRes.audioPath,
                  outputPath: outMp4,
                  isDraft,
                  fallbackToThreeJs,
                  contactSheetPath: qaSheetPath,
                  onProgress,
                })
              : await renderThreeJsToMp4({
                  storyboard: compiled.storyboard,
                  words: voiceRes.words,
                  mouthCues: lipSync.cues,
                  audioPath: voiceRes.audioPath,
                  outputPath: outMp4,
                  isDraft,
                  generateContactSheet: true,
                  contactSheetPath: qaSheetPath,
                  onProgress,
                });

          const fileName = `studio3d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp4`;
          const storagePath = await uploadMediaFile(fs.readFileSync(rendered.outputPath), fileName, 'video/mp4');

          let contactSheetUrl: string | undefined;
          if (rendered.contactSheetPath && fs.existsSync(rendered.contactSheetPath)) {
            const sheetName = `studio3d_qa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`;
            contactSheetUrl = await uploadMediaFile(fs.readFileSync(rendered.contactSheetPath), sheetName, 'image/png');
          }

          const backendUsed = 'backendUsed' in rendered ? rendered.backendUsed : 'threejs';
          const renderDurationMs = rendered.renderDurationMs;
          const renderDurationLabel = rendered.renderDurationLabel || formatDeliveryDuration(renderDurationMs);
          console.log(
            `[Studio 3D] ✅ Render concluído em ${renderDurationLabel} (backend=${backendUsed}, lipSync=${lipSync.engine}, qa=${rendered.qaChecks.passed})`
          );

          return {
            videoUrl: storagePath,
            contactSheetUrl,
            qaChecks: rendered.qaChecks,
            lipSyncEngine: lipSync.engine,
            backendUsed,
            voiceProviderUsed: voiceRes.providerUsed,
            voiceUsed: voiceRes.voiceUsed,
            durationSec: rendered.durationSec,
            width: rendered.width,
            height: rendered.height,
            fps: rendered.fps,
            sceneCount: compiled.sceneCount,
            auditFixes: compiled.auditFixes,
            renderDurationMs,
            renderDurationLabel,
          };
        } finally {
          try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          } catch {}
        }
      }
    );

    return NextResponse.json({ success: true, ...queued });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erro ao enfileirar render 3D' }, { status: 500 });
  }
}
