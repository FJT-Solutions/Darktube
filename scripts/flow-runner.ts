/**
 * DarkTube Flow Runner - Motor local autônomo baseado no flow-mcp (Playwright + CDP).
 * 
 * Roda diretamente em Node.js controlando um Chrome dedicado, sem precisar de extensão
 * de navegador, sem risco de ser bloqueado por extensões de terceiros e sem suspensão
 * de abas em segundo plano.
 * 
 * Uso:
 *   1. Fazer login uma única vez no Google Flow:
 *      npx tsx scripts/flow-runner.ts --login
 * 
 *   2. Rodar o trabalhador em segundo plano:
 *      npx tsx scripts/flow-runner.ts --run --token SEU_TOKEN_DO_DARKTUBE
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';

const FLOW_URL = 'https://flow.google.com/?hl=en';
const HOME_DIR = join(homedir(), '.darktube');
const PROFILE_DIR = join(HOME_DIR, 'flow-chrome-profile');
const DOWNLOAD_DIR = join(HOME_DIR, 'flow-downloads');
const CDP_PORT = 9333;
const CDP_URL = `http://127.0.0.1:${CDP_PORT}`;

const CHROME_PATHS = [
  process.env.FLOW_CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : undefined,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter((p): p is string => Boolean(p));

function findChrome(): string {
  const found = CHROME_PATHS.find((p) => existsSync(p));
  if (!found) throw new Error('Google Chrome não foi encontrado. Defina a variável FLOW_CHROME_PATH.');
  return found;
}

async function isCdpRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function launchDedicatedChrome(): Promise<void> {
  const chromePath = findChrome();
  mkdirSync(PROFILE_DIR, { recursive: true });
  mkdirSync(DOWNLOAD_DIR, { recursive: true });

  console.log(`[Runner] Iniciando Google Chrome dedicado na porta CDP ${CDP_PORT}...`);
  const child = spawn(
    chromePath,
    [
      `--user-data-dir=${PROFILE_DIR}`,
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      FLOW_URL,
    ],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();

  for (let i = 0; i < 40; i++) {
    if (await isCdpRunning()) {
      console.log('[Runner] Chrome conectado com sucesso na porta CDP!');
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`O Chrome iniciou, mas a porta CDP ${CDP_PORT} não respondeu a tempo.`);
}

async function getBrowser(): Promise<Browser> {
  if (!(await isCdpRunning())) {
    await launchDedicatedChrome();
  }
  return await chromium.connectOverCDP(CDP_URL);
}

async function getFlowPage(browser: Browser): Promise<Page> {
  const context = browser.contexts()[0];
  if (!context) throw new Error('Nenhum contexto encontrado no Chrome dedicado.');
  
  const existing = context.pages().find((p) => /flow\.google\.com/.test(p.url()));
  if (existing) return existing;

  const page = await context.newPage();
  await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded' });
  return page;
}

// Digitação humanizada (8ms por caractere) para evitar flagging de texto colado instantaneamente
async function humanType(page: Page, text: string) {
  const editor = page.locator('.ProseMirror, textarea, [contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  // Substitui quebras de linha por espaços para não submeter prematuramente
  const singleLine = text.replace(/\s*\n+\s*/g, ' ').trim();
  await page.keyboard.type(singleLine, { delay: 8 });
  await page.waitForTimeout(400);
}

async function handleLogin() {
  console.log('\n=== Modo Login do Google Flow ===');
  console.log('Uma janela dedicada do Google Chrome foi aberta.');
  console.log('1. Faça login na sua conta Google normalmente.');
  console.log('2. Abra um projeto de teste no Flow (para garantir que a interface carregue).');
  console.log('3. Após estar conectado no Flow, você pode fechar este script (Ctrl+C).\n');
  await launchDedicatedChrome();
}

async function handleWorker(baseUrl: string, token: string) {
  console.log(`\n=== DarkTube Flow Runner Ativo ===`);
  console.log(`Servidor: ${baseUrl}`);
  console.log(`Pressione Ctrl+C para encerrar.\n`);

  const browser = await getBrowser();
  const page = await getFlowPage(browser);

  while (true) {
    try {
      // 1. Claim do próximo job
      const claimRes = await fetch(`${baseUrl}/api/flow/agent/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const claim = await claimRes.json();

      if (!claim.job) {
        process.stdout.write('.');
        await new Promise((r) => setTimeout(r, 6000));
        continue;
      }

      const job = claim.job;
      console.log(`\n[Runner] Job recebido: ${job.kind} (Take ${job.take_index ?? '-'}) - ID: ${job.id}`);

      // 2. Garantir que o projeto está aberto
      await page.waitForTimeout(1000);
      const editor = page.locator('.ProseMirror').first();
      if (!(await editor.isVisible().catch(() => false))) {
        console.warn('[Runner] Caixa de prompt não visível. Abra um projeto no Flow.');
        await new Promise((r) => setTimeout(r, 10000));
        continue;
      }

      // 3. Digitar o prompt
      console.log(`[Runner] Digitando prompt... (${job.prompt.slice(0, 80)}...)`);
      await humanType(page, job.prompt);

      // 4. Iniciar geração
      const generateBtn = page.getByRole('button', { name: /Start generation|Generate/i }).first();
      await generateBtn.waitFor({ state: 'visible', timeout: 5000 });
      await generateBtn.click();
      console.log('[Runner] Geração iniciada no Flow. Aguardando resultado...');

      // 5. Aguardar conclusão do tile
      let finished = false;
      let attempts = 0;
      while (!finished && attempts < 90) {
        await page.waitForTimeout(4000);
        attempts++;
        const progress = await page.evaluate(() => {
          const tiles = [...document.querySelectorAll('flow-grid-tile-container')];
          const first = tiles[0];
          return first ? (first as HTMLElement).innerText : '';
        });

        if (progress.includes('Failed')) {
          throw new Error('O Google Flow recusou a geração do clipe.');
        }

        if (progress.includes('%')) {
          process.stdout.write(` ${progress.match(/\d+%/)?.[0] || '...'}`);
        } else if (attempts > 5) {
          finished = true;
          console.log('\n[Runner] Clipe finalizado com sucesso no Flow!');
          // Notifica o DarkTube que o vídeo terminou no Flow e está sendo coletado
          try {
            await fetch(`${baseUrl}/api/flow/agent/jobs/${job.id}/collecting`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
          } catch (_) {}
        }
      }

      // 6. Download do resultado (espera o botão More Options -> Download)
      const firstTile = page.locator('flow-grid-tile-container').first();
      await firstTile.hover();
      const moreBtn = firstTile.getByRole('button', { name: /More options/i });
      await moreBtn.click();
      
      const downloadItem = page.getByRole('menuitem', { name: /Download/i });
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      await downloadItem.click();
      const download = await downloadPromise;

      const tempFile = join(tmpdir(), `flow_${job.id}_${download.suggestedFilename()}`);
      await download.saveAs(tempFile);
      console.log(`[Runner] Mídia salva em: ${tempFile}`);

      // 7. Envio para o DarkTube
      const fileBuffer = readFileSync(tempFile);
      const mime = tempFile.endsWith('.mp4') ? 'video/mp4' : 'image/png';
      const fd = new FormData();
      fd.append('file', new Blob([fileBuffer], { type: mime }), download.suggestedFilename());

      const upRes = await fetch(`${baseUrl}/api/flow/agent/jobs/${job.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (upRes.ok) {
        console.log(`[Runner] Job ${job.id} concluído com sucesso e sincronizado no DarkTube!`);
      } else {
        console.error(`[Runner] Erro ao sincronizar conclusão: HTTP ${upRes.status}`);
      }

    } catch (err: any) {
      console.error('\n[Runner] Erro durante o processamento do job:', err?.message || err);
      await new Promise((r) => setTimeout(r, 8000));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isLogin = args.includes('--login');
  const isRun = args.includes('--run');

  const tokenIdx = args.indexOf('--token');
  const token = tokenIdx >= 0 ? args[tokenIdx + 1] : process.env.DARKTUBE_TOKEN || '';
  const urlIdx = args.indexOf('--url');
  const baseUrl = (urlIdx >= 0 ? args[urlIdx + 1] : process.env.DARKTUBE_API_URL || 'https://darktube.fjt-solutions.com').replace(/\/+$/, '');

  if (isLogin) {
    await handleLogin();
  } else if (isRun) {
    if (!token) {
      console.error('Erro: Token do DarkTube não fornecido. Use --token <seu_token> ou defina DARKTUBE_TOKEN.');
      process.exit(1);
    }
    await handleWorker(baseUrl, token);
  } else {
    console.log(`
DarkTube Flow Runner (Playwright + Chrome CDP)
---------------------------------------------
Comandos:
  npx tsx scripts/flow-runner.ts --login
    Abre o Chrome dedicado para autenticar na sua conta Google.

  npx tsx scripts/flow-runner.ts --run --token <TOKEN>
    Inicia o processador automático de jobs em background.
`);
  }
}

main().catch((err) => {
  console.error('[Runner Fatal Error]:', err);
});
