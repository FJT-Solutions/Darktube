import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getUserApiKey, upsertUserApiKey } from '@/lib/database';
import { getPythonCommand, safeSpawn } from '@/lib/python-runtime';

export const dynamic = 'force-dynamic';

const SESSIONS_DIR = path.resolve(process.cwd(), 'scripts/social-uploader/sessions');

const SESSION_MAP: Record<string, string> = {
  facebook_cookies: 'facebook_cookies.json',
  facebook_pages: 'facebook_pages.json',
  youtube_cookies: 'youtube_cookies.json',
  youtube_credentials: 'youtube_credentials.json',
  instagram_cookies: 'instagram_cookies.json',
  instagram_session: 'instagram_session.json',
  tiktok_cookies: 'tiktok_cookies.json',
  pinterest_cookies: 'pinterest_cookies.json',
  kwai_cookies: 'kwai_cookies.json',
  threads_cookies: 'threads_cookies.json',
};

/**
 * Sincroniza arquivos de sessão do disco para o banco de dados (nuvem)
 */
async function syncDiskSessionsToDb(userId: string) {
  if (!fs.existsSync(SESSIONS_DIR)) return;

  for (const [key, fileName] of Object.entries(SESSION_MAP)) {
    const filePath = path.join(SESSIONS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content && content.trim().length > 2) {
          await upsertUserApiKey(userId, `social_session_${key}`, content);
        }
      } catch (e) {
        console.warn(`[Social API] Erro ao sincronizar ${fileName} para o banco:`, e);
      }
    }
  }
}

/**
 * Restaura arquivos de sessão do banco de dados (nuvem) para o disco local
 */
async function restoreDbSessionsToDisk(userId: string) {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }

    for (const [key, fileName] of Object.entries(SESSION_MAP)) {
      const filePath = path.join(SESSIONS_DIR, fileName);
      if (!fs.existsSync(filePath)) {
        const dbContent = await getUserApiKey(userId, `social_session_${key}`);
        if (dbContent && dbContent.trim().length > 2) {
          try {
            fs.writeFileSync(filePath, dbContent, 'utf-8');
            console.log(`[Social API] Sessão ${fileName} restaurada do banco para o servidor com sucesso!`);
          } catch (wErr) {
            console.warn(`[Social API] Não foi possível salvar ${fileName} no disco:`, wErr);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[Social API] Erro ao restaurar sessões do banco:`, err);
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    // Sincronização bidirecional inteligente
    if (user) {
      await syncDiskSessionsToDb(user.id);
      await restoreDbSessionsToDisk(user.id);
    }

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

    const isHeadless = process.platform !== 'win32' && !process.env.DISPLAY;

    return NextResponse.json({ 
      success: true, 
      accounts, 
      telegramChatId,
      facebookPages,
      isHeadlessServer: isHeadless,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { action, platform, telegramBotToken, telegramChatId, sessionData } = body;

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

    if (action === 'sync_sessions') {
      if (user) {
        await syncDiskSessionsToDb(user.id);
        await restoreDbSessionsToDisk(user.id);
        return NextResponse.json({ success: true, message: 'Sessões sincronizadas com sucesso com o banco!' });
      }
      return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 });
    }

    if (action === 'import_session' && platform && sessionData) {
      if (!fs.existsSync(SESSIONS_DIR)) {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
      }

      const fileName = `${platform}_cookies.json`;
      const filePath = path.join(SESSIONS_DIR, fileName);
      const content = typeof sessionData === 'string' ? sessionData : JSON.stringify(sessionData, null, 2);
      
      fs.writeFileSync(filePath, content, 'utf-8');
      if (user) {
        await upsertUserApiKey(user.id, `social_session_${platform}_cookies`, content);
      }

      return NextResponse.json({ success: true, message: `Sessão de ${platform} importada com sucesso!` });
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

      // Remove do banco de dados também
      if (user) {
        for (const [key, fileName] of Object.entries(SESSION_MAP)) {
          if (targets.includes(fileName)) {
            try {
              await upsertUserApiKey(user.id, `social_session_${key}`, '');
            } catch (e) {}
          }
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
      // Verifica se está rodando em servidor headless sem interface gráfica
      const isHeadless = process.platform !== 'win32' && !process.env.DISPLAY;
      if (isHeadless) {
        return NextResponse.json({
          success: false,
          isRemote: true,
          error: `O servidor está em ambiente de nuvem/Docker sem interface gráfica. Como o banco de dados é compartilhado, suas contas conectadas no DarkTube local no seu computador são sincronizadas automaticamente com o servidor! Abra o DarkTube localmente com sua conta ou cole os cookies JSON abaixo.`,
        }, { status: 400 });
      }

      const authScript = path.resolve(process.cwd(), 'scripts/social-uploader/auth_manager.py');
      if (!fs.existsSync(authScript)) {
        return NextResponse.json({
          success: false,
          error: `Script de autenticação não encontrado em: ${authScript}`,
        }, { status: 500 });
      }

      const authLogFile = path.join(SESSIONS_DIR, 'auth.log');
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
      const outLog = fs.openSync(authLogFile, 'a');

      const pythonCmd = getPythonCommand();
      const child = safeSpawn(pythonCmd, [authScript, '--network', platform], {
        detached: true,
        stdio: ['ignore', outLog, outLog],
      });
      child.unref();

      return NextResponse.json({
        success: true,
        message: `Janela de login para ${platform} aberta no navegador local. Conclua o login na janela aberta.`,
      });
    }

    if (action === 'refresh_facebook_pages') {
      const getPagesScript = path.resolve(process.cwd(), 'scripts/social-uploader/get_facebook_pages.py');
      const { execSync } = require('child_process');
      const pythonCmd = getPythonCommand();
      try {
        if (fs.existsSync(getPagesScript)) {
          execSync(`"${pythonCmd}" "${getPagesScript}"`, { timeout: 35000 });
        }
      } catch (e) {
        console.warn(`[Social API] Aviso ao executar get_facebook_pages.py:`, e);
      }

      const fbPagesFile = path.join(SESSIONS_DIR, 'facebook_pages.json');
      let pages: any[] = [];
      if (fs.existsSync(fbPagesFile)) {
        try {
          const content = fs.readFileSync(fbPagesFile, 'utf-8');
          pages = JSON.parse(content);
          if (user && content) {
            await upsertUserApiKey(user.id, 'social_session_facebook_pages', content);
          }
        } catch (e) {}
      }
      return NextResponse.json({ success: true, facebookPages: pages });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
