// ============================================================
// 🏷️ ESTILOS DE TAGS
// ============================================================
// Convierte un tag lógico en una clase CSS visual.
// Las clases reales viven en index.css como `.tag-{nombre}`.
//
// Ejemplo:
//   <span className={tagClass('veneno')}>veneno</span>
//
// Si el tag no existe, usa un estilo genérico.
// ============================================================

export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\-]+/g, '_');
}

export function tagClass(tag: string): string {
  const safe = normalizeTag(tag);
  return `tag-${safe}`;
}
