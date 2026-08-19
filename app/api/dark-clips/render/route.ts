import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { saveDarkClipPost } from '@/lib/database';

const CANDIDATE_URLS = [
  process.env.REMOTION_SERVICE_URL?.replace(/\/render$/, ''),
  process.env.REMOTION_SERVER_URL,
  'http://n8n-remotionservice-ry6eh9:3001',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter(Boolean) as string[];

export async function POST(req: Request) {
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
              durationInSeconds,
            },
            durationInFrames: Math.max(30, Math.round(durationInSeconds * 30)),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          renderedVideoUrl = data.videoUrl || data.url || '';
          if (renderedVideoUrl) {
            console.log(`[DarkClips Render] ✅ Render concluído com sucesso via ${cleanBase}:`, renderedVideoUrl);
            break;
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
      console.warn(`[DarkClips Render] Remotion indisponível (${lastError}), usando vídeo sanitizado como fallback.`);
      renderedVideoUrl = inputProps.videoUrl;
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
  }
}
