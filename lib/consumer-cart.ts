import {
  DEFAULT_CONTRACT_OPTIONS,
  DELIVERY_FEE_CENTS,
  formatContractDuration,
  formatFulfillmentMethod,
  getPreparationDayLabel,
  type ContractDurationMonths,
  type FulfillmentMethod,
  type OrderContractOptions,
} from '@/lib/contract-options';
import { MEAL_CATEGORY_LABELS, type MealCategory } from '@/lib/meal-categories';

export interface ConsumerCartItem {
  lineId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  vendorId: string;
  vendorName: string;
  contractDurationMonths: ContractDurationMonths;
  preparationDays: number[];
  mealPeriod: MealCategory;
  fulfillmentMethod: FulfillmentMethod;
}

export interface ConsumerCartItemInput {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  vendorId: string;
  vendorName: string;
  contractDurationMonths: ContractDurationMonths;
  preparationDays: number[];
  mealPeriod: MealCategory;
  fulfillmentMethod: FulfillmentMethod;
}

export interface OrderCheckoutGroup {
  vendorId: string;
  vendorName: string;
  contract: OrderContractOptions;
  items: Array<{ menuItemId: string; quantity: number }>;
  subtotalCents: number;
  deliveryFeeCents: number;
}

export interface CartSummarySection {
  id: string;
  title: string;
  subtitle: string;
  items: ConsumerCartItem[];
  subtotalCents: number;
}

export interface CartSummaryGroup {
  id: string;
  label: string;
  sections: CartSummarySection[];
  itemCount: number;
  subtotalCents: number;
}

const createLineId = () =>
  `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const normalizePreparationDays = (days: number[]) =>
  Array.from(new Set(days.filter((day) => day >= 0 && day <= 6))).sort(
    (left, right) => left - right
  );

export const formatPreparationDays = (days: number[]) =>
  normalizePreparationDays(days)
    .map((day) => getPreparationDayLabel(day))
    .join(', ');

export const buildCartLineKey = (item: {
  menuItemId: string;
  contractDurationMonths: ContractDurationMonths;
  preparationDays: number[];
  mealPeriod: MealCategory;
  fulfillmentMethod: FulfillmentMethod;
}) =>
  [
    item.menuItemId,
    item.contractDurationMonths,
    normalizePreparationDays(item.preparationDays).join(','),
    item.mealPeriod,
    item.fulfillmentMethod,
  ].join(':');

export const createCartLine = (input: ConsumerCartItemInput): ConsumerCartItem => ({
  lineId: createLineId(),
  ...input,
  preparationDays: normalizePreparationDays(input.preparationDays),
});

export const mergeCartLine = (
  cart: ConsumerCartItem[],
  input: ConsumerCartItemInput
): ConsumerCartItem[] => {
  const lineKey = buildCartLineKey(input);
  const existing = cart.find((item) => buildCartLineKey(item) === lineKey);

  if (existing) {
    return cart.map((item) =>
      item.lineId === existing.lineId
        ? { ...item, quantity: item.quantity + input.quantity }
        : item
    );
  }

  return [...cart, createCartLine(input)];
};

export const parseStoredCart = (raw: string | null): ConsumerCartItem[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item.lineId !== 'string' || typeof item.menuItemId !== 'string') {
          return null;
        }

        const preparationDays = Array.isArray(item.preparationDays)
          ? normalizePreparationDays(item.preparationDays)
          : typeof item.preparationDayOfWeek === 'number'
            ? [item.preparationDayOfWeek]
            : [];

        if (
          typeof item.quantity !== 'number' ||
          typeof item.contractDurationMonths !== 'number' ||
          !preparationDays.length ||
          typeof item.mealPeriod !== 'string' ||
          typeof item.fulfillmentMethod !== 'string'
        ) {
          return null;
        }

        return {
          ...item,
          preparationDays,
        } as ConsumerCartItem;
      })
      .filter(Boolean) as ConsumerCartItem[];
  } catch {
    return [];
  }
};

export const getCartSubtotalCents = (cart: ConsumerCartItem[]) =>
  cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const expandCartItemsByPreparationDay = (
  cart: ConsumerCartItem[]
): Array<ConsumerCartItem & { preparationDayOfWeek: number }> =>
  cart.flatMap((item) =>
    normalizePreparationDays(item.preparationDays).map((preparationDayOfWeek) => ({
      ...item,
      preparationDayOfWeek,
    }))
  );

export const groupCartItemsForCheckout = (
  cart: ConsumerCartItem[]
): OrderCheckoutGroup[] => {
  const groups = new Map<string, OrderCheckoutGroup>();
  const expandedItems = expandCartItemsByPreparationDay(cart);

  expandedItems.forEach((item) => {
    const key = [
      item.vendorId,
      item.contractDurationMonths,
      item.preparationDayOfWeek,
      item.fulfillmentMethod,
    ].join('|');

    const existing = groups.get(key);
    const nextItems = existing ? [...existing.items] : [];
    const existingItem = nextItems.find((entry) => entry.menuItemId === item.menuItemId);

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      nextItems.push({ menuItemId: item.menuItemId, quantity: item.quantity });
    }

    const mealPeriods = Array.from(
      new Set([
        ...(existing?.contract.mealPeriods || []),
        item.mealPeriod,
      ])
    ) as MealCategory[];

    const subtotalCents =
      (existing?.subtotalCents || 0) + item.price * item.quantity;
    const deliveryFeeCents =
      item.fulfillmentMethod === 'delivery' ? DELIVERY_FEE_CENTS : 0;

    groups.set(key, {
      vendorId: item.vendorId,
      vendorName: item.vendorName,
      contract: {
        contractDurationMonths: item.contractDurationMonths,
        preparationDayOfWeek: item.preparationDayOfWeek,
        mealPeriods,
        fulfillmentMethod: item.fulfillmentMethod,
      },
      items: nextItems,
      subtotalCents,
      deliveryFeeCents,
    });
  });

  return Array.from(groups.values());
};

export const getCheckoutTotals = (groups: OrderCheckoutGroup[]) => {
  const subtotalCents = groups.reduce((sum, group) => sum + group.subtotalCents, 0);
  const deliveryFeeCents = groups.reduce(
    (sum, group) => sum + group.deliveryFeeCents,
    0
  );

  return {
    subtotalCents,
    deliveryFeeCents,
    totalCents: subtotalCents + deliveryFeeCents,
    orderCount: groups.length,
  };
};

const buildSection = (
  id: string,
  title: string,
  subtitle: string,
  items: ConsumerCartItem[]
): CartSummarySection => ({
  id,
  title,
  subtitle,
  items,
  subtotalCents: getCartSubtotalCents(items),
});

export const buildContractLengthSummary = (
  cart: ConsumerCartItem[]
): CartSummaryGroup[] => {
  const byDuration = new Map<ContractDurationMonths, ConsumerCartItem[]>();

  cart.forEach((item) => {
    const group = byDuration.get(item.contractDurationMonths) || [];
    group.push(item);
    byDuration.set(item.contractDurationMonths, group);
  });

  return Array.from(byDuration.entries())
    .sort(([left], [right]) => left - right)
    .map(([duration, items]) => ({
      id: `duration-${duration}`,
      label: formatContractDuration(duration),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCents: getCartSubtotalCents(items),
      sections: Object.values(
        items.reduce<Record<string, CartSummarySection>>((acc, item) => {
          const sectionId = `${item.vendorId}-${normalizePreparationDays(item.preparationDays).join('-')}-${item.mealPeriod}-${item.fulfillmentMethod}`;
          if (!acc[sectionId]) {
            acc[sectionId] = buildSection(
              sectionId,
              item.vendorName,
              [
                formatPreparationDays(item.preparationDays),
                MEAL_CATEGORY_LABELS[item.mealPeriod],
                formatFulfillmentMethod(item.fulfillmentMethod),
              ].join(' · '),
              []
            );
          }
          acc[sectionId].items.push(item);
          acc[sectionId].subtotalCents = getCartSubtotalCents(acc[sectionId].items);
          return acc;
        }, {})
      ),
    }));
};

export const buildMealPeriodSummary = (cart: ConsumerCartItem[]): CartSummaryGroup[] => {
  const byMeal = new Map<MealCategory, ConsumerCartItem[]>();

  cart.forEach((item) => {
    const group = byMeal.get(item.mealPeriod) || [];
    group.push(item);
    byMeal.set(item.mealPeriod, group);
  });

  return (['breakfast', 'lunch', 'dinner'] as MealCategory[])
    .filter((meal) => byMeal.has(meal))
    .map((meal) => {
      const items = byMeal.get(meal) || [];
      return {
        id: `meal-${meal}`,
        label: MEAL_CATEGORY_LABELS[meal],
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotalCents: getCartSubtotalCents(items),
        sections: Object.values(
          items.reduce<Record<string, CartSummarySection>>((acc, item) => {
            const sectionId = `${item.vendorId}-${item.contractDurationMonths}-${normalizePreparationDays(item.preparationDays).join('-')}`;
            if (!acc[sectionId]) {
              acc[sectionId] = buildSection(
                sectionId,
                item.vendorName,
                `${formatContractDuration(item.contractDurationMonths)} · ${formatPreparationDays(item.preparationDays)}`,
                []
              );
            }
            acc[sectionId].items.push(item);
            acc[sectionId].subtotalCents = getCartSubtotalCents(acc[sectionId].items);
            return acc;
          }, {})
        ),
      };
    });
};

export const buildPreparationDaySummary = (
  cart: ConsumerCartItem[]
): CartSummaryGroup[] => {
  const byDay = new Map<number, ConsumerCartItem[]>();

  cart.forEach((item) => {
    normalizePreparationDays(item.preparationDays).forEach((day) => {
      const group = byDay.get(day) || [];
      group.push(item);
      byDay.set(day, group);
    });
  });

  return Array.from(byDay.entries())
    .sort(([left], [right]) => left - right)
    .map(([day, items]) => ({
      id: `day-${day}`,
      label: getPreparationDayLabel(day),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCents: getCartSubtotalCents(items),
      sections: Object.values(
        items.reduce<Record<string, CartSummarySection>>((acc, item) => {
          const sectionId = `${item.vendorId}-${item.contractDurationMonths}-${item.mealPeriod}`;
          if (!acc[sectionId]) {
            acc[sectionId] = buildSection(
              sectionId,
              item.vendorName,
              `${formatContractDuration(item.contractDurationMonths)} · ${MEAL_CATEGORY_LABELS[item.mealPeriod]}`,
              []
            );
          }
          acc[sectionId].items.push(item);
          acc[sectionId].subtotalCents = getCartSubtotalCents(acc[sectionId].items);
          return acc;
        }, {})
      ),
    }));
};

export const buildVendorSummary = (cart: ConsumerCartItem[]): CartSummaryGroup[] => {
  const byVendor = new Map<string, ConsumerCartItem[]>();

  cart.forEach((item) => {
    const group = byVendor.get(item.vendorId) || [];
    group.push(item);
    byVendor.set(item.vendorId, group);
  });

  return Array.from(byVendor.entries()).map(([vendorId, items]) => ({
    id: `vendor-${vendorId}`,
    label: items[0]?.vendorName || 'Vendor',
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents: getCartSubtotalCents(items),
    sections: Object.values(
      items.reduce<Record<string, CartSummarySection>>((acc, item) => {
        const sectionId = `${item.contractDurationMonths}-${normalizePreparationDays(item.preparationDays).join('-')}-${item.mealPeriod}-${item.fulfillmentMethod}`;
        if (!acc[sectionId]) {
          acc[sectionId] = buildSection(
            sectionId,
            [
              formatContractDuration(item.contractDurationMonths),
              formatPreparationDays(item.preparationDays),
              MEAL_CATEGORY_LABELS[item.mealPeriod],
            ].join(' · '),
            formatFulfillmentMethod(item.fulfillmentMethod),
            []
          );
        }
        acc[sectionId].items.push(item);
        acc[sectionId].subtotalCents = getCartSubtotalCents(acc[sectionId].items);
        return acc;
      }, {})
    ),
  }));
};

export const getDefaultItemOrderOptions = (
  defaults?: Partial<OrderContractOptions>
) => ({
  contractDurationMonths:
    defaults?.contractDurationMonths || DEFAULT_CONTRACT_OPTIONS.contractDurationMonths,
  preparationDays: defaults?.preparationDayOfWeek !== undefined
    ? [defaults.preparationDayOfWeek]
    : [DEFAULT_CONTRACT_OPTIONS.preparationDayOfWeek],
  mealPeriod:
    defaults?.mealPeriods?.[0] || DEFAULT_CONTRACT_OPTIONS.mealPeriods[0],
  fulfillmentMethod:
    defaults?.fulfillmentMethod || DEFAULT_CONTRACT_OPTIONS.fulfillmentMethod,
});

export const formatCartLineSchedule = (item: ConsumerCartItem) =>
  [
    `${item.quantity} dish${item.quantity === 1 ? '' : 'es'}`,
    formatContractDuration(item.contractDurationMonths),
    formatPreparationDays(item.preparationDays),
    MEAL_CATEGORY_LABELS[item.mealPeriod],
    formatFulfillmentMethod(item.fulfillmentMethod),
  ].join(' · ');
