import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { saveDarkClipPost, getUserApiKey } from '@/lib/database';
import { uploadMediaFile } from '@/lib/storage';
import { pool } from '@/lib/db-client';
import { VideoCaptureService } from '@/lib/video-capture';
import { sanitizeVideo } from '@/lib/video-sanitizer';
import { generateAiRemodelForClip } from '../remodel-ai/route';
import fs from 'fs';
import path from 'path';

const CANDIDATE_URLS = [
  'http://n8n-remotionservice-ry6eh9:3001',
  process.env.REMOTION_SERVICE_URL?.replace(/\/render$/, ''),
  process.env.REMOTION_SERVER_URL,
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter(Boolean) as string[];

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Global in-memory set to prevent concurrent duplicate renders of the same clip
const activeClipRenders = new Set<string>();

export async function POST(req: Request) {
  let activeLockClipId: string | null = null;
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      clipId,
      title = 'Dark Clip Render',
      inputProps,
      durationInSeconds = 15,
      remodelData,
    } = body;

    if (!inputProps || !inputProps.videoUrl) {
      return NextResponse.json({ success: false, error: 'Video URL e inputProps são obrigatórios.' }, { status: 400 });
    }

    if (clipId) {
      if (activeClipRenders.has(clipId)) {
        console.warn(`[DarkClips Render] Tentativa de render duplicado bloqueada para o clipe: ${clipId}`);
        return NextResponse.json({
          success: false,
          error: 'Este vídeo já está sendo produzido no momento. Aguarde a conclusão do render atual.',
          isAlreadyRendering: true,
        }, { status: 409 });
      }
      activeClipRenders.add(clipId);
      activeLockClipId = clipId;
    }

    let sourceVideoUrl = inputProps.videoUrl || '';

    let clipRecord = null;
    if (clipId) {
      try {
        const clipRes = await pool.query('SELECT * FROM public.dark_clips WHERE id = $1', [clipId]);
        if (clipRes.rows.length > 0) {
          clipRecord = clipRes.rows[0];
        }
      } catch (e) {}
    }

    // Auto-heal de URLs blob: antigas ou links web que ainda não foram baixados
    if (sourceVideoUrl.startsWith('blob:') || (sourceVideoUrl.startsWith('http') && !sourceVideoUrl.includes('/api/storage/') && !sourceVideoUrl.endsWith('.mp4'))) {
      if (clipRecord) {
        try {
          const originalUrl = (clipRecord.original_url && !clipRecord.original_url.startsWith('blob:')) ? clipRecord.original_url : (sourceVideoUrl.startsWith('blob:') ? '' : sourceVideoUrl);
          if (originalUrl && originalUrl.startsWith('http') && !originalUrl.includes('/api/storage/')) {
            console.log(`[DarkClips Render] Auto-healing clipe ${clipId} a partir de: ${originalUrl}`);
            const dl = await VideoCaptureService.downloadFromUrl(originalUrl);
            if (dl.videoPath && fs.existsSync(dl.videoPath)) {
              const baseTmp = process.env.NODE_ENV === 'production' ? '/app/tmp' : path.join(process.cwd(), 'tmp');
              const sanitizedDir = path.join(baseTmp, 'sanitized_clips');
              if (!fs.existsSync(sanitizedDir)) fs.mkdirSync(sanitizedDir, { recursive: true });
              const sanitizedPath = path.join(sanitizedDir, `sanitized_${path.basename(dl.videoPath)}`);
              await sanitizeVideo(dl.videoPath, sanitizedPath);

              const fileBuffer = fs.readFileSync(sanitizedPath);
              const filename = `clip_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
              sourceVideoUrl = await uploadMediaFile(fileBuffer, filename, 'video/mp4');

              // Atualizar registro no banco para que nunca mais tenha blob:
              await pool.query('UPDATE public.dark_clips SET video_url = $1 WHERE id = $2', [sourceVideoUrl, clipId]);
              console.log(`[DarkClips Render] ✅ Clipe recuperado e salvo em: ${sourceVideoUrl}`);
            }
          }
        } catch (healErr: any) {
          console.warn('[DarkClips Render] Aviso ao recuperar vídeo original:', healErr.message);
        }
      }
    }

    if (sourceVideoUrl.startsWith('blob:')) {
      return NextResponse.json({
        success: false,
        error: 'Este clipe foi minerado com uma URL temporária blob:. Por favor, reimporte o post com a extensão atualizada.',
      }, { status: 400 });
    }

    // ── Resolução Automática de Gancho de IA para o Vídeo ──
    const targetUserId = user?.id || null;
    let finalRemodelData = remodelData || {};
    const isGenericHeadline = !inputProps.headline?.mainText || inputProps.headline.mainText === 'Meu amigo: "Comprei um mic novo, mano."';

    if (isGenericHeadline && clipRecord) {
      const parsedRemodel = typeof clipRecord.remodel_data === 'string' ? JSON.parse(clipRecord.remodel_data) : (clipRecord.remodel_data || {});
      if (parsedRemodel?.headline_main) {
        inputProps.headline = {
          ...inputProps.headline,
          mainText: parsedRemodel.headline_main,
          subText: parsedRemodel.headline_sub || inputProps.headline?.subText,
        };
        finalRemodelData = parsedRemodel;
      } else {
        try {
          const userOpenAiKey = targetUserId ? await getUserApiKey(targetUserId, 'openai') : null;
          const userGeminiKey = targetUserId ? await getUserApiKey(targetUserId, 'gemini') : null;
          const generated = await generateAiRemodelForClip({
            originalCaption: clipRecord.original_caption || '',
            authorName: clipRecord.author_name || '',
            authorHandle: clipRecord.author_handle || '@darkclips',
            platform: clipRecord.platform || 'instagram',
            mainTextMode: inputProps.headline?.mainTextMode || 'ai',
            mainTextFixed: inputProps.headline?.mainText || '',
            mainTextMaxWords: inputProps.headline?.mainTextMaxWords || 8,
            subTextMode: inputProps.headline?.subTextMode || 'ai',
            subTextFixed: inputProps.headline?.subText || '',
            subTextMaxWords: inputProps.headline?.subTextMaxWords || 6,
            ctaMode: inputProps.footer?.mode || 'manual',
            fixedCta: inputProps.footer?.text || '',
            ctaMaxWords: inputProps.footer?.maxWords || 6,
            userOpenAiKey,
            userGeminiKey,
          });
          if (generated?.headline_main) {
            inputProps.headline = {
              ...inputProps.headline,
              mainText: generated.headline_main,
              subText: generated.headline_sub || inputProps.headline?.subText,
            };
            finalRemodelData = generated;
            await pool.query('UPDATE public.dark_clips SET remodel_data = $1 WHERE id = $2', [JSON.stringify(generated), clipId]);
          }
        } catch (genErr) {
          console.warn('[DarkClips Render] Aviso ao auto-gerar gancho de IA:', genErr);
        }
      }
    }

    let renderedVideoUrl = '';
    let lastError = '';

    // 1. Tentar conectar nos endpoints do Remotion
    for (const baseUrl of CANDIDATE_URLS) {
      const cleanBase = baseUrl.replace(/\/+$/, '');
      const renderEndpoint = cleanBase.endsWith('/render') ? cleanBase : `${cleanBase}/render`;
      console.log(`[DarkClips Render] Tentando Remotion Server em ${renderEndpoint}...`);

      try {
        const res = await fetch(renderEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            compositionId: 'DarkClipsVideo',
            inputProps: {
              ...inputProps,
              videoUrl: sourceVideoUrl,
              durationInSeconds,
            },
            durationInFrames: Math.max(30, Math.round(durationInSeconds * 30)),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawUrl = data.videoUrl || data.url || '';
          if (rawUrl) {
            console.log(`[DarkClips Render] ✅ Render concluído via ${cleanBase}: ${rawUrl}. Persistindo no storage...`);

            // Baixar o arquivo MP4 do container do Remotion e salvar no banco de dados local
            try {
              const fetchUrl = rawUrl.startsWith('http') ? rawUrl : `${cleanBase}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
              const videoStreamRes = await fetch(fetchUrl);
              if (videoStreamRes.ok) {
                const arrayBuf = await videoStreamRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuf);
                const filename = `rendered_${path.basename(rawUrl)}`;
                renderedVideoUrl = await uploadMediaFile(buffer, filename, 'video/mp4');
                console.log(`[DarkClips Render] ✅ MP4 persistido com sucesso em: ${renderedVideoUrl}`);
                break;
              }
            } catch (persistErr: any) {
              console.warn('[DarkClips Render] Aviso ao persistir MP4 no storage:', persistErr.message);
              renderedVideoUrl = rawUrl;
              break;
            }
          }
        } else {
          lastError = await res.text();
          console.warn(`[DarkClips Render] Resposta não-OK de ${cleanBase}:`, lastError);
        }
      } catch (err: any) {
        lastError = err?.message;
        console.warn(`[DarkClips Render] Falha ao conectar em ${cleanBase}:`, lastError);
      }
    }

    if (!renderedVideoUrl) {
      console.error(`[DarkClips Render] Falha em todos os endpoints do Remotion. Último erro: ${lastError}`);
      return NextResponse.json({
        success: false,
        error: `Falha ao renderizar no Remotion: ${lastError || 'Servidor Remotion indisponível'}`,
      }, { status: 500 });
    }

    // 2. Salvar post no banco de dados
    const post = await saveDarkClipPost({
      user_id: user?.id,
      clip_id: clipId,
      title,
      rendered_video_url: renderedVideoUrl,
      remodel_data: remodelData || {
        headline_main: inputProps.headline?.mainText,
        headline_sub: inputProps.headline?.subText,
        cta_text: inputProps.footer?.text,
      },
      status: 'rendered',
    });

    return NextResponse.json({
      success: true,
      videoUrl: renderedVideoUrl,
      post,
    });
  } catch (err: any) {
    console.error('Error in dark-clips render API:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (activeLockClipId) {
      activeClipRenders.delete(activeLockClipId);
    }
  }
}
