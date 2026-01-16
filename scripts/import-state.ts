import { promises as fs } from 'fs';
import path from 'path';

export interface ImportState {
  cursor: number;
  total: number;
  updatedAt: string;
}

const STATE_PATH = path.join(process.cwd(), 'scripts', 'import-state.json');

export async function loadImportState(): Promise<ImportState | null> {
  try {
    const raw = await fs.readFile(STATE_PATH, 'utf8');
    return JSON.parse(raw) as ImportState;
  } catch (error) {
    return null;
  }
}

export async function saveImportState(state: ImportState): Promise<void> {
  const payload = JSON.stringify(state, null, 2);
  await fs.writeFile(STATE_PATH, payload, 'utf8');
}

export async function clearImportState(): Promise<void> {
  try {
    await fs.unlink(STATE_PATH);
  } catch (error) {
    // Ignore if missing
  }
}
