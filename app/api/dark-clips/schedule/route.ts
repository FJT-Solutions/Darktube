import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getDarkClipPosts, saveDarkClipPost, deleteDarkClipPost, updateDarkClipPostStatus, getUserApiKey } from '@/lib/database';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const posts = await getDarkClipPosts(user?.id);
    return NextResponse.json({ success: true, posts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      clipId,
      title,
      renderedVideoUrl,
      remodelData,
      scheduledAt,
      targetAccounts = [],
      dispatchNow = false,
    } = body;

    const post = await saveDarkClipPost({
      user_id: user?.id,
      clip_id: clipId,
      title: title || remodelData?.headline_main || 'Dark Clip Meme',
      rendered_video_url: renderedVideoUrl,
      remodel_data: remodelData,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      status: dispatchNow ? 'publishing' : 'scheduled',
      target_accounts: targetAccounts,
    });

    // If dispatchNow is requested, notify n8n / webhook
    if (dispatchNow && user) {
      try {
        let webhookUrl = await getUserApiKey(user.id, 'n8n_webhook');
        if (!webhookUrl) webhookUrl = process.env.N8N_PRODUCTION_WEBHOOK_URL || 'https://n8n.fjt-solutions.com/webhook/darktube_producao';

        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'dark_clips_publish',
              postId: post.id,
              userId: user.id,
              videoUrl: renderedVideoUrl,
              title: post.title,
              caption: remodelData?.post_caption || remodelData?.caption || '',
              hashtags: remodelData?.hashtags || [],
              targetAccounts,
              scheduledAt: post.scheduled_at,
              timestamp: new Date().toISOString()
            })
          });
          await updateDarkClipPostStatus(post.id, 'published', renderedVideoUrl);
        }
      } catch (dispatchErr: any) {
        console.error('[Schedule API] Webhook dispatch error:', dispatchErr);
      }
    }

    return NextResponse.json({ success: true, post });
  } catch (err: any) {
    console.error('Error in schedule API:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    await deleteDarkClipPost(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
