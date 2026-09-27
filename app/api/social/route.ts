import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getUserApiKey, upsertUserApiKey } from '@/lib/database';

export const dynamic = 'force-dynamic';

const SESSIONS_DIR = path.resolve(process.cwd(), 'scripts/social-uploader/sessions');

const SESSION_FILES: Record<string, string> = {
  tiktok: 'tiktok_cookies.json',
  instagram: 'instagram_session.json',
  facebook: 'instagram_session.json',
  youtube: 'youtube_credentials.json',
  pinterest: 'pinterest_cookies.json',
  kwai: 'kwai_cookies.json',
  threads: 'threads_cookies.json',
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    // Telegram status
    let telegramConnected = false;
    let telegramBotToken = '';
    let telegramChatId = '';
    if (user) {
      telegramBotToken = await getUserApiKey(user.id, 'telegram_bot_token');
      telegramChatId = await getUserApiKey(user.id, 'telegram_chat_id');
      telegramConnected = Boolean(telegramBotToken && telegramChatId);
    }
    if (!telegramConnected && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      telegramConnected = true;
      telegramChatId = process.env.TELEGRAM_CHAT_ID;
    }

    const isFilePresent = (...fileNames: string[]) => 
      fileNames.some(f => fs.existsSync(path.join(SESSIONS_DIR, f)));

    const accounts: Record<string, { connected: boolean; label: string; details?: string }> = {
      tiktok: {
        connected: isFilePresent('tiktok_cookies.json'),
        label: 'TikTok',
      },
      instagram: {
        connected: isFilePresent('instagram_session.json', 'instagram_cookies.json'),
        label: 'Instagram Reels',
      },
      facebook: {
        connected: isFilePresent('facebook_cookies.json', 'instagram_session.json'),
        label: 'Facebook Reels',
      },
      youtube: {
        connected: isFilePresent('youtube_credentials.json', 'youtube_cookies.json'),
        label: 'YouTube Shorts',
      },
      pinterest: {
        connected: isFilePresent('pinterest_cookies.json'),
        label: 'Pinterest',
      },
      kwai: {
        connected: isFilePresent('kwai_cookies.json'),
        label: 'Kwai',
      },
      threads: {
        connected: isFilePresent('threads_cookies.json') || Boolean(process.env.THREADS_ACCESS_TOKEN),
        label: 'Threads',
      },
      telegram: {
        connected: telegramConnected,
        label: 'Telegram',
        details: telegramChatId ? `Canal: ${telegramChatId}` : undefined,
      },
    };

    const fbPagesFile = path.join(SESSIONS_DIR, 'facebook_pages.json');
    let facebookPages: Array<{ id: string; name: string; url: string; avatarUrl?: string }> = [];
    if (fs.existsSync(fbPagesFile)) {
      try {
        facebookPages = JSON.parse(fs.readFileSync(fbPagesFile, 'utf-8'));
      } catch (e) {}
    }

    if (facebookPages.length > 0 && accounts.facebook) {
      accounts.facebook.details = `${facebookPages.length} páginas sincronizadas`;
    }

    return NextResponse.json({ 
      success: true, 
      accounts, 
      telegramChatId,
      facebookPages 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { action, platform, telegramBotToken, telegramChatId } = body;

    if (action === 'save_telegram') {
      if (user) {
        if (telegramBotToken !== undefined) {
          await upsertUserApiKey(user.id, 'telegram_bot_token', telegramBotToken);
        }
        if (telegramChatId !== undefined) {
          await upsertUserApiKey(user.id, 'telegram_chat_id', telegramChatId);
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'disconnect' && platform) {
      const filesToDelete: Record<string, string[]> = {
        facebook: ['facebook_cookies.json', 'facebook_pages.json', 'facebook_groups.json', 'instagram_session.json'],
        youtube: ['youtube_cookies.json', 'youtube_credentials.json'],
        instagram: ['instagram_cookies.json', 'instagram_session.json'],
        tiktok: ['tiktok_cookies.json'],
        pinterest: ['pinterest_cookies.json'],
        kwai: ['kwai_cookies.json'],
        threads: ['threads_cookies.json'],
      };

      const targets = filesToDelete[platform] || [`${platform}_cookies.json`];
      for (const f of targets) {
        const p = path.join(SESSIONS_DIR, f);
        if (fs.existsSync(p)) {
          try { fs.unlinkSync(p); } catch (e) {}
        }
      }

      // Remove perfil de navegador persistente se existir
      const profDir = path.join(SESSIONS_DIR, 'profiles', platform);
      if (fs.existsSync(profDir)) {
        try { fs.rmSync(profDir, { recursive: true, force: true }); } catch (e) {}
      }

      if (platform === 'telegram' && user) {
        await upsertUserApiKey(user.id, 'telegram_bot_token', '');
        await upsertUserApiKey(user.id, 'telegram_chat_id', '');
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'connect' && platform) {
      const authScript = path.resolve(process.cwd(), 'scripts/social-uploader/auth_manager.py');
      const authLogFile = path.join(SESSIONS_DIR, 'auth.log');
      const outLog = fs.openSync(authLogFile, 'a');
      const child = spawn('python', [authScript, '--network', platform], {
        detached: true,
        stdio: ['ignore', outLog, outLog],
      });
      child.unref();

      return NextResponse.json({
        success: true,
        message: `Janela de login para ${platform} aberta no navegador. Conclua o login na janela aberta.`,
      });
    }

    if (action === 'refresh_facebook_pages') {
      const getPagesScript = path.resolve(process.cwd(), 'scripts/social-uploader/get_facebook_pages.py');
      const { execSync } = require('child_process');
      try {
        execSync(`python "${getPagesScript}"`, { timeout: 35000 });
      } catch (e) {}

      const fbPagesFile = path.join(SESSIONS_DIR, 'facebook_pages.json');
      let pages: any[] = [];
      if (fs.existsSync(fbPagesFile)) {
        try { pages = JSON.parse(fs.readFileSync(fbPagesFile, 'utf-8')); } catch (e) {}
      }
      return NextResponse.json({ success: true, facebookPages: pages });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
