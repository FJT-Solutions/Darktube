import path from 'path';
import fs from 'fs';
import { ChildProcess } from 'child_process';
import { getPythonCommand, safeSpawn } from './python-runtime';
import { upsertUserApiKey } from './database';
import { logger } from './logger';

export interface CloudAuthSessionState {
  sessionId: string;
  userId?: string;
  platform: string;
  mode: 'credentials' | 'qr_code';
  status:
    | 'idle'
    | 'starting'
    | 'navigating'
    | 'logging_in'
    | 'waiting'
    | 'needs_2fa'
    | 'submitting_code'
    | 'device_prompt'
    | 'waiting_device_approval'
    | 'qr_code'
    | 'qr_code_update'
    | 'captcha_puzzle'
    | 'success'
    | 'error'
    | 'cancelled';
  message: string;
  promptNumber?: string;
  screenshot?: string;
  qrImage?: string;
  cookiesCount?: number;
  lastUpdated: number;
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
   * Inicia uma nova sessão de autenticação na nuvem para uma plataforma
   */
  static startSession(params: {
    sessionId: string;
    userId?: string;
    platform: string;
    mode?: 'credentials' | 'qr_code';
    username?: string;
    password?: string;
  }): CloudAuthSessionState {
    const { sessionId, userId, platform, mode = 'credentials', username = '', password = '' } = params;

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
      mode,
      status: 'starting',
      message: `Iniciando autenticação em nuvem para ${platform.toUpperCase()}...`,
      lastUpdated: Date.now(),
    };

    const scriptDir = path.resolve(process.cwd(), 'scripts/social-uploader');
    const child = safeSpawn(pythonCmd, ['-u', scriptPath, '--platform', platform, '--mode', mode], {
      cwd: scriptDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONPATH: `${scriptDir}${path.delimiter}${process.env.PYTHONPATH || ''}`,
      },
    });

    // Timeout de segurança: 5 minutos
    const timeoutId = setTimeout(() => {
      logger.info(`[CloudAuth] Sessão ${sessionId} expirou por inatividade.`);
      this.cancelSession(sessionId);
    }, 5 * 60 * 1000);

    const record: ActiveSessionRecord = { state, child, timeoutId };
    activeSessions.set(sessionId, record);

    // Envia o comando inicial para o script Python via stdin
    const startPayload = JSON.stringify({
      command: 'start',
      username,
      password,
    });
    child.stdin?.write(startPayload + '\n');

    // Lê os eventos emitidos pelo Python via stdout
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
            logger.warn(`[CloudAuth] Erro ao parsear evento: ${e?.message} | Linha: ${trimmed.slice(0, 80)}`);
          }
        }
      }
    });

    child.stderr?.on('data', (errChunk: Buffer) => {
      const errText = errChunk.toString('utf-8').trim();
      if (errText) {
        logger.warn(`[CloudAuth ${platform}] stderr: ${errText.slice(0, 200)}`);
      }
    });

    child.on('exit', (code, signal) => {
      logger.info(`[CloudAuth] Processo Python finalizado (code: ${code}, signal: ${signal}) para sessão ${sessionId}`);
      const current = activeSessions.get(sessionId);
      if (current && current.state.status !== 'success' && current.state.status !== 'error') {
        current.state.status = 'error';
        current.state.message = current.state.message || 'Processo encerrado antes de concluir a autenticação.';
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

    if (event.promptNumber !== undefined) state.promptNumber = event.promptNumber;
    if (event.screenshot !== undefined) state.screenshot = event.screenshot;
    if (event.qrImage !== undefined) state.qrImage = event.qrImage;
    if (event.cookiesCount !== undefined) state.cookiesCount = event.cookiesCount;

    // Se concluiu com sucesso, salva cookies no banco de dados para persistência total
    if (event.status === 'success') {
      const { cookies } = event;
      if (cookies && state.userId) {
        try {
          const cookiesStr = JSON.stringify(cookies);
          await upsertUserApiKey(state.userId, `social_session_${state.platform}_cookies`, cookiesStr);
          await upsertUserApiKey(state.userId, `social_session_${state.platform}_expired`, '');
          logger.info(`[CloudAuth] Sessão de ${state.platform} salva no banco de dados para usuário ${state.userId}!`);

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
          logger.error(`[CloudAuth] Erro ao persistir cookies no banco: ${dbErr?.message}`);
        }
      }

      // Encerra processo filho com delay de 2s para limpeza graciosa
      setTimeout(() => {
        try {
          child.kill();
        } catch (_) {}
      }, 2000);
    }
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
   * Submete código 2FA digitado pelo usuário
   */
  static submit2FACode(sessionId: string, code: string): boolean {
    const record = activeSessions.get(sessionId);
    if (!record || !record.child.stdin?.writable) return false;

    record.state.status = 'submitting_code';
    record.state.message = 'Verificando código 2FA...';
    record.state.lastUpdated = Date.now();

    const payload = JSON.stringify({
      command: 'submit_2fa',
      code: code.trim(),
    });
    record.child.stdin.write(payload + '\n');
    return true;
  }

  /**
   * Cancela uma sessão ativa e limpa os recursos
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
    record.state.message = 'Sessão cancelada.';
    activeSessions.delete(sessionId);
    return true;
  }
}
