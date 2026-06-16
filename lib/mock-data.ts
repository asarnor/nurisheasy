export type MockRole = 'consumer' | 'vendor' | 'admin';

export interface MockOrganization {
  id: string;
  name: string;
  type: MockRole;
  safetyProfile?: {
    criticalAllergens: string[];
    preferences: string[];
    taxExempt: boolean;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  stripeAccountId?: string;
}

export interface MockMenuItem {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  allergenTags: string[];
  ingredients: string[];
  imageUrl?: string;
  category?: string;
  stockQuantity?: number | null;
  servingSizeOz?: number | null;
  maxPortionsPerOrder?: number | null;
}

export interface MockOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface MockSubOrder {
  vendorId: string;
  vendorName: string;
  status:
    | 'PENDING'
    | 'ACCEPTED'
    | 'PREPARING'
    | 'READY'
    | 'DELIVERED'
    | 'REFUNDED'
    | 'CANCELLED';
  items: MockOrderItem[];
  vendorTotal: number;
  acceptedAt?: string;
  estimatedReadyAt?: string;
}

export interface MockOrder {
  _id: string;
  status: 'PROCESSING' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED';
  paymentIntentId: string;
  totalAmount: number;
  platformFee: number;
  subOrders: MockSubOrder[];
  createdAt: string;
  consumerId: {
    _id: string;
    name: string;
  };
}

export interface MockIssue {
  id: string;
  type: string;
  vendorName: string;
  orderId: string;
  message: string;
  severity: 'high' | 'critical';
}

export interface MockUser {
  _id: string;
  name: string;
  type: 'consumer' | 'vendor';
  status: 'active' | 'suspended';
  lastLogin?: string;
}

export interface MockStore {
  organizations: {
    consumer: MockOrganization;
    vendors: MockOrganization[];
    admin: MockOrganization;
  };
  menuItems: MockMenuItem[];
  orders: MockOrder[];
  issues: MockIssue[];
  users: MockUser[];
}

export type MockOrganizationUpdates = Partial<
  Omit<MockOrganization, 'safetyProfile' | 'address'>
> & {
  safetyProfile?: Partial<NonNullable<MockOrganization['safetyProfile']>>;
  address?: Partial<NonNullable<MockOrganization['address']>>;
};

const sumItems = (items: MockOrderItem[]) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0);

const withTotal = (items: MockOrderItem[]) => ({
  items,
  vendorTotal: sumItems(items),
});

const createMockStore = (): MockStore => {
  const vendors: MockOrganization[] = [
    {
      id: 'vendor_mommas',
      name: "Momma's Whole Foods",
      type: 'vendor',
      address: {
        street: '215 Main Street',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        coordinates: { lat: 30.2672, lng: -97.7431 },
      },
      stripeAccountId: 'acct_mock_mommas',
    },
    {
      id: 'vendor_cedar',
      name: 'Cedar & Spice',
      type: 'vendor',
      address: {
        street: '88 Orchard Rd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78704',
        coordinates: { lat: 30.2500, lng: -97.7500 },
      },
      stripeAccountId: 'acct_mock_cedar',
    },
  ];

  const consumer: MockOrganization = {
    id: 'consumer_tommys',
    name: "Tommy's Home Care",
    type: 'consumer',
    safetyProfile: {
      criticalAllergens: ['PEANUT', 'SHELLFISH'],
      preferences: ['LOW_SODIUM', 'HALAL'],
      taxExempt: true,
    },
    address: {
      street: '450 Riverside Dr',
      city: 'Austin',
      state: 'TX',
      zipCode: '78702',
      coordinates: { lat: 30.2610, lng: -97.7300 },
    },
  };

  const admin: MockOrganization = {
    id: 'admin_safeplate',
    name: 'SafePlate Admin',
    type: 'admin',
  };

  // Momma's Whole Foods menu — organized by meal period
  // Breakfast (7 AM – 11 AM) • Lunch (11 AM – 2 PM) • Dinner (5 PM – 8 PM)
  // Capacity: 100 servings per meal period
  const menuItems: MockMenuItem[] = [
    // ── Breakfast items (7 AM – 11 AM) ──
    {
      id: 'menu_mommas_b1',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Farm Fresh Scrambled Eggs & Toast',
      description: 'Free-range eggs scrambled with herbs, served with whole-wheat toast and fruit.',
      price: 799,
      isAvailable: true,
      allergenTags: ['EGG', 'WHEAT', 'DAIRY'],
      ingredients: ['eggs', 'butter', 'whole-wheat bread', 'herbs', 'seasonal fruit'],
      category: 'Breakfast (7am–11am)',
      stockQuantity: 100,
      servingSizeOz: 10,
      maxPortionsPerOrder: 25,
    },
    {
      id: 'menu_mommas_b2',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Oatmeal Power Bowl',
      description: 'Steel-cut oats with banana, walnuts, honey, and cinnamon.',
      price: 699,
      isAvailable: true,
      allergenTags: ['TREE_NUT'],
      ingredients: ['steel-cut oats', 'banana', 'walnuts', 'honey', 'cinnamon'],
      category: 'Breakfast (7am–11am)',
      stockQuantity: 100,
      servingSizeOz: 12,
      maxPortionsPerOrder: 25,
    },
    {
      id: 'menu_mommas_b3',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Veggie Breakfast Burrito',
      description: 'Whole-wheat tortilla with scrambled eggs, black beans, peppers, and salsa.',
      price: 899,
      isAvailable: true,
      allergenTags: ['EGG', 'WHEAT', 'DAIRY'],
      ingredients: ['tortilla', 'eggs', 'black beans', 'bell pepper', 'salsa', 'cheese'],
      category: 'Breakfast (7am–11am)',
      stockQuantity: 80,
      servingSizeOz: 14,
      maxPortionsPerOrder: 25,
    },
    {
      id: 'menu_mommas_b4',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Fresh Fruit & Yogurt Parfait',
      description: 'Greek yogurt layered with granola and seasonal berries.',
      price: 599,
      isAvailable: true,
      allergenTags: ['DAIRY'],
      ingredients: ['greek yogurt', 'granola', 'strawberries', 'blueberries', 'honey'],
      category: 'Breakfast (7am–11am)',
      stockQuantity: 100,
      servingSizeOz: 8,
      maxPortionsPerOrder: 25,
    },

    // ── Lunch items (11 AM – 2 PM) ──
    {
      id: 'menu_mommas_l1',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Grilled Chicken Caesar Wrap',
      description: 'Herb-grilled chicken, romaine, parmesan, and house Caesar dressing in a spinach wrap.',
      price: 1099,
      isAvailable: true,
      allergenTags: ['DAIRY', 'WHEAT', 'EGG'],
      ingredients: ['chicken breast', 'romaine', 'parmesan', 'spinach wrap', 'caesar dressing'],
      category: 'Lunch (11am–2pm)',
      stockQuantity: 100,
      servingSizeOz: 14,
      maxPortionsPerOrder: 25,
    },
    {
      id: 'menu_mommas_l2',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Harvest Quinoa Bowl',
      description: 'Quinoa, roasted sweet potato, kale, chickpeas, and tahini dressing.',
      price: 1199,
      isAvailable: true,
      allergenTags: ['SESAME'],
      ingredients: ['quinoa', 'sweet potato', 'kale', 'chickpeas', 'tahini'],
      category: 'Lunch (11am–2pm)',
      stockQuantity: 100,
      servingSizeOz: 14,
      maxPortionsPerOrder: 25,
    },
    {
      id: 'menu_mommas_l3',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Homestyle Vegetable Soup & Bread',
      description: 'Hearty vegetable soup made from scratch, served with warm sourdough.',
      price: 899,
      isAvailable: true,
      allergenTags: ['WHEAT', 'GLUTEN'],
      ingredients: ['carrots', 'celery', 'potatoes', 'tomatoes', 'sourdough bread'],
      category: 'Lunch (11am–2pm)',
      stockQuantity: 100,
      servingSizeOz: 16,
      maxPortionsPerOrder: 25,
    },
    {
      id: 'menu_mommas_l4',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Turkey & Avocado Club Sandwich',
      description: 'Sliced turkey, avocado, bacon, lettuce, and tomato on whole grain bread.',
      price: 1199,
      isAvailable: true,
      allergenTags: ['WHEAT', 'GLUTEN'],
      ingredients: ['turkey', 'avocado', 'bacon', 'lettuce', 'tomato', 'whole grain bread'],
      category: 'Lunch (11am–2pm)',
      stockQuantity: 80,
      servingSizeOz: 12,
      maxPortionsPerOrder: 25,
    },

    // ── Dinner items (5 PM – 8 PM) ──
    {
      id: 'menu_mommas_d1',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Herb-Roasted Chicken with Vegetables',
      description: 'Rosemary roasted chicken breast with seasonal roasted vegetables and brown rice.',
      price: 1399,
      isAvailable: true,
      allergenTags: [],
      ingredients: ['chicken breast', 'rosemary', 'zucchini', 'carrots', 'brown rice'],
      category: 'Dinner (5pm–8pm)',
      stockQuantity: 100,
      servingSizeOz: 16,
      maxPortionsPerOrder: 25,
    },
    {
      id: 'menu_mommas_d2',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Baked Salmon with Lemon Dill Sauce',
      description: 'Wild-caught salmon fillet with lemon-dill cream, asparagus, and mashed potatoes.',
      price: 1599,
      isAvailable: true,
      allergenTags: ['FISH', 'DAIRY'],
      ingredients: ['salmon', 'lemon', 'dill', 'cream', 'asparagus', 'potatoes'],
      category: 'Dinner (5pm–8pm)',
      stockQuantity: 60,
      servingSizeOz: 16,
      maxPortionsPerOrder: 25,
    },
    {
      id: 'menu_mommas_d3',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Beef Stew with Cornbread',
      description: 'Slow-braised beef stew with root vegetables, served with homemade cornbread.',
      price: 1399,
      isAvailable: true,
      allergenTags: ['WHEAT', 'GLUTEN', 'DAIRY'],
      ingredients: ['beef', 'potatoes', 'carrots', 'onions', 'cornbread'],
      category: 'Dinner (5pm–8pm)',
      stockQuantity: 80,
      servingSizeOz: 16,
      maxPortionsPerOrder: 25,
    },
    {
      id: 'menu_mommas_d4',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Vegetarian Pasta Primavera',
      description: 'Penne with seasonal vegetables in a light garlic olive oil sauce.',
      price: 1199,
      isAvailable: true,
      allergenTags: ['WHEAT', 'GLUTEN'],
      ingredients: ['penne pasta', 'bell peppers', 'zucchini', 'cherry tomatoes', 'garlic', 'olive oil'],
      category: 'Dinner (5pm–8pm)',
      stockQuantity: 100,
      servingSizeOz: 14,
      maxPortionsPerOrder: 25,
    },

    // ── Cedar & Spice (secondary vendor) ──
    {
      id: 'menu_cedar_1',
      vendorId: vendors[1].id,
      vendorName: vendors[1].name,
      name: 'Turmeric Lentil Soup',
      description: 'Golden lentil soup with coconut milk and warm spices.',
      price: 999,
      isAvailable: true,
      allergenTags: ['DAIRY'],
      ingredients: ['lentils', 'turmeric', 'coconut milk'],
      category: 'Lunch (11am–2pm)',
      stockQuantity: 40,
      servingSizeOz: 12,
    },
    {
      id: 'menu_cedar_2',
      vendorId: vendors[1].id,
      vendorName: vendors[1].name,
      name: 'Market Green Wrap',
      description: 'Spinach wrap with roasted veggies and tahini.',
      price: 899,
      isAvailable: true,
      allergenTags: ['SESAME'],
      ingredients: ['spinach wrap', 'zucchini', 'tahini'],
      category: 'Lunch (11am–2pm)',
      stockQuantity: 40,
      servingSizeOz: 10,
    },
  ];

  const now = Date.now();

  // Breakfast order — Tommy's orders 20 servings for morning
  const breakfastOrder = withTotal([
    { menuItemId: 'menu_mommas_b1', name: 'Farm Fresh Scrambled Eggs & Toast', quantity: 10, price: 799 },
    { menuItemId: 'menu_mommas_b2', name: 'Oatmeal Power Bowl', quantity: 5, price: 699 },
    { menuItemId: 'menu_mommas_b4', name: 'Fresh Fruit & Yogurt Parfait', quantity: 5, price: 599 },
  ]);

  // Lunch order — Tommy's orders 20 servings for midday
  const lunchOrder = withTotal([
    { menuItemId: 'menu_mommas_l1', name: 'Grilled Chicken Caesar Wrap', quantity: 8, price: 1099 },
    { menuItemId: 'menu_mommas_l2', name: 'Harvest Quinoa Bowl', quantity: 7, price: 1199 },
    { menuItemId: 'menu_mommas_l3', name: 'Homestyle Vegetable Soup & Bread', quantity: 5, price: 899 },
  ]);

  // Dinner order — Tommy's orders 20 servings for evening
  const dinnerOrder = withTotal([
    { menuItemId: 'menu_mommas_d1', name: 'Herb-Roasted Chicken with Vegetables', quantity: 8, price: 1399 },
    { menuItemId: 'menu_mommas_d3', name: 'Beef Stew with Cornbread', quantity: 7, price: 1399 },
    { menuItemId: 'menu_mommas_d4', name: 'Vegetarian Pasta Primavera', quantity: 5, price: 1199 },
  ]);

  // Past delivered dinner
  const pastDinnerOrder = withTotal([
    { menuItemId: 'menu_mommas_d1', name: 'Herb-Roasted Chicken with Vegetables', quantity: 10, price: 1399 },
    { menuItemId: 'menu_mommas_d4', name: 'Vegetarian Pasta Primavera', quantity: 10, price: 1199 },
  ]);

  const orders: MockOrder[] = [
    {
      _id: 'order_mock_1001',
      status: 'PROCESSING',
      paymentIntentId: 'pi_mock_1001',
      totalAmount: breakfastOrder.vendorTotal,
      platformFee: Math.round(breakfastOrder.vendorTotal * 0.1),
      createdAt: new Date(now - 1000 * 60 * 25).toISOString(),
      consumerId: { _id: consumer.id, name: consumer.name },
      subOrders: [
        {
          vendorId: vendors[0].id,
          vendorName: vendors[0].name,
          status: 'PENDING',
          items: breakfastOrder.items,
          vendorTotal: breakfastOrder.vendorTotal,
        },
      ],
    },
    {
      _id: 'order_mock_1002',
      status: 'CONFIRMED',
      paymentIntentId: 'pi_mock_1002',
      totalAmount: lunchOrder.vendorTotal,
      platformFee: Math.round(lunchOrder.vendorTotal * 0.1),
      createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
      consumerId: { _id: consumer.id, name: consumer.name },
      subOrders: [
        {
          vendorId: vendors[0].id,
          vendorName: vendors[0].name,
          status: 'PREPARING',
          items: lunchOrder.items,
          vendorTotal: lunchOrder.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 100).toISOString(),
        },
      ],
    },
    {
      _id: 'order_mock_1003',
      status: 'CONFIRMED',
      paymentIntentId: 'pi_mock_1003',
      totalAmount: dinnerOrder.vendorTotal,
      platformFee: Math.round(dinnerOrder.vendorTotal * 0.1),
      createdAt: new Date(now - 1000 * 60 * 260).toISOString(),
      consumerId: { _id: consumer.id, name: consumer.name },
      subOrders: [
        {
          vendorId: vendors[0].id,
          vendorName: vendors[0].name,
          status: 'READY',
          items: dinnerOrder.items,
          vendorTotal: dinnerOrder.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 210).toISOString(),
          estimatedReadyAt: new Date(now - 1000 * 60 * 5).toISOString(),
        },
      ],
    },
    {
      _id: 'order_mock_1004',
      status: 'FULFILLED',
      paymentIntentId: 'pi_mock_1004',
      totalAmount: pastDinnerOrder.vendorTotal,
      platformFee: Math.round(pastDinnerOrder.vendorTotal * 0.1),
      createdAt: new Date(now - 1000 * 60 * 900).toISOString(),
      consumerId: { _id: consumer.id, name: consumer.name },
      subOrders: [
        {
          vendorId: vendors[0].id,
          vendorName: vendors[0].name,
          status: 'DELIVERED',
          items: pastDinnerOrder.items,
          vendorTotal: pastDinnerOrder.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 860).toISOString(),
        },
      ],
    },
  ];

  const issues: MockIssue[] = [
    {
      id: 'issue_1',
      type: 'unresponsive',
      vendorName: vendors[0].name,
      orderId: orders[0]._id,
      message: "Momma's Whole Foods has not accepted breakfast order (25 min)",
      severity: 'critical',
    },
  ];

  const users: MockUser[] = [
    {
      _id: 'user_consumer_1',
      name: consumer.name,
      type: 'consumer',
      status: 'active',
      lastLogin: new Date(now - 1000 * 60 * 10).toISOString(),
    },
    {
      _id: 'user_vendor_1',
      name: vendors[0].name,
      type: 'vendor',
      status: 'active',
      lastLogin: new Date(now - 1000 * 60 * 5).toISOString(),
    },
    {
      _id: 'user_vendor_2',
      name: vendors[1].name,
      type: 'vendor',
      status: 'active',
      lastLogin: new Date(now - 1000 * 60 * 95).toISOString(),
    },
  ];

  return {
    organizations: {
      consumer,
      vendors,
      admin,
    },
    menuItems,
    orders,
    issues,
    users,
  };
};

declare global {
  // eslint-disable-next-line no-var
  var __SAFEPLATE_MOCK_STORE__: MockStore | undefined;
}

export const getMockStore = () => {
  if (!globalThis.__SAFEPLATE_MOCK_STORE__) {
    globalThis.__SAFEPLATE_MOCK_STORE__ = createMockStore();
  }
  return globalThis.__SAFEPLATE_MOCK_STORE__;
};

export const resetMockStore = () => {
  globalThis.__SAFEPLATE_MOCK_STORE__ = createMockStore();
};

export const getMockVendorId = (preferredId?: string) => {
  const store = getMockStore();
  if (preferredId) {
    const match = store.organizations.vendors.find((vendor) => vendor.id === preferredId);
    if (match) return match.id;
  }
  return store.organizations.vendors[0].id;
};

export const getMockMenuItems = (role: MockRole, vendorParam?: string) => {
  const store = getMockStore();
  const isCurrentVendor = vendorParam === 'current' || !vendorParam;
  if (role === 'vendor') {
    const vendorId = getMockVendorId(isCurrentVendor ? undefined : vendorParam || undefined);
    return store.menuItems.filter((item) => item.vendorId === vendorId);
  }

  let items = store.menuItems.filter((item) => item.isAvailable);
  if (vendorParam && vendorParam !== 'current') {
    items = items.filter((item) => item.vendorId === vendorParam);
  }
  return items;
};

export const createMockMenuItem = (vendorId: string, payload: Partial<MockMenuItem>) => {
  const store = getMockStore();
  const vendor = store.organizations.vendors.find((item) => item.id === vendorId);
  if (!vendor) return null;

  const newItem: MockMenuItem = {
    id: `menu_mock_${Date.now()}`,
    vendorId: vendor.id,
    vendorName: vendor.name,
    name: payload.name || 'New Menu Item',
    description: payload.description || '',
    price: payload.price || 0,
    isAvailable: payload.isAvailable ?? true,
    allergenTags: payload.allergenTags || [],
    ingredients: payload.ingredients || [],
    imageUrl: payload.imageUrl,
    category: payload.category,
  };

  store.menuItems.unshift(newItem);
  return newItem;
};

export const updateMockMenuItem = (menuId: string, payload: Partial<MockMenuItem>) => {
  const store = getMockStore();
  const item = store.menuItems.find((entry) => entry.id === menuId);
  if (!item) return null;

  Object.assign(item, payload);
  return item;
};

export const deleteMockMenuItem = (menuId: string) => {
  const store = getMockStore();
  const initialLength = store.menuItems.length;
  store.menuItems = store.menuItems.filter((entry) => entry.id !== menuId);
  return store.menuItems.length !== initialLength;
};

export const getMockOrders = (role: MockRole, options?: { orderId?: string; vendorId?: string }) => {
  const store = getMockStore();
  let orders = [...store.orders];

  if (role === 'consumer') {
    orders = orders.filter((order) => order.consumerId._id === store.organizations.consumer.id);
  }

  if (role === 'vendor') {
    const vendorId = getMockVendorId(options?.vendorId);
    orders = orders.filter((order) =>
      order.subOrders.some((subOrder) => subOrder.vendorId === vendorId)
    );
  }

  if (options?.orderId) {
    orders = orders.filter((order) => order._id === options.orderId);
  }

  return orders;
};

export const createMockOrder = (items: { menuItemId: string; quantity: number }[]) => {
  const store = getMockStore();
  const menuItems = items
    .map((entry) => {
      const menuItem = store.menuItems.find((item) => item.id === entry.menuItemId);
      if (!menuItem) return null;
      return {
        menuItem,
        quantity: entry.quantity,
      };
    })
    .filter(Boolean) as Array<{ menuItem: MockMenuItem; quantity: number }>;

  if (menuItems.length === 0) {
    return null;
  }

  const vendorGroups = new Map<string, MockOrderItem[]>();
  menuItems.forEach(({ menuItem, quantity }) => {
    const group = vendorGroups.get(menuItem.vendorId) || [];
    group.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity,
      price: menuItem.price,
    });
    vendorGroups.set(menuItem.vendorId, group);
  });

  const subOrders: MockSubOrder[] = [];
  let totalAmount = 0;

  vendorGroups.forEach((groupItems, vendorId) => {
    const vendor = store.organizations.vendors.find((entry) => entry.id === vendorId);
    const vendorTotal = sumItems(groupItems);
    totalAmount += vendorTotal;
    subOrders.push({
      vendorId,
      vendorName: vendor?.name || 'Vendor',
      status: 'PENDING',
      items: groupItems,
      vendorTotal,
    });
  });

  const order: MockOrder = {
    _id: `order_mock_${Date.now()}`,
    status: 'PROCESSING',
    paymentIntentId: `pi_mock_${Date.now()}`,
    totalAmount,
    platformFee: Math.round(totalAmount * 0.1),
    createdAt: new Date().toISOString(),
    consumerId: {
      _id: store.organizations.consumer.id,
      name: store.organizations.consumer.name,
    },
    subOrders,
  };

  store.orders.unshift(order);
  return order;
};

const updateOrderStatusFromSubOrders = (order: MockOrder) => {
  if (order.subOrders.every((subOrder) => subOrder.status === 'DELIVERED')) {
    order.status = 'FULFILLED';
    return;
  }

  if (order.subOrders.some((subOrder) => subOrder.status === 'REFUNDED')) {
    order.status = 'REFUNDED';
    return;
  }

  if (order.subOrders.some((subOrder) => subOrder.status === 'CANCELLED')) {
    order.status = 'CANCELLED';
    return;
  }

  if (order.subOrders.every((subOrder) => subOrder.status !== 'PENDING')) {
    order.status = 'CONFIRMED';
    return;
  }

  order.status = 'PROCESSING';
};

export const acceptMockSubOrder = (orderId: string, vendorId: string) => {
  const store = getMockStore();
  const order = store.orders.find((entry) => entry._id === orderId);
  if (!order) return null;

  const subOrder = order.subOrders.find((entry) => entry.vendorId === vendorId);
  if (!subOrder) return null;

  if (subOrder.status !== 'PENDING') {
    return order;
  }

  subOrder.status = 'ACCEPTED';
  subOrder.acceptedAt = new Date().toISOString();

  updateOrderStatusFromSubOrders(order);
  return order;
};

export const updateMockSubOrderStatus = (
  orderId: string,
  vendorId: string,
  status: MockSubOrder['status']
) => {
  const store = getMockStore();
  const order = store.orders.find((entry) => entry._id === orderId);
  if (!order) return null;

  const subOrder = order.subOrders.find((entry) => entry.vendorId === vendorId);
  if (!subOrder) return null;

  subOrder.status = status;
  if (status === 'ACCEPTED' || status === 'PREPARING') {
    subOrder.acceptedAt = subOrder.acceptedAt || new Date().toISOString();
  }
  if (status === 'READY') {
    subOrder.estimatedReadyAt = new Date().toISOString();
  }

  updateOrderStatusFromSubOrders(order);
  return order;
};

export const refundMockSubOrder = (orderId: string, subOrderIndex: number) => {
  const store = getMockStore();
  const order = store.orders.find((entry) => entry._id === orderId);
  if (!order || subOrderIndex < 0 || subOrderIndex >= order.subOrders.length) {
    return null;
  }

  order.subOrders[subOrderIndex].status = 'REFUNDED';
  updateOrderStatusFromSubOrders(order);
  return order;
};

export const getMockOrganization = (role: MockRole, vendorId?: string) => {
  const store = getMockStore();
  if (role === 'vendor') {
    const id = getMockVendorId(vendorId);
    return store.organizations.vendors.find((entry) => entry.id === id) || store.organizations.vendors[0];
  }
  if (role === 'admin') {
    return store.organizations.admin;
  }
  return store.organizations.consumer;
};

export const updateMockOrganization = (
  role: MockRole,
  updates: MockOrganizationUpdates,
  vendorId?: string
) => {
  const organization = getMockOrganization(role, vendorId);
  if (!organization) return null;

  const { safetyProfile, address, ...baseUpdates } = updates;
  Object.assign(organization, baseUpdates);

  if (safetyProfile) {
    organization.safetyProfile = {
      criticalAllergens: organization.safetyProfile?.criticalAllergens || [],
      preferences: organization.safetyProfile?.preferences || [],
      taxExempt: organization.safetyProfile?.taxExempt || false,
      ...safetyProfile,
    };
  }

  if (address) {
    organization.address = {
      street: organization.address?.street || '',
      city: organization.address?.city || '',
      state: organization.address?.state || '',
      zipCode: organization.address?.zipCode || '',
      coordinates: organization.address?.coordinates,
      ...address,
    };
  }

  return organization;
};
