/**
 * lib/social-accounts.ts
 * Gerenciamento centralizado de Múltiplas Contas para todas as Redes Sociais no DarkTube.
 */

import fs from 'fs';
import path from 'path';
import { getUserApiKey, upsertUserApiKey } from './database';
import { logger } from './logger';

export interface SocialAccount {
  id: string; // e.g. "default", "acc_1740000000_abc"
  platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'pinterest' | 'kwai' | 'threads' | 'telegram';
  name: string; // Ex: "@cortesmania", "Canal de Curiosidades", "Página Principal"
  username?: string;
  connected: boolean;
  expired?: boolean;
  isDefault?: boolean;
  createdAt?: string;
  details?: string;
  extra?: any; // Ex: facebookPages, channelId, etc.
}

const SESSIONS_DIR = path.resolve(process.cwd(), 'scripts/social-uploader/sessions');

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook Reels',
  instagram: 'Instagram Reels',
  tiktok: 'TikTok',
  youtube: 'YouTube Shorts',
  pinterest: 'Pinterest',
  kwai: 'Kwai',
  threads: 'Threads',
  telegram: 'Telegram',
};

/**
 * Retorna todas as contas registradas para o usuário.
 * Mantém 100% de compatibilidade retroativa com contas já conectadas.
 */
export async function getSocialAccounts(userId?: string): Promise<SocialAccount[]> {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  let registeredAccounts: SocialAccount[] = [];

  // 1. Tenta carregar registro do banco PostgreSQL
  if (userId) {
    try {
      const raw = await getUserApiKey(userId, 'social_accounts_registry');
      if (raw) {
        registeredAccounts = JSON.parse(raw);
      }
    } catch (e: any) {
      logger.warn(`[SocialAccounts] Erro ao carregar registry: ${e?.message}`);
    }
  }

  // 2. Garante que as contas "default" existentes no disco/banco apareçam automaticamente
  const platforms = ['facebook', 'instagram', 'tiktok', 'youtube', 'pinterest', 'kwai', 'threads'];
  const result: SocialAccount[] = [...registeredAccounts];

  for (const plat of platforms) {
    const hasDefaultInList = result.some((a) => a.platform === plat && a.id === 'default');

    const defaultCookieFile = path.join(SESSIONS_DIR, `${plat}_cookies.json`);
    const expiredFile = path.join(SESSIONS_DIR, `${plat}_expired.json`);
    const isFileOnDisk = fs.existsSync(defaultCookieFile);
    const isExpiredOnDisk = fs.existsSync(expiredFile);

    let isDbPresent = false;
    if (userId) {
      try {
        const dbCookies = await getUserApiKey(userId, `social_session_${plat}_cookies`);
        if (dbCookies && dbCookies.length > 20) isDbPresent = true;
      } catch (_) {}
    }

    const isConnected = isFileOnDisk || isDbPresent;

    if (!hasDefaultInList) {
      if (isConnected) {
        let details = undefined;
        let extra = undefined;

        // Se for Facebook, tenta carregar páginas
        if (plat === 'facebook') {
          const pagesFile = path.join(SESSIONS_DIR, 'facebook_pages.json');
          if (fs.existsSync(pagesFile)) {
            try {
              const pages = JSON.parse(fs.readFileSync(pagesFile, 'utf-8'));
              extra = { pages };
              details = `${pages.length} páginas detectadas`;
            } catch (_) {}
          }
        }

        result.unshift({
          id: 'default',
          platform: plat as any,
          name: `${PLATFORM_LABELS[plat] || plat} (Principal)`,
          connected: true,
          expired: isExpiredOnDisk,
          isDefault: true,
          createdAt: new Date().toISOString(),
          details,
          extra,
        });
      }
    } else {
      // Atualiza estado de conexão da default
      const defaultAcc = result.find((a) => a.platform === plat && a.id === 'default')!;
      defaultAcc.connected = isConnected;
      defaultAcc.expired = isExpiredOnDisk;
    }
  }

  // Verifica estado de conexão das contas adicionais no disco/banco
  for (const acc of result) {
    if (acc.id !== 'default') {
      const accCookieFile = path.join(SESSIONS_DIR, `${acc.platform}_${acc.id}_cookies.json`);
      const accExpiredFile = path.join(SESSIONS_DIR, `${acc.platform}_${acc.id}_expired.json`);
      let connected = fs.existsSync(accCookieFile);
      if (!connected && userId) {
        try {
          const dbCookies = await getUserApiKey(userId, `social_session_${acc.platform}_${acc.id}_cookies`);
          if (dbCookies && dbCookies.length > 20) connected = true;
        } catch (_) {}
      }
      acc.connected = connected;
      acc.expired = fs.existsSync(accExpiredFile);
    }
  }

  return result;
}

/**
 * Salva ou atualiza uma conta no registro multi-contas
 */
export async function saveSocialAccount(userId: string, accountData: Partial<SocialAccount> & { id: string; platform: any }): Promise<SocialAccount> {
  const accounts = await getSocialAccounts(userId);
  const existingIdx = accounts.findIndex((a) => a.platform === accountData.platform && a.id === accountData.id);

  let updatedAccount: SocialAccount;

  if (existingIdx >= 0) {
    updatedAccount = {
      ...accounts[existingIdx],
      ...accountData,
    };
    accounts[existingIdx] = updatedAccount;
  } else {
    updatedAccount = {
      id: accountData.id,
      platform: accountData.platform,
      name: accountData.name || `${PLATFORM_LABELS[accountData.platform] || accountData.platform} #${accounts.filter((a) => a.platform === accountData.platform).length + 1}`,
      username: accountData.username,
      connected: accountData.connected ?? true,
      expired: false,
      isDefault: accounts.filter((a) => a.platform === accountData.platform).length === 0,
      createdAt: new Date().toISOString(),
      details: accountData.details,
      extra: accountData.extra,
    };
    accounts.push(updatedAccount);
  }

  // Persiste no banco de dados
  await upsertUserApiKey(userId, 'social_accounts_registry', JSON.stringify(accounts));
  return updatedAccount;
}

/**
 * Remove uma conta específica
 */
export async function deleteSocialAccount(userId: string, platform: string, accountId: string): Promise<boolean> {
  let accounts = await getSocialAccounts(userId);
  accounts = accounts.filter((a) => !(a.platform === platform && a.id === accountId));

  // Limpa arquivos locais
  const filePrefix = accountId === 'default' ? `${platform}` : `${platform}_${accountId}`;
  const cookieFile = path.join(SESSIONS_DIR, `${filePrefix}_cookies.json`);
  const expiredFile = path.join(SESSIONS_DIR, `${filePrefix}_expired.json`);

  try {
    if (fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);
    if (fs.existsSync(expiredFile)) fs.unlinkSync(expiredFile);
  } catch (_) {}

  // Limpa no PostgreSQL
  try {
    await upsertUserApiKey(userId, `social_session_${filePrefix}_cookies`, '');
    await upsertUserApiKey(userId, `social_session_${filePrefix}_expired`, '');
    await upsertUserApiKey(userId, 'social_accounts_registry', JSON.stringify(accounts));
  } catch (err: any) {
    logger.error(`[SocialAccounts] Erro ao deletar conta no DB: ${err?.message}`);
  }

  return true;
}

/**
 * Restaura os cookies de uma conta específica do banco para o disco
 */
export async function restoreAccountCookiesToDisk(userId: string, platform: string, accountId: string): Promise<string | null> {
  const filePrefix = accountId === 'default' ? `${platform}` : `${platform}_${accountId}`;
  const targetFile = path.join(SESSIONS_DIR, `${filePrefix}_cookies.json`);

  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  try {
    const dbCookies = await getUserApiKey(userId, `social_session_${filePrefix}_cookies`);
    if (dbCookies && dbCookies.length > 20) {
      fs.writeFileSync(targetFile, dbCookies, 'utf-8');
      return targetFile;
    }
  } catch (_) {}

  if (fs.existsSync(targetFile)) {
    return targetFile;
  }

  return null;
}
