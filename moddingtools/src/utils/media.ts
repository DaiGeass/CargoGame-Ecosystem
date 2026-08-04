// ============================================================
// 🎧 MOTOR DE MEDIA (real, alineado con CARGAS)
// ============================================================
import { CharacterCard, MediaAssetUrl, PlayableCard } from '../types/game';

export type MediaKind = 'image' | 'audio';

export function isUsableMediaUrl(url: MediaAssetUrl | undefined, allowPlaceholders = false): url is string {
  if (typeof url !== 'string') return false;
  const v = url.trim();
  if (v.length === 0) return false;
  if (!allowPlaceholders && v.startsWith('/placeholders/')) return false;
  return true;
}

export function getCardImage(card: PlayableCard): string | null {
  if (isUsableMediaUrl(card.media?.image)) return card.media!.image!;
  if (isUsableMediaUrl(card.imageFront)) return card.imageFront;
  return null;
}

export function getCardIconImage(card: PlayableCard): string | null {
  if (isUsableMediaUrl(card.media?.iconImage)) return card.media!.iconImage!;
  return null;
}

export function getCharacterFrontImage(char: CharacterCard): string | null {
  if (isUsableMediaUrl(char.media?.imageFront)) return char.media!.imageFront!;
  if (isUsableMediaUrl(char.imageFront)) return char.imageFront;
  return null;
}

export function getCharacterBackImage(char: CharacterCard): string | null {
  if (isUsableMediaUrl(char.media?.imageBack)) return char.media!.imageBack!;
  if (isUsableMediaUrl(char.imageBack)) return char.imageBack;
  return null;
}

export async function playSound(url: MediaAssetUrl | undefined, volume = 0.65): Promise<void> {
  if (!isUsableMediaUrl(url)) return;
  try {
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.preload = 'auto';
    await audio.play().catch(() => undefined);
  } catch { /* silencioso */ }
}

export async function playCardSound(card: PlayableCard, stage: 'hover' | 'play' | 'resolve' = 'play'): Promise<void> {
  if (stage === 'hover') return playSound(card.media?.soundOnHover, 0.35);
  if (stage === 'resolve') return playSound(card.media?.soundOnResolve, 0.7);
  return playSound(card.media?.soundOnPlay, 0.6);
}

export async function playCharacterIntro(char?: CharacterCard | null): Promise<void> {
  if (!char) return;
  return playSound(char.media?.soundOnIntro, 0.5);
}

export function isEmbeddedDataUrl(url?: string | null): boolean {
  return !!url && url.startsWith('data:');
}
