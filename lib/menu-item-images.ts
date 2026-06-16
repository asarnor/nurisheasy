export interface MenuItemImageInput {
  name: string;
  description?: string;
  ingredients?: string[];
  mealCategories?: ('breakfast' | 'lunch' | 'dinner')[];
  category?: string;
  imageUrl?: string | null;
}

const GENERATED_IMAGE_HOST = 'image.pollinations.ai';

export const buildMenuItemImagePrompt = (item: MenuItemImageInput): string => {
  const details = [
    item.description?.trim(),
    item.mealCategories?.length
      ? `meal periods: ${item.mealCategories.join(', ')}`
      : item.category?.trim()
        ? `category: ${item.category}`
        : '',
    item.ingredients?.length
      ? `ingredients: ${item.ingredients.join(', ')}`
      : '',
  ].filter(Boolean);

  return [
    `Professional appetizing food photography of ${item.name}`,
    ...details,
    'restaurant quality, natural lighting, shallow depth of field, plated beautifully, no text, no watermark, no people',
  ].join('. ');
};

export const getMenuItemImageSeed = (menuId: string, name: string): number => {
  let hash = 0;
  const value = `${menuId}:${name}`;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
};

export const getGeneratedMenuItemImageUrl = (
  item: MenuItemImageInput,
  menuId?: string
): string => {
  const prompt = buildMenuItemImagePrompt(item);
  const seed = getMenuItemImageSeed(menuId || item.name, item.name);
  const params = new URLSearchParams({
    width: '512',
    height: '512',
    seed: String(seed),
    nologo: 'true',
    model: 'flux',
  });

  return `https://${GENERATED_IMAGE_HOST}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
};

export const isGeneratedImageUrl = (url?: string | null): boolean =>
  Boolean(url?.includes(GENERATED_IMAGE_HOST));

export const isVendorUploadedImage = (url?: string | null): boolean =>
  Boolean(url?.trim()) && !isGeneratedImageUrl(url);

export const resolveMenuItemImageUrl = (
  item: MenuItemImageInput,
  menuId?: string
): string => {
  if (isVendorUploadedImage(item.imageUrl)) {
    return item.imageUrl!.trim();
  }

  if (item.imageUrl?.trim() && isGeneratedImageUrl(item.imageUrl)) {
    return item.imageUrl.trim();
  }

  return getGeneratedMenuItemImageUrl(item, menuId);
};

export const assignGeneratedImageIfNeeded = <T extends MenuItemImageInput & { id?: string }>(
  item: T,
  menuId?: string
): T => {
  if (isVendorUploadedImage(item.imageUrl)) {
    return item;
  }

  const id = menuId || item.id || item.name;

  return {
    ...item,
    imageUrl: getGeneratedMenuItemImageUrl(item, id),
  };
};

export const maybeRefreshGeneratedImage = <
  T extends MenuItemImageInput & { id?: string; imageUrl?: string },
>(
  existing: T,
  updates: Partial<MenuItemImageInput>
): string | undefined => {
  if (isVendorUploadedImage(updates.imageUrl ?? existing.imageUrl)) {
    return updates.imageUrl ?? existing.imageUrl;
  }

  if (updates.imageUrl === '') {
    return getGeneratedMenuItemImageUrl({ ...existing, ...updates }, existing.id);
  }

  const detailKeys = ['name', 'description', 'ingredients', 'mealCategories', 'category'] as const;
  const detailsChanged = detailKeys.some((key) => {
    if (updates[key] === undefined) return false;
    const before = existing[key];
    const after = updates[key];
    if (Array.isArray(before) && Array.isArray(after)) {
      return before.join(',') !== after.join(',');
    }
    return before !== after;
  });

  const currentUrl = updates.imageUrl ?? existing.imageUrl;

  if (!currentUrl?.trim() || isGeneratedImageUrl(currentUrl) || detailsChanged) {
    return getGeneratedMenuItemImageUrl({ ...existing, ...updates }, existing.id);
  }

  return currentUrl;
};
