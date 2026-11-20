import fs from 'fs';
import os from 'os';
import path from 'path';

export interface FindBrowserOptions {
  /** Prioriza Chrome completo (ideal para WebGL/SwiftShader 3D) em vez de headless-shell. */
  preferFullChrome?: boolean;
  /** Caminho padrão retornado por `chromium.executablePath()` do playwright-core. */
  defaultExecutablePath?: string;
}

function collectMsPlaywrightExecutables(rootDir: string, preferFullChrome: boolean): string[] {
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(rootDir);
  } catch {
    return [];
  }

  const dirs = entries
    .filter((name) => /^chromium(?:_headless_shell)?-\d+/i.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/(\d+)/)?.[1] || 0);
      const nb = Number(b.match(/(\d+)/)?.[1] || 0);
      if (nb !== na) return nb - na;
      const aFull = !a.toLowerCase().includes('headless');
      const bFull = !b.toLowerCase().includes('headless');
      if (preferFullChrome && aFull !== bFull) return bFull ? 1 : -1;
      return 0;
    });

  const found: string[] = [];
  for (const dir of dirs) {
    const base = path.join(rootDir, dir);
    const relCandidates = process.platform === 'win32'
      ? [
          'chrome-win64/chrome.exe',
          'chrome-win/chrome.exe',
          'chrome-headless-shell-win64/chrome-headless-shell.exe',
        ]
      : [
          'chrome-linux64/chrome',
          'chrome-linux/chrome',
          'chrome-headless-shell-linux64/chrome-headless-shell',
          'chrome-headless-shell-linux/chrome-headless-shell',
        ];
    for (const rel of relCandidates) {
      const full = path.join(base, rel);
      try {
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
          found.push(full);
        }
      } catch {}
    }
  }
  return found;
}

/**
 * Localiza um executável Chromium/Chrome/Edge funcional no Windows ou Linux (Docker `/ms-playwright`),
 * evitando falha quando a revisão do pip Playwright diverge da revisão do `playwright-core` Node.
 */
export function findBrowserExecutable(opts: FindBrowserOptions = {}): string | undefined {
  const envOverrides = [
    process.env.CHROME_EXECUTABLE_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  ].filter(Boolean) as string[];
  for (const p of envOverrides) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }

  // Se o executável padrão exato do playwright-core já existir, deixa o Playwright usá-lo nativamente.
  if (opts.defaultExecutablePath) {
    try {
      if (fs.existsSync(opts.defaultExecutablePath)) return undefined;
    } catch {}
  }

  const msRoots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    '/ms-playwright',
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA || '', 'ms-playwright') : '',
  ].filter(Boolean) as string[];

  for (const root of msRoots) {
    const hits = collectMsPlaywrightExecutables(root, Boolean(opts.preferFullChrome));
    if (hits.length > 0) return hits[0];
  }

  const systemCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ];
  return systemCandidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
}
