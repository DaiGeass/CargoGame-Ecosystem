import { invoke } from '@tauri-apps/api/core';

function assertTauri() {
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
    throw new Error('CARGAS requiere Tauri. No se permite guardar datos reales en web/almacenamiento web/cache.');
  }
}

export async function ensureSharedStructure(): Promise<void> {
  assertTauri();
  await invoke('ensure_shared_structure');
}

export async function getSharedRoot(): Promise<string> {
  assertTauri();
  return await invoke<string>('get_shared_root');
}

export async function readSharedText(path: string): Promise<string | null> {
  assertTauri();
  return await invoke<string | null>('read_shared_text', { path });
}

export async function writeSharedText(path: string, content: string): Promise<boolean> {
  assertTauri();
  return await invoke<boolean>('write_shared_text', { path, content });
}

export async function listSharedDir(path: string): Promise<string[]> {
  assertTauri();
  return await invoke<string[]>('list_shared_dir', { path });
}

export async function existsShared(path: string): Promise<boolean> {
  assertTauri();
  return await invoke<boolean>('exists_shared', { path });
}

export async function createSharedDir(path: string): Promise<boolean> {
  assertTauri();
  return await invoke<boolean>('create_shared_dir', { path });
}

export async function removeSharedFile(path: string): Promise<boolean> {
  assertTauri();
  return await invoke<boolean>('remove_shared_file', { path });
}
