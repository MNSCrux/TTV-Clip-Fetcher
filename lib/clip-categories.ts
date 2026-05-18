export const DEFAULT_PRIMARY_CLIP_CATEGORIES = [
  'Path of Exile',
  'Path of Exile 2',
  'Last Epoch',
  'Diablo IV',
  'Just Chatting',
];

export const PRIMARY_CLIP_CATEGORIES_SETTING_KEY = 'PRIMARY_CLIP_CATEGORIES';

export function parsePrimaryClipCategories(value?: string | null) {
  if (!value) return DEFAULT_PRIMARY_CLIP_CATEGORIES;

  const categories = value
    .split(/\r?\n|,/)
    .map((category) => category.trim())
    .filter(Boolean);

  return categories.length > 0 ? [...new Set(categories)] : DEFAULT_PRIMARY_CLIP_CATEGORIES;
}

export function serializePrimaryClipCategories(value: unknown) {
  const raw = Array.isArray(value) ? value.join('\n') : String(value ?? '');
  return parsePrimaryClipCategories(raw).join('\n');
}
