// ============================================================
// 🏷️ ESTILOS DE TAGS (real, alineado con CARGAS)
// ============================================================
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\-]+/g, '_');
}

export function tagClass(tag: string): string {
  return `tag-${normalizeTag(tag)}`;
}
