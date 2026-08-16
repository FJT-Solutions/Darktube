import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { saveDarkClipPost } from '@/lib/database';

const REMOTION_SERVER_URL = process.env.REMOTION_SERVER_URL || 'http://localhost:3001';

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

    console.log(`[DarkClips Render] Enviando render para Remotion Server (${REMOTION_SERVER_URL})...`);

    let renderedVideoUrl = '';

    // 1. Try Remotion Render Server
    try {
      const res = await fetch(`${REMOTION_SERVER_URL}/render`, {
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
        console.log('[DarkClips Render] Render concluído no servidor Remotion:', renderedVideoUrl);
      } else {
        console.warn('[DarkClips Render] Remotion Server response not OK:', await res.text());
      }
    } catch (err: any) {
      console.warn('[DarkClips Render] Remotion server unavailable:', err?.message);
    }

    // 2. Fallback: if render server is not running, return the source sanitized video URL
    if (!renderedVideoUrl) {
      renderedVideoUrl = inputProps.videoUrl;
    }

    // 3. Save post record in database
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
