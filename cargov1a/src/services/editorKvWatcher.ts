import { existsShared, readSharedText, writeSharedText } from './sharedDisk';
import { loadBaseOverridesFromDisk } from './baseOverridesRuntime';
import { publishGameContentSnapshot } from './gameContentSnapshot';

type WatchedState = {
  path: string;
  lastRaw: string;
};

const watched: WatchedState[] = [
  { path: 'data/kv/cargas.mechanicsCatalog.v2.json', lastRaw: '' },
  { path: 'data/kv/cargas.editorRegistries.v1.json', lastRaw: '' },
  { path: 'data/kv/cargas.baseOverrides.v1.json', lastRaw: '' },
  { path: 'data/kv/devtool.advancedWorkbench.v2.json', lastRaw: '' },
  { path: 'data/kv/moddingtool.advancedWorkbench.v2.json', lastRaw: '' },
  { path: 'data/kv/moddingtool.characterDrafts.v2.json', lastRaw: '' },
  { path: 'data/kv/devtool.characterDrafts.v2.json', lastRaw: '' },
  { path: 'data/kv/moddingtool.cliDrafts.v2.json', lastRaw: '' },
  { path: 'data/kv/devtool.cliDrafts.v2.json', lastRaw: '' },
];

let started = false;

async function writeWatcherStatus(event: string, extra: any = {}): Promise<void> {
  await writeSharedText(
    'data/kv/game.editorKvWatcher.status.json',
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      ...extra,
    }, null, 2)
  ).catch(() => false);
}

async function readIfChanged(item: WatchedState): Promise<string | null> {
  const ok = await existsShared(item.path).catch(() => false);
  if (!ok) return null;

  const raw = await readSharedText(item.path).catch(() => '');
  if (!raw || raw === item.lastRaw) return null;

  item.lastRaw = raw;
  return raw;
}

async function handleChanged(path: string, raw: string): Promise<void> {
  console.log('[EditorKvWatcher] Cambio detectado:', path);
  await writeWatcherStatus('changed', { path });

  if (path.includes('baseOverrides') || path.includes('editorRegistries')) {
    await loadBaseOverridesFromDisk().catch(err =>
      console.warn('[EditorKvWatcher] No se pudieron recargar overrides:', err)
    );

    await publishGameContentSnapshot().catch(err =>
      console.warn('[EditorKvWatcher] No se pudo republicar snapshot:', err)
    );

    return;
  }

  if (path.includes('mechanicsCatalog')) {
    try {
      const parsed = JSON.parse(raw);
      console.log('[EditorKvWatcher] Mechanics v2 cargado:', {
        app: parsed.app,
        mechanics: Object.keys(parsed.mechanics || {}).length,
        stackModes: Object.keys(parsed.stackModes || {}).length,
      });
    } catch {
      console.warn('[EditorKvWatcher] mechanicsCatalog inválido');
    }

    await publishGameContentSnapshot().catch(err =>
      console.warn('[EditorKvWatcher] No se pudo republicar snapshot tras mechanics:', err)
    );

    return;
  }

  if (path.includes('cliDrafts') || path.includes('characterDrafts')) {
    try {
      const parsed = JSON.parse(raw);
      console.log('[EditorKvWatcher] Drafts editor cargados:', {
        path,
        app: parsed.app,
        count: parsed.drafts?.length,
        updatedAt: parsed.updatedAt,
      });
    } catch {
      console.warn('[EditorKvWatcher] drafts inválidos:', path);
    }

    return;
  }

  if (path.includes('advancedWorkbench')) {
    try {
      const parsed = JSON.parse(raw);
      console.log('[EditorKvWatcher] Workbench avanzado cargado:', {
        app: parsed.app,
        character: parsed.complexCharacter?.name,
        cards: parsed.suggestedCards?.length,
      });
    } catch {
      console.warn('[EditorKvWatcher] workbench inválido');
    }
  }
}

export function startEditorKvWatcher(): void {
  if (started) return;
  started = true;

  console.log('[EditorKvWatcher] Activo');
  writeWatcherStatus('active', { watched: watched.map(w => w.path) });

  const tick = async () => {
    for (const item of watched) {
      const raw = await readIfChanged(item);
      if (raw) await handleChanged(item.path, raw);
    }
  };

  tick().catch(err => console.warn('[EditorKvWatcher] Error inicial:', err));

  window.setInterval(() => {
    tick().catch(err => console.warn('[EditorKvWatcher] Error:', err));
  }, 2000);
}
