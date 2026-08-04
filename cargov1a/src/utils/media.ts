// ============================================================
// 🎧 MOTOR DE MEDIA (IMÁGENES + SONIDOS)
// ============================================================
// Centraliza cómo resolver y reproducir assets multimedia de
// cartas/personajes. Se usa tanto en el juego base como en mods/DLC.
//
// OBJETIVOS:
//   - Permitir assets nulos (`null`) sin romper UI
//   - Soportar rutas públicas, remotas y data URLs
//   - Reproducir sonidos de forma segura (sin crashear si faltan)
//   - Evitar repetir lógica en varios componentes
//
// 🛠️ PARA MODDERS
//   Puedes usar cualquiera de estas rutas:
//     - "/placeholders/mi_carta.png"
//     - "https://.../mi_sonido.mp3"
//     - "data:image/png;base64,..."
//     - null
//
//   En ZIP/.cargasmod, el importador puede convertir archivos internos
//   a data URLs automáticamente.
// ============================================================

import { CharacterCard, MediaAssetUrl, PlayableCard } from '../types/game';

export type MediaKind = 'image' | 'audio';

/**
 * Devuelve true si la URL parece válida para imagen/audio.
 *
 * IMPORTANTE: por defecto IGNORAMOS rutas '/placeholders/...' porque son
 * rutas de marcador que normalmente NO existen como archivo real, y
 * cargarlas mostraría una imagen rota. En su lugar, el componente cae
 * al icono emoji. Si tienes archivos reales en /public/placeholders/,
 * puedes desactivar este filtro pasando allowPlaceholders=true.
 */
export function isUsableMediaUrl(
  url: MediaAssetUrl | undefined,
  allowPlaceholders = false
): url is string {
  if (typeof url !== 'string') return false;
  const v = url.trim();
  if (v.length === 0) return false;
  // Filtra rutas de marcador inexistentes para evitar imágenes rotas
  if (!allowPlaceholders && v.startsWith('/placeholders/')) return false;
  return true;
}

/**
 * Resuelve la imagen principal de una carta.
 * Prioridad:
 *   1. card.media.image
 *   2. card.imageFront (legacy)
 *   3. null
 */
export function getCardImage(card: PlayableCard): string | null {
  if (isUsableMediaUrl(card.media?.image)) return card.media!.image!;
  if (isUsableMediaUrl(card.imageFront)) return card.imageFront;
  return null;
}

/**
 * Resuelve el icono visual de una carta (si hay PNG/SVG específico).
 */
export function getCardIconImage(card: PlayableCard): string | null {
  if (isUsableMediaUrl(card.media?.iconImage)) return card.media!.iconImage!;
  return null;
}

/**
 * Resuelve la imagen frontal de un personaje.
 */
export function getCharacterFrontImage(char: CharacterCard): string | null {
  if (isUsableMediaUrl(char.media?.imageFront)) return char.media!.imageFront!;
  if (isUsableMediaUrl(char.imageFront)) return char.imageFront;
  return null;
}

/**
 * Resuelve la imagen reversa de un personaje.
 */
export function getCharacterBackImage(char: CharacterCard): string | null {
  if (isUsableMediaUrl(char.media?.imageBack)) return char.media!.imageBack!;
  if (isUsableMediaUrl(char.imageBack)) return char.imageBack;
  return null;
}

/**
 * Reproduce un sonido con fail-safe.
 * No lanza errores si el navegador bloquea autoplay o la URL falla.
 */
export async function playSound(url: MediaAssetUrl | undefined, volume = 0.65): Promise<void> {
  if (!isUsableMediaUrl(url)) return;
  try {
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.preload = 'auto';
    await audio.play().catch(() => undefined);
  } catch {
    // Silencioso por diseño: no romper la UX por un asset roto.
  }
}

/**
 * Reproduce el sonido correspondiente a una carta según etapa.
 */
export async function playCardSound(
  card: PlayableCard,
  stage: 'hover' | 'play' | 'resolve' = 'play'
): Promise<void> {
  if (stage === 'hover') return playSound(card.media?.soundOnHover, 0.35);
  if (stage === 'resolve') return playSound(card.media?.soundOnResolve, 0.7);
  return playSound(card.media?.soundOnPlay, 0.6);
}

/**
 * Reproduce el sonido de intro de un personaje si existe.
 */
export async function playCharacterIntro(char?: CharacterCard | null): Promise<void> {
  if (!char) return;
  return playSound(char.media?.soundOnIntro, 0.5);
}

/**
 * Heurística para saber si una URL es un asset embebido.
 */
export function isEmbeddedDataUrl(url?: string | null): boolean {
  return !!url && url.startsWith('data:');
}
