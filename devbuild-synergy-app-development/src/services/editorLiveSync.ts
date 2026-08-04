import { writeSharedText } from './sharedDisk';
import { exportAllRegistries } from '../data/registries';
import { MECHANIC_EFFECTS, STACK_MODE_CATALOG, ADVANCED_CARD_TEMPLATES, CHARACTER_PASSIVE_TEMPLATES, makeComplexCharacterTemplate } from '../data/mechanicsCatalog';

const APP_ID = 'devtool';

async function notifyGame(type: string, payload: any): Promise<void> {
  const msg = {
    id: APP_ID + '_' + type + '_' + Date.now(),
    type,
    from: APP_ID,
    to: 'game',
    timestamp: Date.now(),
    payload,
  };

  await writeSharedText(
    'data/bridge/inbox/game/' + msg.id + '.json',
    JSON.stringify(msg, null, 2)
  ).catch(() => false);
}

export async function publishAdvancedMechanicsToGame(): Promise<boolean> {
  const payload = {
    publishedAt: new Date().toISOString(),
    app: APP_ID,
    mechanics: MECHANIC_EFFECTS,
    stackModes: STACK_MODE_CATALOG,
    cardTemplates: ADVANCED_CARD_TEMPLATES,
    passiveTemplates: CHARACTER_PASSIVE_TEMPLATES,
  };

  await writeSharedText('data/kv/cargas.mechanicsCatalog.v2.json', JSON.stringify(payload, null, 2));
  await notifyGame('mechanics_catalog_updated', payload);
  return true;
}

export async function publishRegistriesToGame(): Promise<boolean> {
  const data = exportAllRegistries();

  await writeSharedText('data/kv/cargas.editorRegistries.v1.json', JSON.stringify({
    app: APP_ID,
    publishedAt: new Date().toISOString(),
    ...data,
  }, null, 2));

  if (data.baseOverrides) {
    await writeSharedText('data/kv/cargas.baseOverrides.v1.json', JSON.stringify(data.baseOverrides, null, 2));
  }

  await notifyGame('editor_registries_updated', {
    hasBaseOverrides: !!data.baseOverrides,
    keys: Object.keys(data || {}),
  });

  return true;
}

export async function publishWorkbenchExample(): Promise<boolean> {
  const example = {
    app: APP_ID,
    publishedAt: new Date().toISOString(),
    complexCharacter: makeComplexCharacterTemplate(),
    suggestedCards: Object.values(ADVANCED_CARD_TEMPLATES),
  };

  await writeSharedText('data/kv/' + APP_ID + '.advancedWorkbench.v2.json', JSON.stringify(example, null, 2));
  await notifyGame('advanced_workbench_updated', example);
  return true;
}
