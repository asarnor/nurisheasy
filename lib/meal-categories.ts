export type MealCategory = 'breakfast' | 'lunch' | 'dinner';

export const MEAL_CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner'];

export const DEFAULT_MEAL_CATEGORIES: MealCategory[] = ['dinner'];

export const MEAL_CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export const isMealCategory = (value?: string | null): value is MealCategory =>
  Boolean(value && MEAL_CATEGORIES.includes(value as MealCategory));

export const normalizeMealCategories = (item: {
  mealCategories?: string[] | null;
  category?: string | null;
}): MealCategory[] => {
  if (item.mealCategories?.length) {
    const valid = item.mealCategories.filter(isMealCategory);
    if (valid.length) return valid;
  }

  if (item.category) {
    const lower = item.category.toLowerCase();
    if (lower.includes('breakfast')) return ['breakfast'];
    if (lower.includes('lunch')) return ['lunch'];
    if (lower.includes('dinner')) return ['dinner'];
  }

  return DEFAULT_MEAL_CATEGORIES;
};

export const normalizeMealCategoriesInput = (
  categories?: string[] | null
): MealCategory[] => {
  if (!categories?.length) return DEFAULT_MEAL_CATEGORIES;

  const valid = Array.from(new Set(categories.filter(isMealCategory)));
  return valid.length ? valid : DEFAULT_MEAL_CATEGORIES;
};

export const itemMatchesMeal = (
  item: { mealCategories?: string[] | null; category?: string | null },
  meal: MealCategory
): boolean => normalizeMealCategories(item).includes(meal);

export const formatMealCategories = (categories: MealCategory[]): string =>
  categories.map((category) => MEAL_CATEGORY_LABELS[category]).join(', ');
