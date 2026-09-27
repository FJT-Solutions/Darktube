// lib/logger.ts
/**
 * DarkTube Unified Logging System
 * 
 * Provides structured, beautiful, colored logging in development and clean,
 * consistent, rate-limited and sanitized logging in production/server environments.
 */

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  data?: any;
  error?: Error | unknown;
}

// ANSI Escape Codes for Terminal Styling
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Badges
  bgRed: '\x1b[41m\x1b[37m\x1b[1m',
  bgGreen: '\x1b[42m\x1b[30m\x1b[1m',
  bgYellow: '\x1b[43m\x1b[30m\x1b[1m',
  bgBlue: '\x1b[44m\x1b[37m\x1b[1m',
  bgMagenta: '\x1b[45m\x1b[37m\x1b[1m',
  bgCyan: '\x1b[46m\x1b[30m\x1b[1m',
};

// Sensitive field keys to automatically redact in logs
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'jwt',
  'secret',
  'apikey',
  'api_key',
  'key',
  'authorization',
  'cookie',
  'session',
  'gemini_api_key',
  'openai_api_key',
  'smtp_pass',
  'supabase_service_role_key',
]);

// In-memory deduplication cache: avoids flooding console with identical messages in quick succession
const dedupCache = new Map<string, { timestamp: number; count: number }>();
const DEDUP_WINDOW_MS = 3000; // 3 seconds window

function sanitizeData(obj: any, depth = 0): any {
  if (depth > 4 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.slice(0, 20).map((item) => sanitizeData(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('password') || lowerKey.includes('token')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, depth + 1);
    } else if (typeof value === 'string' && value.length > 300) {
      sanitized[key] = `${value.slice(0, 300)}... (${value.length} chars)`;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatTimestamp(): string {
  const now = new Date();
  if (process.env.NODE_ENV === 'production') {
    return now.toISOString();
  }
  // Compact local time: HH:mm:ss.ms
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 1,
  warn: 2,
  error: 3,
};

function getActiveLogLevel(): LogLevel {
  const envLevel = (process.env.LOG_LEVEL || '').toLowerCase() as LogLevel;
  if (envLevel && LEVEL_PRIORITY[envLevel] !== undefined) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  const activeLevel = getActiveLogLevel();
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[activeLevel];
}

class Logger {
  private formatBadge(level: LogLevel): string {
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev) {
      return `[${level.toUpperCase()}]`;
    }

    switch (level) {
      case 'debug':
        return `${colors.dim}[DEBUG]${colors.reset}`;
      case 'info':
        return `${colors.cyan}${colors.bold}[INFO]${colors.reset}`;
      case 'success':
        return `${colors.green}${colors.bold}[SUCCESS]${colors.reset}`;
      case 'warn':
        return `${colors.yellow}${colors.bold}[WARN]${colors.reset}`;
      case 'error':
        return `${colors.red}${colors.bold}[ERROR]${colors.reset}`;
      default:
        return `[${String(level).toUpperCase()}]`;
    }
  }

  private formatContext(context?: string): string {
    if (!context) return '';
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev) {
      return `[${context}]`;
    }
    return `${colors.magenta}${colors.bold}[${context}]${colors.reset}`;
  }

  private isDuplicate(key: string): boolean {
    const now = Date.now();
    const entry = dedupCache.get(key);
    if (!entry) {
      dedupCache.set(key, { timestamp: now, count: 1 });
      // Clean cache occasionally
      if (dedupCache.size > 200) {
        for (const [k, v] of dedupCache.entries()) {
          if (now - v.timestamp > DEDUP_WINDOW_MS * 2) {
            dedupCache.delete(k);
          }
        }
      }
      return false;
    }

    if (now - entry.timestamp < DEDUP_WINDOW_MS) {
      entry.count++;
      return true;
    }

    // Window elapsed, update entry
    dedupCache.set(key, { timestamp: now, count: 1 });
    return false;
  }

  private logMessage(level: LogLevel, message: string, options?: LogOptions | any) {
    if (!shouldLog(level)) return;

    // Normalize options
    let context = 'App';
    let data: any = undefined;
    let error: any = undefined;

    if (options && typeof options === 'object' && ('context' in options || 'data' in options || 'error' in options)) {
      context = options.context || 'App';
      data = options.data;
      error = options.error;
    } else if (options !== undefined) {
      data = options;
    }

    // Rate-limiting check for rapid identical logs
    const dedupKey = `${level}:${context}:${message}`;
    if (this.isDuplicate(dedupKey)) {
      return;
    }

    const timeStr = formatTimestamp();
    const badge = this.formatBadge(level);
    const ctx = this.formatContext(context);
    const isDev = process.env.NODE_ENV !== 'production';

    const timeBadge = isDev ? `${colors.gray}${timeStr}${colors.reset}` : timeStr;

    // Formatted line prefix
    const parts = [timeBadge, badge, ctx, message].filter(Boolean);
    const line = parts.join(' ');

    if (level === 'error') {
      console.error(line);
      if (error) {
        if (error instanceof Error) {
          console.error(isDev ? `${colors.red}${error.stack || error.message}${colors.reset}` : error.stack || error.message);
        } else {
          console.error(error);
        }
      }
      if (data) {
        console.error(sanitizeData(data));
      }
    } else if (level === 'warn') {
      console.warn(line);
      if (error) console.warn(error);
      if (data) console.warn(sanitizeData(data));
    } else {
      console.log(line);
      if (data) {
        console.log(sanitizeData(data));
      }
    }
  }

  debug(message: string, options?: LogOptions | any) {
    this.logMessage('debug', message, options);
  }

  info(message: string, options?: LogOptions | any) {
    this.logMessage('info', message, options);
  }

  success(message: string, options?: LogOptions | any) {
    this.logMessage('success', message, options);
  }

  warn(message: string, options?: LogOptions | any) {
    this.logMessage('warn', message, options);
  }

  error(message: string, errorOrOptions?: Error | LogOptions | unknown, data?: any) {
    if (errorOrOptions instanceof Error) {
      this.logMessage('error', message, { error: errorOrOptions, data });
    } else if (errorOrOptions && typeof errorOrOptions === 'object' && ('context' in errorOrOptions || 'error' in errorOrOptions)) {
      this.logMessage('error', message, errorOrOptions);
    } else {
      this.logMessage('error', message, { error: errorOrOptions, data });
    }
  }

  // Pre-configured namespace helpers
  api(message: string, data?: any) {
    this.info(message, { context: 'API', data });
  }

  auth(message: string, data?: any) {
    this.info(message, { context: 'Auth', data });
  }

  render(message: string, data?: any) {
    this.info(message, { context: 'Render', data });
  }

  scheduler(message: string, data?: any) {
    this.info(message, { context: 'Scheduler', data });
  }

  security(message: string, data?: any) {
    this.warn(message, { context: 'Security', data });
  }

  cron(message: string, data?: any) {
    this.info(message, { context: 'Cron', data });
  }
}

export const logger = new Logger();
