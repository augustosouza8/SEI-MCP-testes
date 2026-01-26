import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger.js';

function parseLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const idx = trimmed.indexOf('=');
  if (idx === -1) return null;
  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if (!key) return null;

  // Remove surrounding quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

export function loadDotEnv(cwd: string = process.cwd()): void {
  try {
    const filePath = path.join(cwd, '.env');
    if (!fs.existsSync(filePath)) return;

    const contents = fs.readFileSync(filePath, 'utf8');
    let loaded = 0;

    for (const line of contents.split(/\r?\n/)) {
      const parsed = parseLine(line);
      if (!parsed) continue;
      const { key, value } = parsed;
      if (process.env[key] !== undefined) continue; // don't override
      process.env[key] = value;
      loaded++;
    }

    if (loaded > 0) logger.info(`Loaded ${loaded} env var(s) from .env`);
  } catch (err) {
    logger.warn('Failed to load .env', { err });
  }
}

