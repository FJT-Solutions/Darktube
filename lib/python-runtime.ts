import fs from 'fs';
import { spawn, SpawnOptions, ChildProcess } from 'child_process';

/**
 * Retorna o comando python adequado para o ambiente atual (Windows, Linux, Docker, Mac).
 */
export function getPythonCommand(): string {
  if (process.env.PYTHON_CMD) {
    return process.env.PYTHON_CMD;
  }
  if (process.platform === 'win32') {
    return 'python';
  }
  // No Linux / Docker (Debian/Ubuntu/Alpine)
  if (fs.existsSync('/usr/bin/python3')) {
    return '/usr/bin/python3';
  }
  if (fs.existsSync('/usr/bin/python')) {
    return '/usr/bin/python';
  }
  return 'python3';
}

/**
 * Spawns child process de forma segura, garantindo que erros de spawn (ENOENT, etc.)
 * sejam capturados sem causar uncaughtException no Node.js.
 */
export function safeSpawn(command: string, args: string[], options: SpawnOptions = {}): ChildProcess {
  const child = spawn(command, args, options);
  
  child.on('error', (err) => {
    console.error(`[Process Runtime] Erro ao disparar processo "${command}":`, err.message);
  });

  return child;
}
