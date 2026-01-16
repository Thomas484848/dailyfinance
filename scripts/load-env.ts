import { readFileSync, existsSync } from 'fs';
import path from 'path';

export function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (!key) continue;

    value = value.replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  }
}
