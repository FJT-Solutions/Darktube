import path from 'path';
import fs from 'fs';
import { ChildProcess } from 'child_process';
import { getPythonCommand, safeSpawn } from './python-runtime';
import { upsertUserApiKey } from './database';
import { logger } from './logger';

import { saveSocialAccount } from './social-accounts';

export interface CloudAuthSessionState {
  sessionId: string;
  userId?: string;
  platform: string;
  accountId?: string;
  accountName?: string;
  status:
    | 'idle'
    | 'starting'
    | 'navigating'
    | 'streaming'
    | 'success'
    | 'error'
    | 'cancelled';
  message: string;
  url?: string;
  title?: string;
  screenshot?: string;
  cookiesCount?: number;
  lastUpdated: number;
  isPopup?: boolean;
  pageCount?: number;
  pages?: Array<{ index: number; title: string; url: string; isActive: boolean }>;
}

interface ActiveSessionRecord {
  state: CloudAuthSessionState;
  child: ChildProcess;
  timeoutId: NodeJS.Timeout;
}

const activeSessions = new Map<string, ActiveSessionRecord>();

const SESSIONS_DIR = path.resolve(process.cwd(), 'scripts/social-uploader/sessions');

export class CloudAuthManager {
  /**
   * Inicia o Navegador Visual Remoto para a plataforma indicada
   */
  static startSession(params: {
    sessionId: string;
    userId?: string;
    platform: string;
    accountId?: string;
    accountName?: string;
  }): CloudAuthSessionState {
    const { sessionId, userId, platform, accountId = 'default', accountName = '' } = params;

    // Cancela sessão anterior com mesmo ID se existir
    this.cancelSession(sessionId);

    const scriptPath = path.resolve(process.cwd(), 'scripts/social-uploader/cloud_auth.py');
    const pythonCmd = getPythonCommand();

    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }

    const state: CloudAuthSessionState = {
      sessionId,
      userId,
      platform,
      accountId,
      accountName,
      status: 'starting',
      message: `Iniciando Navegador Remoto para ${accountName || platform.toUpperCase()}...`,
      lastUpdated: Date.now(),
    };

    const scriptDir = path.resolve(process.cwd(), 'scripts/social-uploader');
    const spawnArgs = ['-u', scriptPath, '--platform', platform, '--account-id', accountId];
    if (accountName) {
      spawnArgs.push('--account-name', accountName);
    }

    const child = safeSpawn(pythonCmd, spawnArgs, {
      cwd: scriptDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONPATH: `${scriptDir}${path.delimiter}${process.env.PYTHONPATH || ''}`,
      },
    });

    // Timeout de segurança: 10 minutos para o usuário interagir à vontade
    const timeoutId = setTimeout(() => {
      logger.info(`[RemoteBrowser] Sessão ${sessionId} expirou por inatividade.`);
      this.cancelSession(sessionId);
    }, 10 * 60 * 1000);

    const record: ActiveSessionRecord = { state, child, timeoutId };
    activeSessions.set(sessionId, record);

    // Envia o comando de inicialização
    child.stdin?.write(JSON.stringify({ command: 'start' }) + '\n');

    // Lê os eventos do Python via stdout
    let buffer = '';
    child.stdout?.on('data', async (chunk: Buffer) => {
      buffer += chunk.toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('__EVENT__')) {
          try {
            const rawJson = trimmed.replace('__EVENT__', '');
            const event = JSON.parse(rawJson);
            await this.handlePythonEvent(sessionId, event);
          } catch (e: any) {
            logger.warn(`[RemoteBrowser] Erro ao parsear evento: ${e?.message}`);
          }
        }
      }
    });

    child.stderr?.on('data', (errChunk: Buffer) => {
      const errText = errChunk.toString('utf-8').trim();
      if (errText) {
        logger.warn(`[RemoteBrowser ${platform}] stderr: ${errText.slice(0, 160)}`);
      }
    });

    child.on('exit', (code, signal) => {
      logger.info(`[RemoteBrowser] Processo finalizado (code: ${code}) para sessão ${sessionId}`);
      const current = activeSessions.get(sessionId);
      if (current && current.state.status !== 'success' && current.state.status !== 'error') {
        current.state.status = 'error';
        current.state.message = 'Navegador remoto encerrado.';
        current.state.lastUpdated = Date.now();
      }
    });

    return state;
  }

  /**
   * Processa os eventos vindos do script Python
   */
  private static async handlePythonEvent(sessionId: string, event: any) {
    const record = activeSessions.get(sessionId);
    if (!record) return;

    const { state, child } = record;
    state.status = event.status || state.status;
    state.message = event.message || state.message;
    state.lastUpdated = Date.now();

    if (event.url !== undefined) state.url = event.url;
    if (event.title !== undefined) state.title = event.title;
    if (event.screenshot !== undefined) state.screenshot = event.screenshot;
    if (event.cookiesCount !== undefined) state.cookiesCount = event.cookiesCount;
    if (event.isPopup !== undefined) state.isPopup = event.isPopup;
    if (event.pageCount !== undefined) state.pageCount = event.pageCount;
    if (event.pages !== undefined) state.pages = event.pages;

    // Se o login foi concluído com sucesso
    if (event.status === 'success') {
      const { cookies } = event;
      if (cookies && state.userId) {
        try {
          const accId = state.accountId || event.accountId || 'default';
          const filePrefix = accId === 'default' ? state.platform : `${state.platform}_${accId}`;
          const cookiesStr = JSON.stringify(cookies);

          await upsertUserApiKey(state.userId, `social_session_${filePrefix}_cookies`, cookiesStr);
          await upsertUserApiKey(state.userId, `social_session_${filePrefix}_expired`, '');

          // Se for default, também mantém a chave legada
          if (accId === 'default') {
            await upsertUserApiKey(state.userId, `social_session_${state.platform}_cookies`, cookiesStr);
            await upsertUserApiKey(state.userId, `social_session_${state.platform}_expired`, '');
          }

          // Registra ou atualiza no gerenciador de multi-contas
          await saveSocialAccount(state.userId, {
            id: accId,
            platform: state.platform as any,
            name: event.accountName || state.accountName || `${state.platform.toUpperCase()} (${accId})`,
            username: event.username,
            connected: true,
            expired: false,
          });

          logger.info(`[RemoteBrowser] Sucesso! Conta ${accId} de ${state.platform} persistida no banco PostgreSQL.`);

          // Se for Facebook, tenta sincronizar as páginas gerenciadas
          if (state.platform === 'facebook') {
            const pagesFile = path.join(SESSIONS_DIR, 'facebook_pages.json');
            if (fs.existsSync(pagesFile)) {
              try {
                const pagesContent = fs.readFileSync(pagesFile, 'utf-8');
                if (pagesContent) {
                  await upsertUserApiKey(state.userId, 'social_session_facebook_pages', pagesContent);
                }
              } catch (_) {}
            }
          }
        } catch (dbErr: any) {
          logger.error(`[RemoteBrowser] Erro ao salvar cookies: ${dbErr?.message}`);
        }
      }

      setTimeout(() => {
        try {
          child.kill();
        } catch (_) {}
      }, 2000);
    }
  }

  /**
   * Envia interação do usuário (clique, digitação, tecla, scroll, reload, preenchimento, abas) para o navegador
   */
  static interact(
    sessionId: string,
    action: {
      type: 'click' | 'type' | 'press' | 'scroll' | 'reload' | 'fill_field' | 'fill_and_submit' | 'switch_tab' | 'close_tab';
      x?: number;
      y?: number;
      text?: string;
      key?: string;
      deltaY?: number;
      field?: 'email' | 'password' | 'submit';
      value?: string;
      email?: string;
      password?: string;
      index?: number;
    }
  ): boolean {
    const record = activeSessions.get(sessionId);
    if (!record || !record.child.stdin?.writable) return false;

    let payload: any = { command: action.type };

    if (action.type === 'click') {
      payload = { command: 'click', x: action.x, y: action.y };
    } else if (action.type === 'type') {
      payload = { command: 'type', text: action.text };
    } else if (action.type === 'press') {
      payload = { command: 'press', key: action.key };
    } else if (action.type === 'scroll') {
      payload = { command: 'scroll', deltaY: action.deltaY };
    } else if (action.type === 'reload') {
      payload = { command: 'reload' };
    } else if (action.type === 'fill_field') {
      payload = { command: 'fill_field', field: action.field, value: action.value };
    } else if (action.type === 'fill_and_submit') {
      payload = { command: 'fill_and_submit', email: action.email, password: action.password };
    } else if (action.type === 'switch_tab') {
      payload = { command: 'switch_tab', index: action.index };
    } else if (action.type === 'close_tab') {
      payload = { command: 'close_tab', index: action.index };
    }

    record.child.stdin.write(JSON.stringify(payload) + '\n');
    return true;
  }

  /**
   * Retorna o estado atual da sessão
   */
  static getSession(sessionId: string): CloudAuthSessionState | null {
    const record = activeSessions.get(sessionId);
    if (!record) return null;
    return record.state;
  }

  /**
   * Cancela uma sessão ativa
   */
  static cancelSession(sessionId: string): boolean {
    const record = activeSessions.get(sessionId);
    if (!record) return false;

    clearTimeout(record.timeoutId);
    try {
      if (record.child.stdin?.writable) {
        record.child.stdin.write(JSON.stringify({ command: 'cancel' }) + '\n');
      }
      setTimeout(() => {
        try {
          record.child.kill();
        } catch (_) {}
      }, 500);
    } catch (_) {}

    record.state.status = 'cancelled';
    record.state.message = 'Navegador encerrado.';
    activeSessions.delete(sessionId);
    return true;
  }
}
